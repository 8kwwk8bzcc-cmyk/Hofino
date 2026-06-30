// @hofino/learning – Datenmodell des Lern-/Festigungs-Kerns.
// Feldnamen bewusst Deutsch (1:1 aus der Seed-/Spec-Struktur), damit Inhalte datengetrieben bleiben.

/** Mehrsprachiger Text. MVP befüllt nur `de`; weitere Sprachen optional. */
export interface LangText {
  de: string;
  en?: string;
}

export type Stufe = "erklaeren" | "erkennen" | "verstehen" | "anwenden" | "meistern";
export const STUFEN: readonly Stufe[] = ["erklaeren", "erkennen", "verstehen", "anwenden", "meistern"];

export type Altersband = "kind_8_10" | "kind_11_14" | "eltern_lehrer";

/** Nähe eines Distraktors: 1 = klar falsch … 3 = nah dran (für Schwierigkeitssteigerung). */
export type Naehe = 1 | 2 | 3;

// ─────────────────────────────────────────────────────────────────────────────
// Inhalte (redaktionell / deterministisch) – §3–§5
// ─────────────────────────────────────────────────────────────────────────────
export interface Themenblock {
  id: string;
  titel: LangText;
}

export interface Konzept {
  id: string;
  modul_nr: number;
  themenblock_id: string;
  titel: LangText;
  /** true → Stufe 4–5 aus parametrischen Vorlagen; false → kuratierte MC mit näheren Distraktoren. */
  ist_rechnerisch: boolean;
  voraussetzungen: string[];
  freischalt_level: number;
  erklaerungen: Record<Altersband, LangText>;
  stufen: Stufe[];
}

export interface Distraktor {
  text: LangText;
  naehe: Naehe;
}

export interface Frage {
  id: string;
  konzept_id: string;
  stufe: Stufe;
  typ: "multiple_choice";
  frage: LangText;
  korrekte_antwort: LangText;
  distraktor_pool: Distraktor[];
  anzahl_distraktoren_angezeigt: number;
  erklaerung_nach_antwort: LangText;
  wissenspunkte: number;
}

export interface ParamSpec {
  typ: "int";
  min: number;
  max: number;
}

export interface Vorlage {
  id: string;
  konzept_id: string;
  stufe: Stufe;
  parameter: Record<string, ParamSpec>;
  frage_vorlage: LangText;
  loesung_formel: string;
  distraktor_formeln: string[];
  einheit: string;
  rundung: "ganzzahl";
  erklaerung_nach_antwort?: LangText;
  wissenspunkte: number;
}

