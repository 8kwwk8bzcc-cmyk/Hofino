-- Marktdaten-Ingestion (MVP): aktuelle Kurse + Quellen-Kennung, austauschbare Quelle.
-- Geld bleibt in Cent (bigint), konform zu CLAUDE.md §4. Schicht A (Ingestion) schreibt
-- serverseitig; die App liest ausschließlich aus prices/price_snapshots (Schicht B).

-- Instrumente um Quellen-Mapping + Aktiv-Flag erweitern.
alter table instruments add column if not exists provider_symbol text;
alter table instruments add column if not exists is_active boolean not null default true;

-- Quelle je Snapshot festhalten (z. B. 'simulated' | 'twelvedata').
alter table price_snapshots add column if not exists source text not null default 'simulated';

-- Aktueller Kurs je Instrument (genau eine Zeile, upsert durch die Ingestion).
create table if not exists prices (
  instrument_id uuid primary key references instruments (id) on delete cascade,
  price_cents   bigint not null check (price_cents >= 0),
  as_of         timestamptz not null,
  source        text not null,
  updated_at    timestamptz not null default now()
);

-- RLS: Lesen für authentifizierte Nutzer; Schreiben nur Service-Role (Edge Function,
-- umgeht RLS) – es gibt bewusst KEINE Insert/Update-Policy für Clients.
alter table prices enable row level security;
create policy prices_read on prices for select to authenticated using (true);

-- Tabellen-Grants (wie bei den übrigen Tabellen): Lesen für authentifizierte Nutzer,
-- volle DML für die Service-Role (Edge Function). anon erhält bewusst nichts.
grant select on prices to authenticated;
grant select, insert, update, delete on prices to service_role;

-- Backfill: aktuellen Kurs aus dem jüngsten vorhandenen Snapshot je Instrument übernehmen.
insert into prices (instrument_id, price_cents, as_of, source)
select distinct on (instrument_id) instrument_id, price_cents, as_of, coalesce(source, 'simulated')
from price_snapshots
order by instrument_id, as_of desc
on conflict (instrument_id) do nothing;

-- provider_symbol-Default: internes Ticker als Quellen-Symbol (redaktionell verfeinerbar,
-- z. B. 'SAP:XETR' für Twelve Data / Xetra-Notierung in EUR).
update instruments set provider_symbol = ticker where provider_symbol is null and ticker is not null;
