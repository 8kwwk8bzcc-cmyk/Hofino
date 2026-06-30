// Schema-Validator für die neue Bildungsarchitektur (v2). Reine Funktionen → Liste von
// Fehlermeldungen (leer = ok). Trennt HARTE Strukturfehler von WEICHEN Content-Lücken
// (Platzhalter aus der Legacy-Migration), damit der Migrationsfortschritt sichtbar wird.

import {
  AUDIENCES,
  type Audience,
  type LangText,
  type LearningModuleSource,
  type QuestionSource,
  type CalculationTemplateSource,
} from "./types.js";

function langLeer(t: LangText | undefined): boolean {
  return !t || !t.de || t.de.trim().length === 0;
}

function validateQuestionSource(q: QuestionSource, ctx: string): string[] {
  const e: string[] = [];
  if (!q.id) e.push(`${ctx}: id fehlt`);
  if (langLeer(q.question)) e.push(`${ctx}: question fehlt`);
  if (langLeer(q.correctAnswer)) e.push(`${ctx}: correctAnswer fehlt`);
  if (!Number.isFinite(q.points) || q.points <= 0) e.push(`${ctx}: points ungültig`);
  if (q.distractors.length < 1) e.push(`${ctx}: braucht ≥1 Distraktor`);
  q.distractors.forEach((d, i) => {
    if (langLeer(d.text)) e.push(`${ctx} Distraktor ${i + 1}: Text fehlt`);
    if (![1, 2, 3].includes(d.closeness)) e.push(`${ctx} Distraktor ${i + 1}: closeness ∉ {1,2,3}`);
  });
  return e;
}

function validateTemplateSource(c: CalculationTemplateSource, ctx: string): string[] {
  const e: string[] = [];
  if (!c.id) e.push(`${ctx}: id fehlt`);
  if (langLeer(c.questionTemplate)) e.push(`${ctx}: questionTemplate fehlt`);
  if (!c.solutionFormula) e.push(`${ctx}: solutionFormula fehlt`);
  if (!c.distractorFormulas.length) e.push(`${ctx}: braucht ≥1 distractorFormula`);
  if (!Object.keys(c.parameters).length) e.push(`${ctx}: braucht ≥1 Parameter`);
  for (const [name, p] of Object.entries(c.parameters)) {
    if (!(p.min <= p.max)) e.push(`${ctx} Param ${name}: min>max`);
  }
  return e;
}

/** HARTE Strukturprüfung: Bricht ein Modul technisch? (Platzhalter zählen NICHT als Fehler.) */
export function validateModuleSource(m: LearningModuleSource): string[] {
  const e: string[] = [];
  if (!m.id) e.push(`Modul ohne id`);
  const ctx = m.id || "?";
  if (!m.blockId) e.push(`${ctx}: blockId fehlt`);
  if (langLeer(m.title)) e.push(`${ctx}: title fehlt`);
  if (!Number.isInteger(m.unlockLevel) || m.unlockLevel < 1) e.push(`${ctx}: unlockLevel ungültig`);
  if (!["understanding", "calculation", "decision", "reflection"].includes(m.type)) {
    e.push(`${ctx}: type "${m.type}" unbekannt`);
  }
  for (const a of AUDIENCES) {
    if (!(a in m.explanations)) e.push(`${ctx}: explanations.${a} fehlt`);
  }
  m.questions.forEach((q, i) => e.push(...validateQuestionSource(q, `${ctx} Frage ${i + 1}`)));
  (m.calculationTemplates ?? []).forEach((c, i) => e.push(...validateTemplateSource(c, `${ctx} Vorlage ${i + 1}`)));
  return e;
}

export function validateModuleSourceSet(modules: readonly LearningModuleSource[]): string[] {
  const e: string[] = [];
  modules.forEach((m) => e.push(...validateModuleSource(m)));
  const ids = modules.map((m) => m.id);
  if (new Set(ids).size !== ids.length) e.push("doppelte Modul-IDs");
  return e;
}

export interface ContentGap {
  moduleId: string;
  missing: string[];
}

/**
 * WEICHE Prüfung: listet pro Modul die noch redaktionell zu füllenden v2-Felder.
 * Treibt den blockweisen Migrationsfortschritt (leere Liste = vollständig migriert).
 */
export function contentGaps(modules: readonly LearningModuleSource[]): ContentGap[] {
  const out: ContentGap[] = [];
  for (const m of modules) {
    const missing: string[] = [];
    const ped = m.pedagogy;
    if (langLeer(ped.learningGoal)) missing.push("pedagogy.learningGoal");
    if (langLeer(ped.coreIdea)) missing.push("pedagogy.coreIdea");
    if (langLeer(ped.everydayScenario)) missing.push("pedagogy.everydayScenario");
    if (langLeer(ped.misconception)) missing.push("pedagogy.misconception");
    if (langLeer(ped.transferTask)) missing.push("pedagogy.transferTask");
    if (langLeer(ped.reflectionPrompt)) missing.push("pedagogy.reflectionPrompt");
    if (!m.glossaryTerms.length) missing.push("glossaryTerms");
    if (!m.teacherSupport) missing.push("teacherSupport");
    if (!m.parentSupport) missing.push("parentSupport");
    (["learners_10_14", "young_adults", "parents_teachers"] as Audience[]).forEach((a) => {
      if (langLeer(m.explanations[a])) missing.push(`explanations.${a}`);
    });
    if (missing.length) out.push({ moduleId: m.id, missing });
  }
  return out;
}