/** Gesamter Seed-/Inhaltscontainer (so wie Hofino_Seed_Konzepte.json). */
export interface InhaltsSeed {
  themenbloecke: Themenblock[];
  konzepte: Konzept[];
  fragen: Frage[];
  vorlagen: Vorlage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine-Ausgabe: eine spielfertige, gemischte MC-Frage
// ─────────────────────────────────────────────────────────────────────────────
export interface AntwortOption {
  text: string;
  korrekt: boolean;
}

export interface FrageInstanz {
  /** Herkunft: genau eine von beiden gesetzt. */
  frage_id?: string;
  vorlage_id?: string;
  konzept_id: string;
  stufe: Stufe;
  frage: string;
  /** 2–4 Optionen, Reihenfolge gemischt. */
  optionen: AntwortOption[];
  erklaerung_nach_antwort: string;
  wissenspunkte: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spaced Repetition (Leitner) – §7
// ─────────────────────────────────────────────────────────────────────────────
export type LeitnerBox = 1 | 2 | 3 | 4 | 5;

export interface SRZustand {
  konzept_id: string;
  leitner_box: LeitnerBox;
  richtig_in_folge: number;
  gemeistert: boolean;
  /** ISO-Datum (YYYY-MM-DD). */
  naechste_faelligkeit: string;
  letzte_antwort_korrekt: boolean | null;
}

/** Linearer Erstlern-Fortschritt eines Konzepts (Erklärung + Stufenleiter). */
export interface KonzeptFortschritt {
  konzept_id: string;
  erklaerung_gesehen: boolean;
  hoechste_abgeschlossene_stufe: Stufe | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auszeichnungen – §9 (Datenmodell jetzt, UI später)
// ─────────────────────────────────────────────────────────────────────────────
export type AuszeichnungEbene = "rekord" | "meilenstein";
export type Rang = "bronze" | "silber" | "gold";

export interface AuszeichnungBedingung {
  metrik: string;
  konzept_id?: string;
  schwelle: number;
}

export interface AuszeichnungBelohnung {
  wissenspunkte: number;
  haus_objekt: string | null;
}

export interface AuszeichnungStufe {
  rang: Rang;
  bedingung: AuszeichnungBedingung;
  belohnung: AuszeichnungBelohnung;
}

export interface Auszeichnung {
  id: string;
  ebene: AuszeichnungEbene;
  kategorie?: string;
  titel: LangText;
  typ?: "gestuft";
  permanent: boolean;
  stufen?: AuszeichnungStufe[];
  // Rekorde:
  metrik?: string;
  anzeige?: "hoechstwert";
  // Saison (ab 1.2):
  saisonal: boolean;
  start: string | null;
  ende: string | null;
  sichtbarkeit?: "freunde_freigabe";
}

// ─────────────────────────────────────────────────────────────────────────────
// Tuning-Parameter (§13) – Startwerte, alle anpassbar
// ─────────────────────────────────────────────────────────────────────────────
export interface TuningConfig {
  angezeigte_distraktoren: number;
  tageslimit_neu: number;
  tageslimit_wiederholung: number;
  mastery_schwelle: number;
  leitner_intervalle_tage: readonly number[];
  tages_cap_wiederhol_xp: number;
}

export const DEFAULT_TUNING: TuningConfig = {
  angezeigte_distraktoren: 3,
  tageslimit_neu: 10,
  tageslimit_wiederholung: 10,
  mastery_schwelle: 3,
  leitner_intervalle_tage: [1, 3, 7, 16, 35],
  tages_cap_wiederhol_xp: 300,
};

// ═════════════════════════════════════════════════════════════════════════════
// NEUE Bildungsarchitektur (v2) – additiv. Die Legacy-Typen oben bleiben gültig,
// bis Inhalte blockweise auf das neue Schema migriert sind (siehe migrate.ts).
//
// Speicher-/Autorenform ("…Source") behält `LangText` (de/en-i18n).
// App-facing Form (`LearningModule`/`Question`/`CalculationTemplate`) ist die in
// der Spec geforderte flache `string`-Variante; `resolveModule()` projiziert sie.
// ═════════════════════════════════════════════════════════════════════════════

/** Drei Zielgruppen (ersetzt das alte `Altersband`). */
export type Audience = "learners_10_14" | "young_adults" | "parents_teachers";
export const AUDIENCES: readonly Audience[] = ["learners_10_14", "young_adults", "parents_teachers"];

export type ModuleType = "understanding" | "calculation" | "decision" | "reflection";

/** Englische Stufen-Namen (1:1 zu `Stufe`). */
export type QuestionLevel = "explain" | "recognize" | "understand" | "apply" | "master";

/** Stufe (DE, Legacy/Engine) ↔ QuestionLevel (EN, neues Schema). */
export const STUFE_TO_LEVEL: Record<Stufe, QuestionLevel> = {
  erklaeren: "explain",
  erkennen: "recognize",
  verstehen: "understand",
  anwenden: "apply",
  meistern: "master",
};
export const LEVEL_TO_STUFE: Record<QuestionLevel, Stufe> = {
  explain: "erklaeren",
  recognize: "erkennen",
  understand: "verstehen",
  apply: "anwenden",
  master: "meistern",
};

/**
 * Zielgruppe → Legacy-Altersband (für die temporäre Auflösung bestehender Inhalte,
 * solange keine zielgruppenspezifischen v2-Texte vorliegen). `kind_8_10` und
 * `kind_11_14` kollabieren in `learners_10_14`; `young_adults` nutzt vorerst die
 * sachlichere `eltern_lehrer`-Erklärung als Platzhalter.
 */
export const AUDIENCE_TO_BAND: Record<Audience, Altersband> = {
  learners_10_14: "kind_11_14",
  young_adults: "eltern_lehrer",
  parents_teachers: "eltern_lehrer",
};

export interface Pedagogy {
  learningGoal: string;
  coreIdea: string;
  everydayScenario: string;
  misconception: string;
  transferTask: string;
  reflectionPrompt: string;
}
/** Autorenform mit i18n. */
export interface PedagogySource {
  learningGoal: LangText;
  coreIdea: LangText;
  everydayScenario: LangText;
  misconception: LangText;
  transferTask: LangText;
  reflectionPrompt: LangText;
}

export interface TeacherSupport {
  competenceGoal: string;
  typicalMisconception: string;
  discussionPrompt: string;
  classroomActivity: string;
}
export interface TeacherSupportSource {
  competenceGoal: LangText;
  typicalMisconception: LangText;
  discussionPrompt: LangText;
  classroomActivity: LangText;
}

export interface ParentSupport {
  conversationPrompt: string;
  everydayExercise: string;
}
export interface ParentSupportSource {
  conversationPrompt: LangText;
  everydayExercise: LangText;
}

// ── App-facing (resolved, string) ───────────────────────────────────────────
export interface Question {
  id: string;
  level: QuestionLevel;
  question: string;
  points: number;
  correctAnswer: string;
  distractors: { text: string; closeness: Naehe }[];
  explanationAfterAnswer: string;
}

export interface CalculationTemplate {
  id: string;
  level: "apply" | "master";
  points: number;
  questionTemplate: string;
  parameters: Record<string, { min: number; max: number }>;
  solutionFormula: string;
  distractorFormulas: string[];
  explanationTemplate: string;
  unit?: string;
  /** Superset der Spec: erhält die Rundungssemantik der Engine (Default "integer"). */
  rounding?: "integer";
}

export interface LearningModule {
  id: string;
  blockId: string;
  title: string;
  unlockLevel: number;
  prerequisites: string[];
  type: ModuleType;
  pedagogy: Pedagogy;
  explanations: Record<Audience, string>;
  questions: Question[];
  calculationTemplates?: CalculationTemplate[];
  glossaryTerms: string[];
  teacherSupport?: TeacherSupport;
  parentSupport?: ParentSupport;
}

// ── Speicher-/Autorenform (LangText) ────────────────────────────────────────
export interface QuestionSource {
  id: string;
  level: QuestionLevel;
  question: LangText;
  points: number;
  correctAnswer: LangText;
  distractors: { text: LangText; closeness: Naehe }[];
  explanationAfterAnswer: LangText;
}

export interface CalculationTemplateSource {
  id: string;
  level: "apply" | "master";
  points: number;
  questionTemplate: LangText;
  parameters: Record<string, { min: number; max: number }>;
  solutionFormula: string;
  distractorFormulas: string[];
  explanationTemplate: LangText;
  unit?: string;
  rounding?: "integer";
}

export interface LearningModuleSource {
  id: string;
  blockId: string;
  title: LangText;
  unlockLevel: number;
  prerequisites: string[];
  type: ModuleType;
  pedagogy: PedagogySource;
  explanations: Record<Audience, LangText>;
  questions: QuestionSource[];
  calculationTemplates?: CalculationTemplateSource[];
  glossaryTerms: string[];
  teacherSupport?: TeacherSupportSource;
  parentSupport?: ParentSupportSource;
  /** Migrations-Marker: true → aus Legacy-Inhalten erzeugt, v2-Felder sind Platzhalter. */
  _legacy?: boolean;
  /** Felder, die noch redaktionell befüllt werden müssen (von migrate.ts gesetzt). */
  _needsContent?: string[];
}
