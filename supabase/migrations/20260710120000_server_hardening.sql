-- ─────────────────────────────────────────────────────────────────────────────
-- Server-Härtung (Code-Review 2026-07-10, Paket 1):
--  1) place_order: Row-Locking gegen Race Conditions (Geld-Duplikation bei
--     parallelen Verkäufen, negatives Cash bei parallelen Käufen, doppelter
--     Gebührenerlass), Verkaufs-Guard (Gebühr > Erlös), Erlass nur bei p_qty = 1.
--  2) Check-Constraints: cash_cents >= 0, holdings.quantity > 0.
--  3) lern_antwort_speichern: XP-Obergrenze serverseitig aus fragen/vorlagen
--     (Client kann keine Fantasie-XP mehr senden), Plausibilitäts-Clamps.
--  4) lern_konzept_abschliessen: Lernkapital nur mit Lernnachweis (korrekte
--     Antworten über alle 5 Stufen in lern_antworten).
--  5) lern_stufe_abgeschlossen: Execute-Recht entzogen (von der App ungenutzt;
--     erlaubte bisher das Faken von „meistern" → Block-/Meilenstein-Boni).
--  6) REVOKE für interne SECURITY-DEFINER-Helfer (Depotwert-Leak, grant_capital…).
--  7) profiles.role: Änderung nach Anlage nur noch für service_role (Trigger).
--  8) join_class: nur child/student dürfen Klassen beitreten.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) place_order mit Row-Locking ───────────────────────────────────────────
create or replace function public.place_order(
  p_instrument uuid,
  p_side order_side,
  p_qty int,
  p_waive_fee boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_pf portfolios;
  v_price bigint;
  v_fee bigint := 500;
  v_gross bigint;
  v_hold holdings;
  v_order_count int;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  if p_qty <= 0 then return jsonb_build_object('ok', false, 'reason', 'invalid_quantity'); end if;

  -- Depotzeile SPERREN: serialisiert alle parallelen Orders desselben Nutzers.
  -- Verhindert Doppel-Verkauf (Erlös 2x), parallele Käufe über Deckung und
  -- doppelten Erst-Order-Gebührenerlass.
  select * into v_pf from portfolios where owner_profile_id = v_profile for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_portfolio'); end if;

  -- Gebührenerlass nur bei der allerersten Order UND genau 1 Stück (§6 Übungskauf).
  if p_waive_fee and p_qty = 1 then
    select count(*) into v_order_count from orders where portfolio_id = v_pf.id;
    if v_order_count = 0 then v_fee := 0; end if;
  end if;

  select price_cents into v_price from price_snapshots
    where instrument_id = p_instrument order by as_of desc limit 1;
  if v_price is null then return jsonb_build_object('ok', false, 'reason', 'no_price'); end if;

  v_gross := v_price * p_qty;
  select * into v_hold from holdings
    where portfolio_id = v_pf.id and instrument_id = p_instrument for update;

  if p_side = 'buy' then
    if v_pf.cash_cents < v_gross + v_fee then
      return jsonb_build_object('ok', false, 'reason', 'insufficient_funds');
    end if;
    update portfolios set cash_cents = cash_cents - (v_gross + v_fee) where id = v_pf.id;
    if v_hold.portfolio_id is not null then
      -- Arithmetisch gegen den gesperrten Zeilenwert (kein Lost Update möglich).
      update holdings set
        avg_cost_cents = round(
          (holdings.avg_cost_cents * holdings.quantity + v_price * p_qty)::numeric
          / (holdings.quantity + p_qty)
        ),
        quantity = holdings.quantity + p_qty
      where portfolio_id = v_pf.id and instrument_id = p_instrument;
    else
      insert into holdings (portfolio_id, instrument_id, quantity, avg_cost_cents)
        values (v_pf.id, p_instrument, p_qty, v_price);
    end if;
  else
    if v_hold.portfolio_id is null or v_hold.quantity < p_qty then
      return jsonb_build_object('ok', false, 'reason', 'insufficient_holdings');
    end if;
    -- Parität zu packages/core: Gebühr > Erlös darf das Konto nicht ins Minus ziehen.
    if v_pf.cash_cents + (v_gross - v_fee) < 0 then
      return jsonb_build_object('ok', false, 'reason', 'insufficient_funds');
    end if;
    update portfolios set cash_cents = cash_cents + (v_gross - v_fee) where id = v_pf.id;
    if v_hold.quantity = p_qty then
      delete from holdings where portfolio_id = v_pf.id and instrument_id = p_instrument;
    else
      update holdings set quantity = holdings.quantity - p_qty
        where portfolio_id = v_pf.id and instrument_id = p_instrument;
    end if;
  end if;

  insert into orders (portfolio_id, instrument_id, side, quantity, price_cents, fee_cents)
    values (v_pf.id, p_instrument, p_side, p_qty, v_price, v_fee);

  return jsonb_build_object('ok', true, 'price_cents', v_price);
end $$;

grant execute on function public.place_order(uuid, order_side, int, boolean) to authenticated;

-- ── 2) Bilanz-Invarianten als Constraints (Verteidigung in der Tiefe) ────────
-- NOT VALID: bestehende Zeilen werden nicht rückwirkend geprüft (falls Altdaten
-- existieren), alle NEUEN Schreibzugriffe werden erzwungen.
alter table portfolios drop constraint if exists portfolios_cash_nonnegative;
alter table portfolios add constraint portfolios_cash_nonnegative
  check (cash_cents >= 0) not valid;

