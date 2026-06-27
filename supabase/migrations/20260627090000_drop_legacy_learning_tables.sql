-- Hofino – Alt-Lernsystem entfernen.
-- Das frühe Modul-Lernsystem (RPC complete_module → learning_progress/knowledge_points) ist
-- vollständig durch den neuen Lern-Kern (packages/learning, Tabellen lern_*) abgelöst:
--   * Schreibpfad war bereits tot (kein UI-Aufrufer von complete_module mehr).
--   * Lesepfade umgestellt (2026-06-27): class_overview (090900), fetchFamily + Store-loadData,
--     ranking-recompute → lesen jetzt lern_status.xp_gesamt / lern_konzept_fortschritt.
-- Damit sind RPC + Tabellen tot und werden hier entfernt. Wissenspunkte = lern_status.xp_gesamt;
-- abgeschlossene Konzepte = lern_konzept_fortschritt (hoechste_abgeschlossene_stufe='meistern').

drop function if exists public.complete_module(text, int, int);
drop function if exists public.award_points(uuid, text, text, int);

-- Tabellen inkl. RLS-Policies (cascade).
drop table if exists public.learning_progress cascade;
drop table if exists public.knowledge_points cascade;

-- Eltern-Lesepfad für die Family-Ansicht: Die alten Tabellen erlaubten Eltern, den
-- Lernfortschritt ihrer freigegebenen Kinder zu lesen (learning_parent_reads,
-- knowledge_points_read_own). Der neue Lern-Kern hatte bislang nur _own-Policies →
-- Family-Dashboard zeigte 0. Hier nachgezogen (nur SELECT, Schreiben bleibt serverseitig).
create policy fortschritt_parent_reads on lern_konzept_fortschritt
  for select to authenticated
  using (profile_id in (select approved_child_ids()));

create policy status_parent_reads on lern_status
  for select to authenticated
  using (profile_id in (select approved_child_ids()));
