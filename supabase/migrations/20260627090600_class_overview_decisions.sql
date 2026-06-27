-- Hofino – Classroom: class_overview um die Anzahl begründeter Tagesentscheidungen erweitern
-- (Begründungs-Challenge). Jede Zeile in trade_decisions trägt per Constraint einen reason_type,
-- ist also begründet. Weiterhin nur eine Aggregat-Zahl je Schüler (Datenschutz: keine Inhalte).

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
  blocks_mastered jsonb,
  decisions_count bigint
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
    ), '{}'::jsonb),
    coalesce((select count(*) from trade_decisions td where td.profile_id = cm.child_profile_id), 0)
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
