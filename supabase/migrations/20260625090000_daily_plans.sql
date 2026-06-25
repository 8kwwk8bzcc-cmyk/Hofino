-- Hofino – Daily Finance Workout (mission-board-no-house-v1, Phase 2).
-- Tagesplan pro Nutzer (Lernmission → Markt-Labor → Übungsentscheidung) + Entscheidungs-Datensatz.
-- Schreiben nur über SECURITY-DEFINER-RPCs; RLS erlaubt Lesen nur der eigenen Zeilen.

create table daily_plans (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null references profiles (id) on delete cascade,
  plan_date             date not null default current_date,
  konzept_id            text references konzepte (id) on delete set null,
  instrument_id         uuid references instruments (id) on delete set null,
  learning_completed_at timestamptz,
  market_viewed_at      timestamptz,
  decision_completed_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (profile_id, plan_date)
);

-- Virtuelle Übungsentscheidung (inkl. Halten). Phase 2 schreibt nur Halten; buy/sell folgt Phase 3.
create table trade_decisions (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references profiles (id) on delete cascade,
  instrument_id       uuid references instruments (id) on delete set null,
  daily_plan_id       uuid references daily_plans (id) on delete set null,
  action              text not null check (action in ('buy', 'sell', 'hold')),
  quantity            integer not null default 0,
  virtual_price_cents integer,
  fee_cents           integer not null default 0,
  reason_type         text not null check (reason_type in ('long_term_growth', 'reduce_risk', 'not_enough_information', 'diversify', 'own_reason')),
  reason_text         text,
  created_at          timestamptz not null default now(),
  check ((action = 'hold' and quantity = 0 and fee_cents = 0) or (action in ('buy', 'sell') and quantity > 0))
);

alter table daily_plans     enable row level security;
alter table trade_decisions enable row level security;

create policy daily_plans_owner on daily_plans
  for select to authenticated
  using (profile_id in (select current_profile_ids()));

create policy trade_decisions_owner on trade_decisions
  for select to authenticated
  using (profile_id in (select current_profile_ids()));

-- Der pauschale Grant in 20260622090100 greift nur für damals existierende Tabellen.
grant select on daily_plans, trade_decisions to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs
-- ─────────────────────────────────────────────────────────────────────────────

-- Tagesplan holen/erzeugen + Wochenstatus. Generierung lt. Spec daily_plan_generation.
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
    -- 1) vom Lehrer zugewiesenes, noch nicht gemeistertes Konzept bevorzugen
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

    -- 2) sonst nächstes offenes Konzept
    if v_konzept is null then
      select k.id into v_konzept from konzepte k
      where not exists (
        select 1 from lern_konzept_fortschritt f
        where f.profile_id = v_profile and f.konzept_id = k.id and f.hoechste_abgeschlossene_stufe = 'meistern'
      )
      order by k.modul_nr limit 1;
    end if;

    -- 3) sonst irgendeins (alles gemeistert)
    if v_konzept is null then select id into v_konzept from konzepte order by modul_nr limit 1; end if;

    -- Instrument: gehaltene Position bevorzugen, sonst ein Lernbeispiel
    select h.instrument_id into v_instr
    from holdings h join portfolios p on p.id = h.portfolio_id
    where p.owner_profile_id = v_profile and h.quantity > 0
    order by h.instrument_id limit 1;
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

-- Markt-Labor als angesehen markieren.
create or replace function public.tagesplan_markt_gesehen()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_profile uuid := public.caller_profile_id();
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  update daily_plans set market_viewed_at = coalesce(market_viewed_at, now()), updated_at = now()
    where profile_id = v_profile and plan_date = current_date;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.tagesplan_markt_gesehen() to authenticated;

-- Übungsentscheidung "Halten" speichern (begründet) und Tag abschließen.
-- Halten ist gebührenfrei und eine vollständige Tagesentscheidung (Spec §core_principles).
create or replace function public.tagesentscheidung_halten(p_reason text, p_reason_text text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_plan    daily_plans;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  if p_reason not in ('long_term_growth', 'reduce_risk', 'not_enough_information', 'diversify', 'own_reason') then
    return jsonb_build_object('ok', false, 'reason', 'bad_reason');
  end if;

  select * into v_plan from daily_plans where profile_id = v_profile and plan_date = current_date;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if v_plan.market_viewed_at is null then return jsonb_build_object('ok', false, 'reason', 'market_not_viewed'); end if;

  insert into trade_decisions (profile_id, instrument_id, daily_plan_id, action, quantity, fee_cents, reason_type, reason_text)
    values (v_profile, v_plan.instrument_id, v_plan.id, 'hold', 0, 0, p_reason, p_reason_text);

  update daily_plans set decision_completed_at = coalesce(decision_completed_at, now()), updated_at = now()
    where id = v_plan.id;

  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.tagesentscheidung_halten(text, text) to authenticated;
