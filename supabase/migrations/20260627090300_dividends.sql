-- Hofino – Virtuelle Dividenden im Musterdepot.
-- Modell (kindgerecht, vereinfacht): je Instrument eine grobe Jahresrendite in Basispunkten
-- (dividend_yield_bps); ausgezahlt wird beim App-Start für den aktuellen Monat (1/12 p.a.).
-- Cash-Zufluss → zählt zur Gesamtrendite, erhöht NICHT die Performance-Basis (anders als
-- Lernkapital). Keine angezeigten Renditezahlen (CLAUDE.md §2/§3). Beträge bleiben Cent/bigint.

alter table instruments add column if not exists dividend_yield_bps int not null default 0;

-- Ausgezahlte Dividenden (Historie + Idempotenz je Monat). Schreiben nur über die RPC
-- (security definer); Eigentümer liest die eigenen Einträge.
create table dividend_payments (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles (id) on delete cascade,
  instrument_id uuid not null references instruments (id) on delete cascade,
  period       text not null,            -- 'YYYY-MM' (Simulations-Monat)
  amount_cents bigint not null,
  paid_at      timestamptz not null default now(),
  unique (profile_id, instrument_id, period)
);

alter table dividend_payments enable row level security;
create policy dividend_payments_read_own on dividend_payments
  for select to authenticated
  using (profile_id in (select current_profile_ids()));

-- Migrationen nach 20260622090100 bekommen keine pauschalen Grants → explizit setzen.
grant select on dividend_payments to authenticated;
grant all on dividend_payments to service_role;

-- Fällige Dividenden des aktuellen Monats dem Depot gutschreiben (idempotent je Monat).
-- Betrag = Stücke × aktueller Kurs × Jahresrendite / 12, auf Cent gerundet.
create or replace function public.dividenden_nachzahlen()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_period  text := to_char(current_date, 'YYYY-MM');
  v_total   bigint := 0;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;

  with calc as (
    select h.instrument_id,
           round(h.quantity::numeric * pr.price_cents * i.dividend_yield_bps / 10000.0 / 12.0)::bigint as amount
    from holdings h
    join portfolios po on po.id = h.portfolio_id and po.owner_profile_id = v_profile
    join instruments i on i.id = h.instrument_id and i.dividend_yield_bps > 0
    join prices pr on pr.instrument_id = h.instrument_id
  ),
  ins as (
    insert into dividend_payments (profile_id, instrument_id, period, amount_cents)
    select v_profile, instrument_id, v_period, amount from calc where amount > 0
    on conflict (profile_id, instrument_id, period) do nothing
    returning amount_cents
  )
  select coalesce(sum(amount_cents), 0) into v_total from ins;

  if v_total > 0 then
    update portfolios set cash_cents = cash_cents + v_total where owner_profile_id = v_profile;
  end if;

  return jsonb_build_object('ok', true, 'paid_cents', v_total, 'period', v_period);
end $$;
grant execute on function public.dividenden_nachzahlen() to authenticated;
