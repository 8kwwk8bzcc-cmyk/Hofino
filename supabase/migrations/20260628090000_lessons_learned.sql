-- Hofino – Classroom: „Lessons Learned" (Reflexion am Saisonende).
-- Schüler schreibt eine kurze Freitext-Reflexion; die eigene Lehrkraft kann sie lesen
-- (Review). Datenschutz/Kinderschutz: Text NUR für den/die Schreibende:n und die Lehrkraft
-- der eigenen Klasse sichtbar – keine Peer-Sichtbarkeit. Schreiben nur über RPC (security
-- definer); Lehrer-Lesen über security-definer-RPC mit Eigentumsprüfung.

create table lessons_learned (
  profile_id  uuid primary key references profiles (id) on delete cascade,
  class_id    uuid references classes (id) on delete set null,
  text        text not null,
  updated_at  timestamptz not null default now()
);

alter table lessons_learned enable row level security;
-- Eigentümer darf die eigene Reflexion lesen (Schreiben läuft über die RPC).
create policy lessons_own_read on lessons_learned
  for select to authenticated
  using (profile_id in (select current_profile_ids()));

-- Migrationen nach 20260622090100 bekommen keine pauschalen Grants → explizit setzen.
grant select on lessons_learned to authenticated;
grant all on lessons_learned to service_role;

-- Schüler: eigene Reflexion speichern (Upsert). Klasse wird serverseitig ermittelt.
create or replace function public.lektion_speichern(p_text text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_class uuid;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  if length(coalesce(trim(p_text), '')) < 5 then return jsonb_build_object('ok', false, 'reason', 'too_short'); end if;
  select class_id into v_class from class_members where child_profile_id = v_profile limit 1;
  insert into lessons_learned (profile_id, class_id, text, updated_at)
    values (v_profile, v_class, trim(p_text), now())
    on conflict (profile_id) do update set text = excluded.text, class_id = excluded.class_id, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.lektion_speichern(text) to authenticated;

-- Lehrer: Reflexionen der eigenen Klasse lesen (Review). Nur für die Lehrkraft der Klasse.
create or replace function public.class_lektionen(p_class_id uuid)
returns table (display_name text, text text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select pr.display_name, l.text, l.updated_at
  from lessons_learned l
  join profiles pr on pr.id = l.profile_id
  where l.class_id = p_class_id
    and exists (
      select 1 from classes c
      join profiles tp on tp.id = c.teacher_profile_id
      where c.id = p_class_id and tp.auth_user_id = auth.uid()
    )
  order by l.updated_at desc;
$$;
grant execute on function public.class_lektionen(uuid) to authenticated;
