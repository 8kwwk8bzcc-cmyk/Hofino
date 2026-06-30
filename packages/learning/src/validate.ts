// Schema-Validator für die neue Bildungsarchitektur (v2). Reine Funktionen → Liste von
// Fehlermeldungen (leer = ok). Trennt HARTE Strukturfehler von WEICHEN Content-Lücken
// (Platzhalter aus der Legacy-Migration), damit der Migrationsfortschritt sichtbar wird.

import {
  AUDIENCES,
  type Audience,
  type LangText,
  type LearningModuleSource,
  type QuestionLevel,
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

// ─────────────────────────────────────────────────────────────────────────────
// Pädagogische Readiness (Abschnitt 19): WEICHE Regeln für die Import-Reife eines
// fertigen v2-Moduls. Legacy-migrierte Module erfüllen diese (z. B. ≥5 Fragen über
// alle Stufen) noch nicht – die Funktion treibt die redaktionelle Fertigstellung.
// ─────────────────────────────────────────────────────────────────────────────
const ALL_LEVELS: QuestionLevel[] = ["explain", "recognize", "understand", "apply", "master"];

export interface ReadinessIssue {
  moduleId: string;
  warnings: string[];
}

/** Prüft ein Modul gegen die pädagogischen Mindestanforderungen. Leer = importreif. */
export function moduleReadiness(m: LearningModuleSource): string[] {
  const w: string[] = [];

  // Verständnis-Module: ≥5 Fragen, alle fünf Stufen abgedeckt.
  if (m.type === "understanding") {
    if (m.questions.length < 5) w.push(`braucht ≥5 Fragen (hat ${m.questions.length})`);
    const levels = new Set(m.questions.map((q) => q.level));
    const fehlend = ALL_LEVELS.filter((l) => !levels.has(l));
    if (fehlend.length) w.push(`Fragelevel fehlen: ${fehlend.join(", ")}`);
  }

  // Rechnerische Module: ≥1 Vorlage (empfohlen apply + master).
  if (m.type === "calculation") {
    const tmpl = m.calculationTemplates ?? [];
    if (!tmpl.length) w.push("braucht ≥1 calculationTemplate");
    else if (!tmpl.some((t) => t.level === "master")) w.push("empfohlen: zusätzliche master-Vorlage");
  }

  // Jede Frage: korrekte Antwort, ≥3 Distraktoren, Nachklärung.
  m.questions.forEach((q, i) => {
    if (langLeer(q.correctAnswer)) w.push(`Frage ${i + 1}: correctAnswer fehlt`);
    if (q.distractors.length < 3) w.push(`Frage ${i + 1}: braucht 3 Distraktoren (hat ${q.distractors.length})`);
    if (langLeer(q.explanationAfterAnswer)) w.push(`Frage ${i + 1}: explanationAfterAnswer fehlt`);
    // Distraktoren ab Stufe „understand" sollen echte Fehlvorstellungen sein (closeness ≥2).
    if ((q.level === "understand" || q.level === "apply" || q.level === "master") &&
        q.distractors.every((d) => d.closeness < 2)) {
      w.push(`Frage ${i + 1}: Distraktoren zu „albern" (closeness <2 auf höherer Stufe)`);
    }
  });

  // Pädagogik + Zielgruppen vollständig (delegiert an contentGaps-Logik).
  const gaps = contentGaps([m]);
  if (gaps.length) w.push(...gaps[0]!.missing.map((g) => `Lücke: ${g}`));

  return w;
}

export function readinessReport(modules: readonly LearningModuleSource[]): ReadinessIssue[] {
  return modules
    .map((m) => ({ moduleId: m.id, warnings: moduleReadiness(m) }))
    .filter((r) => r.warnings.length > 0);
}
