-- ─────────────────────────────────────────────────────────────────────────────
-- Paket E (AUTH.md): Einwilligung auf dem Schulweg.
-- 1) Die Lehrkraft bestätigt beim Anlegen der Klasse, dass die Eltern-
--    Einwilligungen vorliegen → Zeitstempel an der Klasse (Nachweis).
--    create_class verlangt die Bestätigung jetzt verpflichtend.
-- 2) Schüler-Konten entstehen NUR über die Klassen-Registrierung
--    (Edge Function `register-student` mit Klassencode, service_role) —
--    Client-Inserts mit role='student' werden abgelehnt, sonst wäre das
--    ein Schlupfloch am Eltern-Einwilligungsflow vorbei.
-- ─────────────────────────────────────────────────────────────────────────────
alter table classes add column consent_confirmed_at timestamptz;

drop function if exists public.create_class(text);

create or replace function public.create_class(p_name text, p_consent boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := public.caller_profile_id();
  v_role user_role;
  v_code text;
  v_id uuid;
  v_try int := 0;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- ohne O/0/I/1
begin
  if v_teacher is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  select role into v_role from profiles where id = v_teacher;
  if v_role <> 'teacher' then return jsonb_build_object('ok', false, 'reason', 'not_teacher'); end if;
  if coalesce(trim(p_name), '') = '' then return jsonb_build_object('ok', false, 'reason', 'no_name'); end if;
  if not coalesce(p_consent, false) then return jsonb_build_object('ok', false, 'reason', 'consent_required'); end if;

  loop
    v_try := v_try + 1;
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    end loop;
    begin
      insert into classes (teacher_profile_id, name, class_code, consent_confirmed_at)
        values (v_teacher, p_name, v_code, now())
        returning id into v_id;
      exit;
    exception when unique_violation then
      if v_try > 10 then return jsonb_build_object('ok', false, 'reason', 'code_gen_failed'); end if;
    end;
  end loop;

  -- Auto-Vorbelegung: Fundament offen, alle übrigen Themenblöcke gesperrt.
  insert into class_curriculum (class_id, themenblock_id, status, gesetzt_von)
    select v_id,
           b.tb,
           case when b.tb = 'tb_geld_wert_entscheidungen' then 'freigegeben' else 'gesperrt' end,
           v_teacher
    from (select distinct themenblock_id as tb from konzepte) b;

  return jsonb_build_object('ok', true, 'class_id', v_id, 'class_code', v_code);
end $$;

grant execute on function public.create_class(text, boolean) to authenticated;
revoke execute on function public.create_class(text, boolean) from public, anon;

-- Bestehende Klassen: rückwirkend als bestätigt markieren (Testdaten).
update classes set consent_confirmed_at = created_at where consent_confirmed_at is null;

-- Schüler-Registrierung nur über den Schulweg (service_role).
create or replace function public.enforce_child_consent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if new.role = 'child' then
      new.consent_status := 'pending';
      new.consent_source := 'parent';
      new.consent_deadline := now() + interval '7 days';
      new.consent_confirmed_at := null;
    elsif new.role = 'student' then
      raise exception 'Schüler-Konten entstehen über die Registrierung mit Klassencode.';
    end if;
  end if;
  return new;
end $$;
