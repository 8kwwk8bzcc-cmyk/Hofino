-- ─────────────────────────────────────────────────────────────────────────────
-- Sicherheits-Konsistenz: learning_module_asset_links war die einzige Tabelle ohne
-- Row-Level Security. Inhalt ist rein redaktionell (Konzept↔Instrument-Mapping,
-- keine personenbezogenen Daten) → RLS aktivieren und eine reine Lese-Policy für
-- angemeldete Nutzer setzen, konsistent zum übrigen Schema. Kein Schreibzugriff.
-- ─────────────────────────────────────────────────────────────────────────────
alter table learning_module_asset_links enable row level security;

create policy lmal_read on learning_module_asset_links
  for select to authenticated using (true);
