-- Hofino – Lernen ↔ Werte verbinden (mission-board-no-house-v1, Phase 5).
-- Verknüpft Lern-Konzepte mit passenden Markt-Labor-Werten. Der Tagesplan wählt das
-- Markt-Labor-Asset: gehaltene Position bevorzugt, sonst ein zum Konzept verknüpfter Wert,
-- sonst ein Standard-Lernbeispiel.

create table learning_module_asset_links (
  id                 uuid primary key default gen_random_uuid(),
  learning_module_id text not null references konzepte (id) on delete cascade,
  asset_id           uuid not null references instruments (id) on delete cascade,
  prompt_de          text,
  prompt_en          text,
  unique (learning_module_id, asset_id)
);

grant select on learning_module_asset_links to authenticated;

-- Tagesplan-Generierung um verknüpftes Asset erweitern (ersetzt Version aus 20260625090000).
create or replace function public.tagesplan_heute()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_plan    daily_plans;
  v_konzept text;
  v_instr   uuid;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;

  select * into v_plan from daily_plans where profile_id = v_profile and plan_date = current_date;

  if not found then
    select k.id into v_konzept
    from konzepte k
    where k.id in (
        select ca.konzept_id from class_assignments ca
        join class_members cm on cm.class_id = ca.class_id
        where cm.child_profile_id = v_profile
      )
      and not exists (
        select 1 from lern_konzept_fortschritt f
        where f.profile_id = v_profile and f.konzept_id = k.id and f.hoechste_abgeschlossene_stufe = 'meistern'
      )
    order by k.modul_nr limit 1;

    if v_konzept is null then
      select k.id into v_konzept from konzepte k
      where not exists (
        select 1 from lern_konzept_fortschritt f
        where f.profile_id = v_profile and f.konzept_id = k.id and f.hoechste_abgeschlossene_stufe = 'meistern'
      )
      order by k.modul_nr limit 1;
    end if;

    if v_konzept is null then select id into v_konzept from konzepte order by modul_nr limit 1; end if;

    -- Instrument: gehaltene Position → zum Konzept verknüpfter Wert → Standard-Lernbeispiel
    select h.instrument_id into v_instr
    from holdings h join portfolios p on p.id = h.portfolio_id
    where p.owner_profile_id = v_profile and h.quantity > 0
    order by h.instrument_id limit 1;
    if v_instr is null then
      select asset_id into v_instr from learning_module_asset_links
        where learning_module_id = v_konzept order by id limit 1;
    end if;
    if v_instr is null then
      select id into v_instr from instruments where type = 'stock' order by ticker limit 1;
    end if;

    insert into daily_plans (profile_id, konzept_id, instrument_id)
      values (v_profile, v_konzept, v_instr)
      returning * into v_plan;
  end if;

  return jsonb_build_object(
    'ok', true,
    'plan_date', v_plan.plan_date,
    'konzept_id', v_plan.konzept_id,
    'konzept_titel', (select titel->>'de' from konzepte where id = v_plan.konzept_id),
    'instrument_id', v_plan.instrument_id,
    'instrument_name', (select name from instruments where id = v_plan.instrument_id),
    'instrument_ticker', (select ticker from instruments where id = v_plan.instrument_id),
    'learning_done', exists (select 1 from lern_antworten a where a.profile_id = v_profile and a.beantwortet_am = current_date),
    'market_viewed', v_plan.market_viewed_at is not null,
    'decision_done', v_plan.decision_completed_at is not null,
    'woche', (
      select jsonb_agg(jsonb_build_object(
        'date', d::date,
        'status', case
          when d::date > current_date then 'future'
          when (
            exists (select 1 from daily_plans dp where dp.profile_id = v_profile and dp.plan_date = d::date
                    and dp.decision_completed_at is not null and dp.market_viewed_at is not null)
            and exists (select 1 from lern_antworten a where a.profile_id = v_profile and a.beantwortet_am = d::date)
          ) then 'completed'
          when d::date = current_date then 'today_open'
          else 'missed' end
      ) order by d)
      from generate_series(date_trunc('week', current_date), date_trunc('week', current_date) + interval '6 day', interval '1 day') d
    )
  );
end $$;
grant execute on function public.tagesplan_heute() to authenticated;
