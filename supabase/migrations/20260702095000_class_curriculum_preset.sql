-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2: Auto-Vorbelegung beim Anlegen einer Klasse. Neue Klassen starten mit
-- NUR dem Fundament-Themenblock „Geld, Wert & Entscheidungen" freigegeben; alle
-- übrigen Blöcke sind gesperrt und werden von der Lehrkraft nach und nach (z. B.
-- wöchentlich) freigeschaltet. Bestandsklassen bleiben unberührt (keine Zeilen →
-- offen, wie in Phase 1). Der Voraussetzungs-Schutz beim Freischalten passiert im
-- Client; die generische Vorbelegung hier ist bewusst lehrplan-neutral (das
-- Bayern-Mapping folgt separat, sobald es auf die Kapitelstruktur aktualisiert ist).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.create_class(p_name text)
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

  loop
    v_try := v_try + 1;
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    end loop;
    begin
      insert into classes (teacher_profile_id, name, class_code) values (v_teacher, p_name, v_code)
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
grant execute on function public.create_class(text) to authenticated;
