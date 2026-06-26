-- Fix: service_role-DML-Grants für Tabellen aus Migrationen nach 20260622090100.
-- Supabase' Default-Privilege-Auto-Grant griff bei diesen späteren Tabellen nicht; die
-- jeweiligen Migrationen granteten nur `select` an `authenticated`. Dadurch scheitern
-- Direkt-Schreibzugriffe mit dem Service-Role-Key (z. B. apps/app/scripts/seed-learning.mjs:
-- "permission denied for table learning_module_asset_links") nach einem frischen db reset.
-- Die App selbst schreibt über SECURITY-DEFINER-RPCs und war nie betroffen.
-- RLS bleibt unverändert (service_role umgeht RLS ohnehin) – hier nur Tabellen-Grants,
-- analog zu den frühen Tabellen (z. B. price_snapshots).

grant select, insert, update, delete on
  class_assignments,
  content_blocks,
  daily_plans,
  learning_module_asset_links,
  trade_decisions
to service_role;
