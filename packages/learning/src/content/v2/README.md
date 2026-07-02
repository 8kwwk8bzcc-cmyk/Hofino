# Curriculum v2 – Block-Inhalte (JSON)

Hier liegen die ausgearbeiteten Lerninhalte der neuen Bildungsarchitektur, **eine JSON-Datei pro
Themenblock**, benannt nach der `blockId` (z. B. `tb_geld_wert_entscheidungen.json`).

## Dateiformat

Jede Datei enthält ein Array von `LearningModuleSource` (Typdefinition in `../../types.ts`).
Texte als `LangText` (`{ "de": "…", "en"?: "…" }`), damit die i18n-Vorbereitung erhalten bleibt.

```jsonc
[
  {
    "id": "konzept_geld",
    "blockId": "tb_geld_wert_entscheidungen",
    "title": { "de": "Was ist Geld?" },
    "unlockLevel": 1,
    "prerequisites": [],
    "type": "understanding",                 // understanding | calculation | decision | reflection
    "legacyId": "konzept_geld",              // optional: Herkunft aus altem Seed
    "pedagogy": {
      "learningGoal":     { "de": "…" },
      "coreIdea":         { "de": "…" },
      "everydayScenario": { "de": "…" },
      "misconception":    { "de": "…" },
      "transferTask":     { "de": "…" },
      "reflectionPrompt": { "de": "…" }
    },
    "explanations": {
      "learners_10_14":   { "de": "…" },
      "young_adults":     { "de": "…" },
      "parents_teachers": { "de": "…" }
    },
    "questions": [
      {
        "id": "q_geld_explain",
        "level": "explain",                  // explain | recognize | understand | apply | master
        "question": { "de": "…" },
        "points": 100,
        "correctAnswer": { "de": "…" },
        "distractors": [
          { "text": { "de": "…" }, "closeness": 1 },
          { "text": { "de": "…" }, "closeness": 2 },
          { "text": { "de": "…" }, "closeness": 3 }
        ],
        "explanationAfterAnswer": { "de": "…" }
      }
    ],
    "calculationTemplates": [
      {
        "id": "tmpl_…_apply",
        "level": "apply",                    // apply | master
        "points": 150,
        "questionTemplate": { "de": "… {betrag} … {monate} …" },
        "parameters": { "betrag": { "min": 2, "max": 20 }, "monate": { "min": 2, "max": 12 } },
        "solutionFormula": "betrag * monate",
        "distractorFormulas": ["betrag + monate", "betrag * (monate + 1)"],
        "explanationTemplate": { "de": "…" },
        "unit": "Euro",
        "rounding": "integer"
      }
    ],
    "glossaryTerms": ["Geld", "Tauschmittel"],
    "teacherSupport": {
      "competenceGoal": { "de": "…" },
      "typicalMisconception": { "de": "…" },
      "discussionPrompt": { "de": "…" },
      "classroomActivity": { "de": "…" }
    },
    "parentSupport": {
      "conversationPrompt": { "de": "…" },
      "everydayExercise": { "de": "…" }
    }
  }
]
```

## Einpflegen (pro geliefertem Block)

1. Datei `tb_<block>.json` hier anlegen.
2. In `../../seed.ts` importieren und in `V2_QUELLEN` eintragen.
3. `validateModuleSourceSet` (hart) muss leer sein; `readinessReport` (weich, §19) zeigt
   verbleibende redaktionelle Lücken.
4. Modul-IDs müssen zu `CURRICULUM_BLOCKS` passen (`checkCurriculumIntegrity`).

## Regeln (Auszug)

- Verständnis-Module: ≥5 Fragen, alle fünf Stufen abgedeckt.
- Rechnerische Module: ≥1 (besser 2) Rechenvorlagen (`apply` + `master`).
- Jede Frage: `correctAnswer`, 3 `distractors`, `explanationAfterAnswer`.
- Keine Gewinngarantien; ETF nicht risikolos; Dividende nicht „sicherer Zins";
  „Aktie = Anteil an einem Unternehmen" (nicht „eine Firma").
- `konzept_kosten` NICHT als Ziel-ID verwenden (→ `konzept_ordergebuehren`);
  Unternehmenskosten = `konzept_unternehmenskosten`.
