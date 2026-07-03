-- ─────────────────────────────────────────────────────────────────────────────
-- Klassen-Curriculum-Steuerung (Phase 1): Die Lehrkraft steuert, welche
-- Themenblöcke ihrer Klasse aktuell bearbeitbar sind. Granularität = Themenblock
-- (die stabile Kapitel-Ebene; einzelne Konzepte bleiben robust gegen Feinänderungen).
--
-- Modell (MVP, vorhersehbar & rückwärtskompatibel):
--   • Standard = OFFEN. Nur explizit als 'gesperrt' markierte Blöcke werden pausiert.
--   • Keine Zeile für einen Block  → offen. Keine Zeile für die Klasse → alles offen.
--   • Sperren pausiert nur die NEUE Erstbearbeitung; bereits erworbenes Lernkapital,
--     XP und Auszeichnungen bleiben unangetastet, Wiederholungen bleiben möglich.
-- „Start gesperrt + wöchentlich freischalten" + Auto-Vorbelegung folgt in Phase 2.
-- ─────────────────────────────────────────────────────────────────────────────

create table class_curriculum (
  class_id       uuid not null references classes (id) on delete cascade,
  themenblock_id text not null,
  status         text not null default 'freigegeben' check (status in ('freigegeben', 'gesperrt')),
  gesetzt_am     timestamptz not null default now(),
  gesetzt_von    uuid references profiles (id) on delete set null,
  primary key (class_id, themenblock_id)
);

alter table class_curriculum enable row level security;

-- Lehrkraft der Klasse: Vollzugriff; Klassenmitglieder (Schüler): nur lesen.
create policy class_curriculum_teacher on class_curriculum
  for all to authenticated
  using (class_id in (select teacher_class_ids()))
  with check (class_id in (select teacher_class_ids()));

create policy class_curriculum_member_reads on class_curriculum
  for select to authenticated
  using (class_id in (select my_class_ids()));

-- Der pauschale Grant in 20260622090100 greift nur für damals existierende Tabellen.
grant select, insert, update, delete on class_curriculum to authenticated;

-- Ist ein Themenblock für dieses Profil bearbeitbar? Gesperrt, sobald IRGENDEINE
-- Klasse des Schülers den Block ausdrücklich auf 'gesperrt' gesetzt hat (strengste
-- Klasse gewinnt). Sonst offen (auch wenn gar keine Klasse/kein Curriculum existiert).
create or replace function public.themenblock_erlaubt(p_profile uuid, p_block text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1
    from class_curriculum cc
    join class_members cm on cm.class_id = cc.class_id
    where cm.child_profile_id = p_profile
      and cc.themenblock_id = p_block
      and cc.status = 'gesperrt'
  );
$$;
grant execute on function public.themenblock_erlaubt(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tagesplan-Generierung um das Curriculum-Gating erweitern: neue Erstbearbeitung
-- nur aus freigegebenen Themenblöcken vorschlagen (Schritt 1 + 2). Der Fallback
-- (Schritt 3, „alles gemeistert") bleibt ungefiltert, damit der Plan nie leer bleibt.
-- ─────────────────────────────────────────────────────────────────────────────
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
    -- 1) vom Lehrer zugewiesenes, noch nicht gemeistertes, FREIGEGEBENES Konzept bevorzugen
    select k.id into v_konzept
    from konzepte k
    where k.id in (
        select ca.konzept_id from class_assignments ca
        join class_members cm on cm.class_id = ca.class_id
        where cm.child_profile_id = v_profile
      )
      and public.themenblock_erlaubt(v_profile, k.themenblock_id)
      and not exists (
        select 1 from lern_konzept_fortschritt f
        where f.profile_id = v_profile and f.konzept_id = k.id and f.hoechste_abgeschlossene_stufe = 'meistern'
      )
    order by k.modul_nr limit 1;

    -- 2) sonst nächstes offenes, FREIGEGEBENES Konzept
    if v_konzept is null then
      select k.id into v_konzept from konzepte k
      where public.themenblock_erlaubt(v_profile, k.themenblock_id)
        and not exists (
          select 1 from lern_konzept_fortschritt f
          where f.profile_id = v_profile and f.konzept_id = k.id and f.hoechste_abgeschlossene_stufe = 'meistern'
        )
      order by k.modul_nr limit 1;
    end if;

    -- 3) sonst irgendeins (alles Freigegebene gemeistert) – ungefiltert, damit der Plan nie leer ist
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
