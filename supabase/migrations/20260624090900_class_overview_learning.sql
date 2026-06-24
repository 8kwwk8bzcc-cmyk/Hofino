-- Hofino – Classroom: Lehrer-Aggregate auf den neuen Lern-Kern (lern_*) umstellen.
-- Vorher las class_overview die alten Tabellen learning_progress/knowledge_points, die der
-- neue Lern-Tab (LearnPlus, packages/learning) nicht mehr befüllt → Zahlen stimmten nicht.
-- Jetzt:
--   modules_completed = abgeschlossene Konzepte (hoechste_abgeschlossene_stufe = 'meistern',
--                       identische Definition wie im Schüler-Lerntab)
--   knowledge_points  = lern_status.xp_gesamt (lebenslange Wissenspunkte)
--   avg_quiz          = Anteil korrekter Antworten in % (aus lern_antworten)
-- Weiterhin NUR grobe Aggregate, keine Einzelorders (Kinderschutz, CLAUDE.md §3).

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
    (select count(*) from lern_konzept_fortschritt f
       where f.profile_id = cm.child_profile_id and f.hoechste_abgeschlossene_stufe = 'meistern'),
    coalesce((select xp_gesamt from lern_status s where s.profile_id = cm.child_profile_id), 0),
    (select round(avg(case when a.korrekt then 100 else 0 end), 1) from lern_antworten a
       where a.profile_id = cm.child_profile_id),
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
