-- Hofino – RLS, Hilfsfunktionen, Auto-Setup und Lehrer-Aggregate (M2).
-- Kinderschutz wird in der DB erzwungen, nicht nur in der App (CLAUDE.md §3).

-- ─────────────────────────────────────────────────────────────────────────────
-- Hilfsfunktionen (SECURITY DEFINER → umgehen RLS, verhindern Rekursion)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.current_profile_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.approved_child_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select pcl.child_profile_id
  from public.parent_child_links pcl
  join public.profiles p on p.id = pcl.parent_profile_id
  where p.auth_user_id = auth.uid() and pcl.status = 'approved'
$$;

create or replace function public.teacher_class_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select c.id
  from public.classes c
  join public.profiles p on p.id = c.teacher_profile_id
  where p.auth_user_id = auth.uid()
$$;

create or replace function public.my_class_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select cm.class_id
  from public.class_members cm
  where cm.child_profile_id in (select public.current_profile_ids())
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-Setup: bei neuem Profil Depot (+ Haus für Kinder) anlegen
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role in ('child', 'student', 'adult') then
    insert into public.portfolios (owner_profile_id) values (new.id) on conflict do nothing;
  end if;
  if new.role in ('child', 'student') then
    insert into public.house_state (profile_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;

create trigger on_profile_created
  after insert on profiles
  for each row execute function public.handle_new_profile();

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabellen-Rechte: authenticated bekommt DML; die Zeilen-Sichtbarkeit regelt RLS.
-- Ohne passende Policy ist eine Aktion trotz Grant verboten (z. B. INSERT auf
-- capital_grants/knowledge_points → nur service_role serverseitig).
-- ─────────────────────────────────────────────────────────────────────────────
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS aktivieren
-- ─────────────────────────────────────────────────────────────────────────────
alter table profiles               enable row level security;
alter table parent_child_links     enable row level security;
alter table classes                enable row level security;
alter table class_members          enable row level security;
alter table instruments            enable row level security;
alter table price_snapshots        enable row level security;
alter table portfolios             enable row level security;
alter table holdings               enable row level security;
alter table orders                 enable row level security;
alter table watchlist              enable row level security;
alter table learning_progress      enable row level security;
alter table capital_grants         enable row level security;
alter table knowledge_points       enable row level security;
alter table house_state            enable row level security;
alter table challenges             enable row level security;
alter table challenge_participation enable row level security;
alter table rankings               enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
create policy profiles_own on profiles
  for all to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy profiles_parent_reads_child on profiles
  for select to authenticated
  using (id in (select approved_child_ids()));

-- ─────────────────────────────────────────────────────────────────────────────
-- parent_child_links: jeweils beteiligtes Profil darf sehen; Eltern dürfen anlegen
-- ─────────────────────────────────────────────────────────────────────────────
create policy pcl_involved_reads on parent_child_links
  for select to authenticated
  using (
    parent_profile_id in (select current_profile_ids())
    or child_profile_id in (select current_profile_ids())
  );

create policy pcl_parent_writes on parent_child_links
  for all to authenticated
  using (parent_profile_id in (select current_profile_ids()))
  with check (parent_profile_id in (select current_profile_ids()));

-- ─────────────────────────────────────────────────────────────────────────────
-- classes / class_members
-- ─────────────────────────────────────────────────────────────────────────────
create policy classes_teacher_owns on classes
  for all to authenticated
  using (teacher_profile_id in (select current_profile_ids()))
  with check (teacher_profile_id in (select current_profile_ids()));

create policy classes_member_reads on classes
  for select to authenticated
  using (id in (select my_class_ids()));

create policy class_members_teacher on class_members
  for all to authenticated
  using (class_id in (select teacher_class_ids()))
  with check (class_id in (select teacher_class_ids()));

create policy class_members_self_reads on class_members
  for select to authenticated
  using (child_profile_id in (select current_profile_ids()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Referenzdaten: für alle Angemeldeten lesbar
-- ─────────────────────────────────────────────────────────────────────────────
create policy instruments_read on instruments
  for select to authenticated using (true);

create policy price_snapshots_read on price_snapshots
  for select to authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Depot: Eigentümer voll; Eltern lesen verknüpfte Kind-Depots
-- ─────────────────────────────────────────────────────────────────────────────
create policy portfolios_own on portfolios
  for all to authenticated
  using (owner_profile_id in (select current_profile_ids()))
  with check (owner_profile_id in (select current_profile_ids()));

create policy portfolios_parent_reads on portfolios
  for select to authenticated
  using (owner_profile_id in (select approved_child_ids()));

create policy holdings_own on holdings
  for all to authenticated
  using (portfolio_id in (select id from portfolios where owner_profile_id in (select current_profile_ids())))
  with check (portfolio_id in (select id from portfolios where owner_profile_id in (select current_profile_ids())));

create policy holdings_parent_reads on holdings
  for select to authenticated
  using (portfolio_id in (select id from portfolios where owner_profile_id in (select approved_child_ids())));

-- orders: NUR Eigentümer (keine Lese-Policy für Eltern/Lehrer – DATA_MODEL.md §4)
create policy orders_own on orders
  for all to authenticated
  using (portfolio_id in (select id from portfolios where owner_profile_id in (select current_profile_ids())))
  with check (portfolio_id in (select id from portfolios where owner_profile_id in (select current_profile_ids())));

create policy watchlist_own on watchlist
  for all to authenticated
  using (profile_id in (select current_profile_ids()))
  with check (profile_id in (select current_profile_ids()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Lernen: Eigentümer voll; Eltern lesen Kind
-- ─────────────────────────────────────────────────────────────────────────────
create policy learning_own on learning_progress
  for all to authenticated
  using (profile_id in (select current_profile_ids()))
  with check (profile_id in (select current_profile_ids()));

create policy learning_parent_reads on learning_progress
  for select to authenticated
  using (profile_id in (select approved_child_ids()));

-- capital_grants / knowledge_points: Eigentümer/Eltern NUR lesen.
-- Vergabe ausschließlich serverseitig (service_role umgeht RLS) → kein Self-Granting.
create policy capital_grants_read_own on capital_grants
  for select to authenticated
  using (profile_id in (select current_profile_ids()) or profile_id in (select approved_child_ids()));

create policy knowledge_points_read_own on knowledge_points
  for select to authenticated
  using (profile_id in (select current_profile_ids()) or profile_id in (select approved_child_ids()));

create policy house_own on house_state
  for all to authenticated
  using (profile_id in (select current_profile_ids()))
  with check (profile_id in (select current_profile_ids()));

create policy house_parent_reads on house_state
  for select to authenticated
  using (profile_id in (select approved_child_ids()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Challenges / Rankings
-- ─────────────────────────────────────────────────────────────────────────────
create policy challenges_read on challenges
  for select to authenticated
  using (class_id is null or class_id in (select my_class_ids()) or class_id in (select teacher_class_ids()));

create policy challenges_teacher_writes on challenges
  for all to authenticated
  using (class_id in (select teacher_class_ids()))
  with check (class_id in (select teacher_class_ids()));

create policy participation_own on challenge_participation
  for all to authenticated
  using (profile_id in (select current_profile_ids()))
  with check (profile_id in (select current_profile_ids()));

-- Ranglisten sind öffentlich (für Angemeldete) lesbar; Anzeige nur über display_name.
create policy rankings_read on rankings
  for select to authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Lehrer-Aggregate: SECURITY DEFINER. Nur der Lehrer der Klasse erhält Zeilen.
-- Liefert NIE Einzelorders – nur grobe Kennzahlen.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.class_overview(p_class_id uuid)
returns table (
  child_profile_id uuid,
  display_name text,
  modules_completed bigint,
  knowledge_points bigint,
  avg_quiz numeric,
  depot_value_rounded_cents bigint
)
language sql stable security definer set search_path = public as $$
  select
    cm.child_profile_id,
    pr.display_name,
    (select count(*) from learning_progress lp
       where lp.profile_id = cm.child_profile_id and lp.completed_at is not null),
    coalesce((select sum(points) from knowledge_points kp where kp.profile_id = cm.child_profile_id), 0),
    (select round(avg(quiz_score), 1) from learning_progress lp
       where lp.profile_id = cm.child_profile_id and lp.quiz_score is not null),
    -- grobe Depotkennzahl: auf 1.000 € gerundet
    (select round((po.cash_cents + coalesce(hv.val, 0)) / 100000.0) * 100000
       from portfolios po
       left join (
         select h.portfolio_id, sum(h.quantity * latest.price_cents) as val
         from holdings h
         join lateral (
           select price_cents from price_snapshots ps
           where ps.instrument_id = h.instrument_id
           order by as_of desc limit 1
         ) latest on true
         group by h.portfolio_id
       ) hv on hv.portfolio_id = po.id
      where po.owner_profile_id = cm.child_profile_id)
  from class_members cm
  join profiles pr on pr.id = cm.child_profile_id
  where cm.class_id = p_class_id
    and exists (
      select 1 from classes c
      join profiles tp on tp.id = c.teacher_profile_id
      where c.id = p_class_id and tp.auth_user_id = auth.uid()
    );
$$;

grant execute on function public.class_overview(uuid) to authenticated;