alter table holdings drop constraint if exists holdings_quantity_positive;
alter table holdings add constraint holdings_quantity_positive
  check (quantity > 0) not valid;

-- ── 3) lern_antwort_speichern: XP serverseitig deckeln ───────────────────────
-- Der Client berechnet weiterhin Leitner/Fälligkeit (getesteter Engine-Code),
-- aber die XP-Höhe wird gegen den Fragenkatalog gedeckelt: maximal die
-- wissenspunkte der referenzierten Frage/Vorlage, absolut nie mehr als 200.
-- Damit ist der „p_basis_xp = 999999999"-Angriff auf die Wissensliga wirkungslos.
create or replace function public.lern_antwort_speichern(
  p_konzept text, p_stufe text, p_frage_id text, p_vorlage_id text,
  p_korrekt boolean, p_ist_wiederholung boolean, p_basis_xp int,
  p_box int, p_richtig_in_folge int, p_gemeistert boolean, p_faellig date
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_granted int := 0;
  v_max int;
  v_box int;
  v_folge int;
  v_faellig date;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;

  -- XP-Obergrenze aus dem Katalog (Frage vor Vorlage), Fallback 150, hartes Maximum 200.
  select wissenspunkte into v_max from fragen where id = nullif(p_frage_id, '');
  if v_max is null then
    select wissenspunkte into v_max from vorlagen where id = nullif(p_vorlage_id, '');
  end if;
  v_max := least(coalesce(v_max, 150), 200);

  -- Plausibilitäts-Clamps für clientgelieferte Zustandswerte.
  v_box    := least(greatest(coalesce(p_box, 1), 1), 5);
  v_folge  := least(greatest(coalesce(p_richtig_in_folge, 0), 0), 1000);
  v_faellig := least(greatest(coalesce(p_faellig, current_date), current_date),
                     current_date + 365);

  insert into lern_tageszaehler (profile_id, datum) values (v_profile, current_date)
    on conflict (profile_id, datum) do nothing;

  if p_korrekt then v_granted := least(greatest(coalesce(p_basis_xp, 0), 0), v_max); end if;

  insert into lern_antworten (profile_id, konzept_id, frage_id, vorlage_id, stufe, korrekt, ist_wiederholung, xp)
    values (v_profile, p_konzept, nullif(p_frage_id, ''), nullif(p_vorlage_id, ''), p_stufe, p_korrekt, p_ist_wiederholung, v_granted);

  update lern_tageszaehler set
    neue_genutzt = neue_genutzt + (case when p_ist_wiederholung then 0 else 1 end),
    wiederholungen_genutzt = wiederholungen_genutzt + (case when p_ist_wiederholung then 1 else 0 end),
    wiederhol_xp = wiederhol_xp + (case when p_ist_wiederholung then v_granted else 0 end)
  where profile_id = v_profile and datum = current_date;

  insert into lern_status (profile_id, xp_gesamt, xp_saison)
    values (v_profile, v_granted, v_granted)
    on conflict (profile_id) do update set
      xp_gesamt = lern_status.xp_gesamt + v_granted,
      xp_saison = lern_status.xp_saison + v_granted;

  insert into lern_sr_zustand (profile_id, konzept_id, leitner_box, richtig_in_folge, gemeistert, naechste_faelligkeit, letzte_antwort_korrekt)
    values (v_profile, p_konzept, v_box, v_folge, p_gemeistert, v_faellig, p_korrekt)
    on conflict (profile_id, konzept_id) do update set
      leitner_box = excluded.leitner_box,
      richtig_in_folge = excluded.richtig_in_folge,
      gemeistert = lern_sr_zustand.gemeistert or excluded.gemeistert,
      naechste_faelligkeit = excluded.naechste_faelligkeit,
      letzte_antwort_korrekt = excluded.letzte_antwort_korrekt;

  return jsonb_build_object('ok', true, 'granted_xp', v_granted);
end $$;

grant execute on function public.lern_antwort_speichern(text, text, text, text, boolean, boolean, int, int, int, boolean, date) to authenticated;

-- ── 4) lern_konzept_abschliessen: Lernkapital nur mit Nachweis ───────────────
-- Voraussetzung: korrekte Antworten über alle 5 Stufen des Konzepts (Stufenleiter
-- komplett richtig, ggf. über mehrere Anläufe). Erst dann „meistern" + Lernkapital.
create or replace function public.lern_konzept_abschliessen(p_konzept text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_stufen_ok int;
  v_block text;
  v_block_total int;
  v_block_done int;
  v_total int;
  v_done int;
  v_added bigint := 0;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;

  -- Lernnachweis: mindestens 5 verschiedene Stufen dieses Konzepts korrekt beantwortet.
  select count(distinct stufe) into v_stufen_ok
    from lern_antworten
    where profile_id = v_profile and konzept_id = p_konzept and korrekt;
  if coalesce(v_stufen_ok, 0) < 5 then
    return jsonb_build_object('ok', false, 'reason', 'not_completed', 'stufen_korrekt', coalesce(v_stufen_ok, 0));
  end if;

  insert into lern_konzept_fortschritt (profile_id, konzept_id, erklaerung_gesehen, hoechste_abgeschlossene_stufe)
    values (v_profile, p_konzept, true, 'meistern')
    on conflict (profile_id, konzept_id) do update set hoechste_abgeschlossene_stufe = 'meistern';

  v_added := v_added + public.grant_capital(v_profile, 'lern_konzept', p_konzept, 50000);

  select themenblock_id into v_block from konzepte where id = p_konzept;
  if v_block is not null then
    select count(*) into v_block_total from konzepte where themenblock_id = v_block;
    select count(*) into v_block_done
      from lern_konzept_fortschritt f join konzepte k on k.id = f.konzept_id
      where f.profile_id = v_profile and f.hoechste_abgeschlossene_stufe = 'meistern' and k.themenblock_id = v_block;
    if v_block_done >= v_block_total then
      v_added := v_added + public.grant_capital(v_profile, 'lern_themenblock', v_block, 100000);
    end if;
  end if;

  select count(*) into v_total from konzepte;
  select count(*) into v_done from lern_konzept_fortschritt
    where profile_id = v_profile and hoechste_abgeschlossene_stufe = 'meistern';
  if v_total > 0 and v_done >= v_total then
    v_added := v_added + public.grant_capital(v_profile, 'lern_meilenstein', 'alle', 200000);
  end if;

  if v_added > 0 then
    update portfolios set cash_cents = cash_cents + v_added where owner_profile_id = v_profile;
  end if;

  return jsonb_build_object('ok', true, 'lernkapital_cents', v_added);
end $$;

grant execute on function public.lern_konzept_abschliessen(text) to authenticated;

-- ── 5) lern_stufe_abgeschlossen sperren ──────────────────────────────────────
-- Von der App ungenutzt; erlaubte das direkte Setzen von 'meistern' ohne Nachweis
-- (und damit das Erschleichen der Block-/Meilenstein-Boni über Finding 4 hinaus).
revoke execute on function public.lern_stufe_abgeschlossen(text, text) from public, anon, authenticated;

