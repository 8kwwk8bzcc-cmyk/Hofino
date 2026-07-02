-- Hofino – Lern-/Festigungs-Kern: Schema-Vorbereitung der neuen Bildungsarchitektur (v2).
-- ADDITIV und rückwärtskompatibel: bestehende Spalten (ist_rechnerisch, stufen, erklaerungen …)
-- bleiben erhalten. Es werden KEINE Inhalte gelöscht; neue v2-Felder sind nullable und werden
-- redaktionell blockweise befüllt. Spiegelt packages/learning/src/types.ts (v2-Typen).
--
-- Hinweis: Die App liest Lerninhalte derzeit aus @hofino/learning (Paket-JSON), nicht aus
-- diesen Tabellen. Diese Migration hält das DB-Schema für eine spätere Server-Seedung bereit.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) konzepte → v2-Felder
-- ─────────────────────────────────────────────────────────────────────────────
alter table konzepte add column if not exists type            text;
alter table konzepte add column if not exists pedagogy        jsonb;          -- { learningGoal, coreIdea, everydayScenario, misconception, transferTask, reflectionPrompt }
alter table konzepte add column if not exists glossary_terms  text[] not null default '{}';
alter table konzepte add column if not exists teacher_support jsonb;          -- { competenceGoal, typicalMisconception, discussionPrompt, classroomActivity }
alter table konzepte add column if not exists parent_support  jsonb;          -- { conversationPrompt, everydayExercise }

-- type aus ist_rechnerisch ableiten (decision/reflection kommen mit neuen Inhalten).
update konzepte set type = case when ist_rechnerisch then 'calculation' else 'understanding' end
where type is null;

alter table konzepte
  add constraint konzepte_type_chk
  check (type is null or type in ('understanding', 'calculation', 'decision', 'reflection'));

comment on column konzepte.erklaerungen is
  'v2-Zielgruppen: { learners_10_14, young_adults, parents_teachers }. Legacy-Keys (kind_8_10, kind_11_14, eltern_lehrer) werden unten remappt.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) erklaerungen: Legacy-Altersbänder → v2-Zielgruppen (defensiv, nur falls vorhanden)
--    kind_8_10 + kind_11_14 → learners_10_14 (kind_11_14 bevorzugt)
--    eltern_lehrer          → parents_teachers
--    young_adults           → Platzhalter aus eltern_lehrer (redaktionell zu ersetzen)
-- ─────────────────────────────────────────────────────────────────────────────
update konzepte set erklaerungen = (
  coalesce(erklaerungen, '{}'::jsonb)
  || case when erklaerungen ? 'kind_11_14' then jsonb_build_object('learners_10_14', erklaerungen->'kind_11_14')
          when erklaerungen ? 'kind_8_10'  then jsonb_build_object('learners_10_14', erklaerungen->'kind_8_10')
          else '{}'::jsonb end
  || case when erklaerungen ? 'eltern_lehrer' then jsonb_build_object('parents_teachers', erklaerungen->'eltern_lehrer')
          else '{}'::jsonb end
  || case when erklaerungen ? 'eltern_lehrer' then jsonb_build_object('young_adults', erklaerungen->'eltern_lehrer')
          else '{}'::jsonb end
)
where erklaerungen ?| array['kind_8_10', 'kind_11_14', 'eltern_lehrer'];

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) fragen / vorlagen: englische level-Spalte additiv (Legacy `stufe` bleibt führend)
--    Mapping: erklaeren→explain, erkennen→recognize, verstehen→understand,
--             anwenden→apply, meistern→master
-- ─────────────────────────────────────────────────────────────────────────────
alter table fragen   add column if not exists level text;
alter table vorlagen add column if not exists level text;

update fragen set level = case stufe
  when 'erklaeren' then 'explain' when 'erkennen' then 'recognize' when 'verstehen' then 'understand'
  when 'anwenden' then 'apply' when 'meistern' then 'master' else stufe end
where level is null;

update vorlagen set level = case stufe
  when 'anwenden' then 'apply' when 'meistern' then 'master' else stufe end
where level is null;
