-- ─────────────────────────────────────────────────────────────────────────────
-- Depotwert über Zeit: tägliche Snapshots des Gesamtwerts (Cash + Positionen zum
-- letzten Kurs), damit die App eine Wertentwicklungs-Kurve zeigen kann.
-- Quelle der Wahrheit serverseitig (manipulationssicher); Eltern/Lehrer sehen
-- diese Reihe NICHT (deren Aggregate laufen über die bestehenden Pfade).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists portfolio_snapshots (
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  as_of date not null,
  total_value_cents bigint not null,
  created_at timestamptz not null default now(),
  primary key (portfolio_id, as_of)
);

alter table portfolio_snapshots enable row level security;

-- Lesen nur über RLS (eigene Reihe). Schreiben ausschließlich über die
-- SECURITY-DEFINER-RPCs unten – kein direktes Insert/Update/Delete für Clients.
grant select on table portfolio_snapshots to authenticated;

-- Nur die eigene Reihe ist lesbar (für den eigenen Chart).
create policy "own portfolio snapshots readable"
  on portfolio_snapshots for select
  using (
    portfolio_id in (select id from portfolios where owner_profile_id = public.caller_profile_id())
  );

-- Gesamtwert eines Depots zum letzten verfügbaren Kurs.
create or replace function public.portfolio_value_cents(p_portfolio uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select pf.cash_cents + coalesce(sum(h.quantity * pr.price_cents), 0)
  from portfolios pf
  left join holdings h on h.portfolio_id = pf.id
  left join prices pr on pr.instrument_id = h.instrument_id
  where pf.id = p_portfolio
  group by pf.cash_cents;
$$;

-- Snapshot des aufrufenden Nutzers für heute (idempotent). Vom Client beim Laden
-- aufgerufen, damit sofort ein Datenpunkt entsteht und der heutige Wert aktuell bleibt.
create or replace function public.capture_portfolio_snapshot()
returns void language plpgsql security definer set search_path = public as $$
declare v_pf uuid;
begin
  select id into v_pf from portfolios where owner_profile_id = public.caller_profile_id();
  if v_pf is null then return; end if;
  insert into portfolio_snapshots (portfolio_id, as_of, total_value_cents)
    values (v_pf, current_date, public.portfolio_value_cents(v_pf))
  on conflict (portfolio_id, as_of)
    do update set total_value_cents = excluded.total_value_cents, created_at = now();
end $$;
grant execute on function public.capture_portfolio_snapshot() to authenticated;

-- Täglicher Snapshot ALLER Depots (auch wenn die App nicht geöffnet wird).
create or replace function public.snapshot_all_portfolios()
returns void language sql security definer set search_path = public as $$
  insert into portfolio_snapshots (portfolio_id, as_of, total_value_cents)
  select pf.id, current_date,
         pf.cash_cents + coalesce(sum(h.quantity * pr.price_cents), 0)
  from portfolios pf
  left join holdings h on h.portfolio_id = pf.id
  left join prices pr on pr.instrument_id = h.instrument_id
  group by pf.id, pf.cash_cents
  on conflict (portfolio_id, as_of)
    do update set total_value_cents = excluded.total_value_cents, created_at = now();
$$;

-- Werktags nach Börsenschluss (18:00 UTC ≈ 20:00 MESZ).
select cron.schedule('hofino-portfolio-snapshots', '0 18 * * 1-5', $$select public.snapshot_all_portfolios()$$);
