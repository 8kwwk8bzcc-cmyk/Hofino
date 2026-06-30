// Migrations-/Adapterschicht: bildet die Legacy-Inhalte (Konzept + Frage + Vorlage)
// rückwärtskompatibel auf die neue Bildungsarchitektur (LearningModuleSource) ab und
// projiziert die Speicherform (LangText) in die app-facing string-Form (resolveModule).
//
// WICHTIG: Reine Funktionen, kein Seed-Import (vermeidet Zyklen). Die Verdrahtung mit
// den konkreten Inhalten passiert in seed.ts. Es wird KEIN Inhalt überschrieben –
// fehlende v2-Felder werden mit markierten Platzhaltern befüllt (_legacy/_needsContent).

import {
  AUDIENCE_TO_BAND,
  AUDIENCES,
  STUFE_TO_LEVEL,
  type Altersband,
  type Audience,
  type CalculationTemplate,
  type CalculationTemplateSource,
  type Frage,
  type Konzept,
  type LangText,
  type LearningModule,
  type LearningModuleSource,
  type ModuleType,
  type Pedagogy,
  type PedagogySource,
  type Question,
  type QuestionSource,
  type TeacherSupportSource,
  type ParentSupportSource,
  type Vorlage,
} from "./types.js";

const LEER: LangText = { de: "" };

/** Wählt eine Sprache aus LangText (Fallback de). */
export function pick(t: LangText, lang: "de" | "en" = "de"): string {
  return (lang === "en" ? t.en : t.de) ?? t.de ?? "";
}

/** Zielgruppen-Erklärung eines Legacy-Konzepts (temporäres Audience→Altersband-Mapping). */
export function erklaerungFuer(konzept: Konzept, audience: Audience, lang: "de" | "en" = "de"): string {
  const band: Altersband = AUDIENCE_TO_BAND[audience];
  const txt = konzept.erklaerungen[band] ?? konzept.erklaerungen["kind_11_14"] ?? LEER;
  return pick(txt, lang);
}

// ── Legacy → v2-Source ───────────────────────────────────────────────────────

function frageToSource(f: Frage): QuestionSource {
  return {
    id: f.id,
    level: STUFE_TO_LEVEL[f.stufe],
    question: f.frage,
    points: f.wissenspunkte,
    correctAnswer: f.korrekte_antwort,
    distractors: f.distraktor_pool.map((d) => ({ text: d.text, closeness: d.naehe })),
    explanationAfterAnswer: f.erklaerung_nach_antwort,
  };
}

function vorlageToSource(v: Vorlage): CalculationTemplateSource {
  const parameters: Record<string, { min: number; max: number }> = {};
  for (const [name, spec] of Object.entries(v.parameter)) parameters[name] = { min: spec.min, max: spec.max };
  return {
    id: v.id,
    level: v.stufe === "meistern" ? "master" : "apply",
    points: v.wissenspunkte,
    questionTemplate: v.frage_vorlage,
    parameters,
    solutionFormula: v.loesung_formel,
    distractorFormulas: v.distraktor_formeln,
    explanationTemplate: v.erklaerung_nach_antwort ?? LEER,
    unit: v.einheit || undefined,
    rounding: v.rundung === "ganzzahl" ? "integer" : undefined,
  };
}

function legacyType(konzept: Konzept): ModuleType {
  return konzept.ist_rechnerisch ? "calculation" : "understanding";
}

const LEERE_PEDAGOGY: PedagogySource = {
  learningGoal: LEER,
  coreIdea: LEER,
  everydayScenario: LEER,
  misconception: LEER,
  transferTask: LEER,
  reflectionPrompt: LEER,
};

/**
 * Erzeugt aus einem Legacy-Konzept + zugehörigen Fragen/Vorlagen ein v2-Source-Modul.
 * v2-spezifische Felder (pedagogy, glossaryTerms, teacher-/parentSupport, zielgruppen-
 * eigene Erklärungen) sind Platzhalter und werden in `_needsContent` aufgelistet.
 */
export function fromLegacyKonzept(
  konzept: Konzept,
  fragen: Frage[],
  vorlagen: Vorlage[]
): LearningModuleSource {
  // Erklärungen: vorhandene Bänder zielgruppengerecht abbilden, Lücken markieren.
  const explanations = {} as Record<Audience, LangText>;
  for (const a of AUDIENCES) {
    const band = AUDIENCE_TO_BAND[a];
    explanations[a] = konzept.erklaerungen[band] ?? konzept.erklaerungen["kind_11_14"] ?? LEER;
  }

  const needs: string[] = [
    "pedagogy",
    "glossaryTerms",
    "teacherSupport",
    "parentSupport",
    "explanations.young_adults",
  ];

  return {
    id: konzept.id,
    blockId: konzept.themenblock_id,
    title: konzept.titel,
    unlockLevel: konzept.freischalt_level,
    prerequisites: konzept.voraussetzungen,
    type: legacyType(konzept),
    pedagogy: LEERE_PEDAGOGY,
    explanations,
    questions: fragen.map(frageToSource),
    calculationTemplates: vorlagen.length ? vorlagen.map(vorlageToSource) : undefined,
    glossaryTerms: [],
    teacherSupport: undefined,
    parentSupport: undefined,
    legacyId: konzept.id,
    _legacy: true,
    _needsContent: needs,
  };
}

// ── v2-Source → app-facing (resolved, string) ────────────────────────────────

function resolvePedagogy(p: PedagogySource, lang: "de" | "en"): Pedagogy {
  return {
    learningGoal: pick(p.learningGoal, lang),
    coreIdea: pick(p.coreIdea, lang),
    everydayScenario: pick(p.everydayScenario, lang),
    misconception: pick(p.misconception, lang),
    transferTask: pick(p.transferTask, lang),
    reflectionPrompt: pick(p.reflectionPrompt, lang),
  };
}