-- ── 6) Interne Helfer nicht mehr öffentlich ausführbar ───────────────────────
-- Postgres gibt neuen Funktionen standardmäßig EXECUTE für PUBLIC. Diese Helfer
-- sind nur für serverseitige Aufrufe gedacht:
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.portfolio_value_cents(uuid)',
    'public.grant_capital(uuid, text, text, bigint)',
    'public.award_points(uuid, text, text, int)',        -- in 20260627090000 gedroppt; nur falls vorhanden
    'public.snapshot_all_portfolios()',
    'public.trigger_update_prices()'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;
-- capture_portfolio_snapshot() bleibt bewusst für authenticated erlaubt (App ruft es auf;
-- wirkt nur auf das eigene Depot).

-- ── 7) Rolle nach Anlage unveränderlich (außer service_role) ─────────────────
-- Die Rolle wird bei der Registrierung gewählt (Produktentscheidung); danach darf
-- ein Client sie nicht mehr wechseln (kein Selbst-Upgrade zu teacher/parent).
create or replace function public.prevent_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.jwt() ->> 'role', '') = 'authenticated' then
    raise exception 'role_change_not_allowed';
  end if;
  return new;
end $$;

drop trigger if exists profiles_prevent_role_change on profiles;
create trigger profiles_prevent_role_change
  before update on profiles
  for each row execute function public.prevent_role_change();

-- ── 8) join_class: nur Kinder/Schüler ────────────────────────────────────────
create or replace function public.join_class(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_role user_role;
  v_class classes;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  select role into v_role from profiles where id = v_profile;
  if v_role not in ('child', 'student') then
    return jsonb_build_object('ok', false, 'reason', 'wrong_role');
  end if;
  select * into v_class from classes where class_code = upper(trim(p_code));
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into class_members (class_id, child_profile_id) values (v_class.id, v_profile)
    on conflict do nothing;
  return jsonb_build_object('ok', true, 'class_name', v_class.name);
end $$;

grant execute on function public.join_class(text) to authenticated;
