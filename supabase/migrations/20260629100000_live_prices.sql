-- ─────────────────────────────────────────────────────────────────────────────
-- „Kurse lebendig": (1) Basiskurs je Instrument verankern, damit der Simulator
-- REALISTISCH um den kuratierten Seed-Preis schwankt (±12 %) statt um einen
-- ID-Hash (sonst kostete z. B. Apple plötzlich 507 € statt ~210 €).
-- (2) Stündlicher Cron, der die Edge-Function `update-prices` während der
-- Handelszeit anstößt (vorher liefen die Kurse gar nicht).
-- ─────────────────────────────────────────────────────────────────────────────

-- (1) Basiskurs-Spalte + Backfill aus dem frühesten (= Seed-)Snapshot, falls vorhanden.
alter table instruments add column if not exists base_price_cents bigint;

update instruments i
set base_price_cents = sub.price_cents
from (
  select distinct on (instrument_id) instrument_id, price_cents
  from price_snapshots
  order by instrument_id, as_of asc
) sub
where sub.instrument_id = i.id and i.base_price_cents is null;

-- (2) Stündliche Planung der Kursaktualisierung.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Stößt die Edge-Function an. Die Ziel-URL kommt aus einer DB-Einstellung, damit
-- lokal NICHTS passiert (inert), solange sie nicht gesetzt ist. In der Cloud
-- einmalig setzen (sonst bleibt der Cron wirkungslos):
--   alter database postgres set app.functions_url = 'https://<project-ref>.supabase.co/functions/v1';
create or replace function public.trigger_update_prices()
returns void language plpgsql security definer set search_path = public as $$
declare v_base text := current_setting('app.functions_url', true);
begin
  if v_base is null or v_base = '' then return; end if;
  perform net.http_post(
    url := v_base || '/update-prices',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
end $$;

-- Minute 0 jeder Stunde; die Function selbst überspringt außerhalb der Xetra-Zeit.
select cron.schedule('hofino-update-prices', '0 * * * *', $$select public.trigger_update_prices()$$);