function resolveQuestion(q: QuestionSource, lang: "de" | "en"): Question {
  return {
    id: q.id,
    level: q.level,
    question: pick(q.question, lang),
    points: q.points,
    correctAnswer: pick(q.correctAnswer, lang),
    distractors: q.distractors.map((d) => ({ text: pick(d.text, lang), closeness: d.closeness })),
    explanationAfterAnswer: pick(q.explanationAfterAnswer, lang),
  };
}

function resolveTemplate(c: CalculationTemplateSource, lang: "de" | "en"): CalculationTemplate {
  return {
    id: c.id,
    level: c.level,
    points: c.points,
    questionTemplate: pick(c.questionTemplate, lang),
    parameters: c.parameters,
    solutionFormula: c.solutionFormula,
    distractorFormulas: c.distractorFormulas,
    explanationTemplate: pick(c.explanationTemplate, lang),
    unit: c.unit,
    rounding: c.rounding,
  };
}

// ── app-facing (string) → Source (LangText) ──────────────────────────────────
// „Hebt" gelieferte v2-Inhalte (flache strings, nur de) in die Source-Form, damit die
// vorhandenen Validatoren/Readiness-Checks (die auf LangText arbeiten) wiederverwendbar sind.

const de = (s: string | undefined): LangText => ({ de: s ?? "" });

export function liftModuleToSource(m: LearningModule): LearningModuleSource {
  const explanations = {} as Record<Audience, LangText>;
  for (const a of AUDIENCES) explanations[a] = de(m.explanations[a]);
  const teacherSupport: TeacherSupportSource | undefined = m.teacherSupport
    ? {
        competenceGoal: de(m.teacherSupport.competenceGoal),
        typicalMisconception: de(m.teacherSupport.typicalMisconception),
        discussionPrompt: de(m.teacherSupport.discussionPrompt),
        classroomActivity: de(m.teacherSupport.classroomActivity),
      }
    : undefined;
  const parentSupport: ParentSupportSource | undefined = m.parentSupport
    ? {
        conversationPrompt: de(m.parentSupport.conversationPrompt),
        everydayExercise: de(m.parentSupport.everydayExercise),
      }
    : undefined;
  return {
    id: m.id,
    blockId: m.blockId,
    title: de(m.title),
    unlockLevel: m.unlockLevel,
    prerequisites: m.prerequisites,
    type: m.type,
    pedagogy: {
      learningGoal: de(m.pedagogy.learningGoal),
      coreIdea: de(m.pedagogy.coreIdea),
      everydayScenario: de(m.pedagogy.everydayScenario),
      misconception: de(m.pedagogy.misconception),
      transferTask: de(m.pedagogy.transferTask),
      reflectionPrompt: de(m.pedagogy.reflectionPrompt),
    },
    explanations,
    questions: m.questions.map((q) => ({
      id: q.id,
      level: q.level,
      question: de(q.question),
      points: q.points,
      correctAnswer: de(q.correctAnswer),
      distractors: q.distractors.map((d) => ({ text: de(d.text), closeness: d.closeness })),
      explanationAfterAnswer: de(q.explanationAfterAnswer),
      displayedDistractors: q.displayedDistractors,
    })),
    calculationTemplates: m.calculationTemplates?.map((c) => ({
      id: c.id,
      level: c.level,
      points: c.points,
      questionTemplate: de(c.questionTemplate),
      parameters: c.parameters,
      solutionFormula: c.solutionFormula,
      distractorFormulas: c.distractorFormulas,
      explanationTemplate: de(c.explanationTemplate),
      unit: c.unit,
      rounding: c.rounding,
    })),
    glossaryTerms: m.glossaryTerms,
    teacherSupport,
    parentSupport,
    legacyId: m.legacyId,
    difficulty: m.difficulty,
    targetGroups: m.targetGroups,
    reviewStatus: m.reviewStatus,
  };
}

/** Projiziert ein v2-Source-Modul in die app-facing string-Form (Default-Sprache de). */
export function resolveModule(src: LearningModuleSource, lang: "de" | "en" = "de"): LearningModule {
  const explanations = {} as Record<Audience, string>;
  for (const a of AUDIENCES) explanations[a] = pick(src.explanations[a] ?? LEER, lang);
  return {
    id: src.id,
    blockId: src.blockId,
    title: pick(src.title, lang),
    unlockLevel: src.unlockLevel,
    prerequisites: src.prerequisites,
    type: src.type,
    pedagogy: resolvePedagogy(src.pedagogy, lang),
    explanations,
    questions: src.questions.map((q) => resolveQuestion(q, lang)),
    calculationTemplates: src.calculationTemplates?.map((c) => resolveTemplate(c, lang)),
    glossaryTerms: src.glossaryTerms,
    teacherSupport: src.teacherSupport
      ? {
          competenceGoal: pick(src.teacherSupport.competenceGoal, lang),
          typicalMisconception: pick(src.teacherSupport.typicalMisconception, lang),
          discussionPrompt: pick(src.teacherSupport.discussionPrompt, lang),
          classroomActivity: pick(src.teacherSupport.classroomActivity, lang),
        }
      : undefined,
    parentSupport: src.parentSupport
      ? {
          conversationPrompt: pick(src.parentSupport.conversationPrompt, lang),
          everydayExercise: pick(src.parentSupport.everydayExercise, lang),
        }
      : undefined,
    legacyId: src.legacyId,
    difficulty: src.difficulty,
  };
}
