-- Hofino – Alt-Tabelle content_blocks entfernen.
-- content_blocks war die Modul→Themenblock-Zuordnung des frühen Lernsystems; einzige Leserin
-- war die RPC complete_module (in 20260627090000 entfernt). Der neue Lern-Kern leitet den
-- Themenblock aus konzepte.themenblock_id ab. Damit ist content_blocks verwaist → entfernen
-- (RLS-Policy + Grants fallen via cascade mit der Tabelle weg).

drop table if exists public.content_blocks cascade;
