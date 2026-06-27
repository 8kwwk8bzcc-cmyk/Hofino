-- Hofino – Classroom: Wissens-Challenges erweitern.
-- (1) Themenblock-Rallye: Challenge bezieht sich auf einen Themenblock (goal_ref) – jede:r
--     soll alle Konzepte des Blocks meistern. Fortschritt = gemeisterte Konzepte im Block.
-- (2) Kooperatives Klassenziel: Summe der Klassen-XP ≥ Ziel → alle gewinnen (class scope).
-- Datenschutz unverändert: nur Aggregate, keine Einzeldaten.

alter table challenges add column if not exists goal_ref text;

-- class_overview zusätzlich mit gemeisterten Konzepten je Themenblock (jsonb {block: count}).
drop function if exists public.class_overview(uuid);
create function public.class_overview(p_class_id uuid)
returns table (
  child_profile_id uuid,
  display_name text,
  modules_completed bigint,
  knowledge_points bigint,
  avg_quiz numeric,
  depot_value_rounded_cents bigint,
  orders_count bigint,
  sectors_count bigint,
  regions_count bigint,
  etf_count bigint,
  blocks_mastered jsonb
)
language sql stable security definer set search_path = public as $$
  select
    cm.child_profile_id,
    pr.display_name,
    (select count(*) from lern_konzept_fortschritt f
       where f.profile_id = cm.child_profile_id and f.hoechste_abgeschlossene_stufe = 'meistern'),
    coalesce((select xp_gesamt from lern_status s where s.profile_id = cm.child_profile_id), 0),
    (select round(avg(case when a.korrekt then 100 else 0 end), 1) from lern_antworten a
       where a.profile_id = cm.child_profile_id),
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
      where po.owner_profile_id = cm.child_profile_id),
    coalesce((select count(*) from orders o
       join portfolios po on po.id = o.portfolio_id
      where po.owner_profile_id = cm.child_profile_id), 0),
    coalesce((select count(distinct i.sector) from holdings h
       join portfolios po on po.id = h.portfolio_id
       join instruments i on i.id = h.instrument_id
      where po.owner_profile_id = cm.child_profile_id and h.quantity > 0), 0),
    coalesce((select count(distinct i.country) from holdings h
       join portfolios po on po.id = h.portfolio_id
       join instruments i on i.id = h.instrument_id
      where po.owner_profile_id = cm.child_profile_id and h.quantity > 0), 0),
    coalesce((select count(*) from holdings h
       join portfolios po on po.id = h.portfolio_id
       join instruments i on i.id = h.instrument_id
      where po.owner_profile_id = cm.child_profile_id and h.quantity > 0 and i.type = 'etf'), 0),
    coalesce((
      select jsonb_object_agg(t.tb, t.cnt) from (
        select k.themenblock_id as tb, count(*) as cnt
        from lern_konzept_fortschritt f
        join konzepte k on k.id = f.konzept_id
        where f.profile_id = cm.child_profile_id and f.hoechste_abgeschlossene_stufe = 'meistern'
        group by k.themenblock_id
      ) t
    ), '{}'::jsonb)
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

-- Klassen-XP-Summe für die eigene Klasse (Schüler-Sicht auf das kooperative Ziel).
-- Liefert nur die Summe + Mitgliederzahl (Aggregat, keine Einzeldaten).
create or replace function public.lern_klassen_xp()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_class uuid;
  v_sum bigint;
  v_members int;
begin
  select cm.class_id into v_class
  from class_members cm
  join profiles p on p.id = cm.child_profile_id
  where p.auth_user_id = auth.uid()
  limit 1;
  if v_class is null then return jsonb_build_object('ok', false); end if;
  select coalesce(sum(ls.xp_gesamt), 0), count(*) into v_sum, v_members
  from class_members cm
  left join lern_status ls on ls.profile_id = cm.child_profile_id
  where cm.class_id = v_class;
  return jsonb_build_object('ok', true, 'sum', v_sum, 'members', v_members);
end $$;
grant execute on function public.lern_klassen_xp() to authenticated;
