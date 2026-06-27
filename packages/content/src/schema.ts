// Datenschemata für redaktionelle Inhalte: Lernmodule (Textkarten + Quiz) und Profile.
// Zwei Erklärungsebenen je Inhalt: Kind (10–15) und Eltern/Lehrer. Keine Anlageempfehlung.

export type ThemenblockId = "geld" | "unternehmen" | "etf-risiko" | "depot-langfristig";

export interface QuizQuestion {
  question: string;
  /** 2–4 Antwortoptionen. */
  options: string[];
  /** Index der genau einen richtigen Antwort. */
  correctIndex: number;
}

export interface LearningModule {
  id: string; // z. B. "m01"
  order: number; // 1..20
  block: ThemenblockId;
  title: string;
  /** Kindgerechte Erklärung (10–15 Jahre). */
  child: string;
  /** Ein einfaches Beispiel. */
  example: string;
  /** Genauere Erklärung für Eltern/Lehrer. */
  expert: string;
  /** 3–5 Multiple-Choice-Fragen. */
  quiz: QuizQuestion[];
}

export interface CompanyProfile {
  ticker: string; // referenziert instruments.ticker
  name: string;
  whatDoes: string; // Was macht das Unternehmen?
  howEarns: string; // Wie verdient es Geld?
  products: string; // Welche Produkte kennt man?
  sector: string; // Branche
  competitors: string; // Wichtige Wettbewerber
  opportunities: string; // Chancen
  risks: string; // Risiken
  whyPriceMoves: string; // Warum kann der Kurs schwanken?
  dividend: string; // Zahlt das Unternehmen eine Dividende? (qualitativ, keine Renditezahl)
  dividendSchedule: string; // Wann wird gezahlt? (z. B. vierteljährlich / einmal im Jahr)
}

export interface EtfProfile {
  ticker: string;
  name: string;
  isin: string | null; // vor öffentlichem Start rechtlich zu verifizieren
  wkn: string | null;
  tracks: string; // Was bildet der ETF ab?
  region: string;
  sector: string;
  diversification: string; // Streuung
  costLogic: string; // Kostenlogik (z. B. TER)
  risks: string;
  dividend: string; // Ausschüttend oder thesaurierend?
}

// ─────────────────────────────────────────────────────────────────────────────
// Validierung (reine Funktionen → liefern Liste von Fehlermeldungen, leer = ok)
// ─────────────────────────────────────────────────────────────────────────────
function nonEmpty(label: string, value: string, errors: string[]): void {
  if (!value || value.trim().length === 0) errors.push(`${label} fehlt`);
}

export function validateQuestion(q: QuizQuestion, ctx: string): string[] {
  const errors: string[] = [];
  nonEmpty(`${ctx}: Frage`, q.question, errors);
  if (q.options.length < 2 || q.options.length > 4) {
    errors.push(`${ctx}: braucht 2–4 Optionen (hat ${q.options.length})`);
  }
  if (q.options.some((o) => !o || o.trim().length === 0)) {
    errors.push(`${ctx}: leere Option`);
  }
  if (new Set(q.options).size !== q.options.length) {
    errors.push(`${ctx}: doppelte Optionen`);
  }
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
    errors.push(`${ctx}: correctIndex ${q.correctIndex} außerhalb der Optionen`);
  }
  return errors;
}

export function validateModule(m: LearningModule): string[] {
  const errors: string[] = [];
  if (!/^m\d{2}$/.test(m.id)) errors.push(`${m.id}: id muss Form "m01" haben`);
  if (!Number.isInteger(m.order) || m.order < 1 || m.order > 20) {
    errors.push(`${m.id}: order ${m.order} außerhalb 1..20`);
  }
  nonEmpty(`${m.id}: title`, m.title, errors);
  nonEmpty(`${m.id}: child`, m.child, errors);
  nonEmpty(`${m.id}: example`, m.example, errors);
  nonEmpty(`${m.id}: expert`, m.expert, errors);
  if (m.quiz.length < 3 || m.quiz.length > 5) {
    errors.push(`${m.id}: braucht 3–5 Fragen (hat ${m.quiz.length})`);
  }
  m.quiz.forEach((q, i) => errors.push(...validateQuestion(q, `${m.id} Frage ${i + 1}`)));
  return errors;
}

export function validateModuleSet(modules: readonly LearningModule[]): string[] {
  const errors: string[] = [];
  modules.forEach((m) => errors.push(...validateModule(m)));
  const ids = modules.map((m) => m.id);
  if (new Set(ids).size !== ids.length) errors.push("doppelte Modul-IDs");
  const orders = modules.map((m) => m.order);
  if (new Set(orders).size !== orders.length) errors.push("doppelte order-Werte");
  return errors;
}

export function validateCompanyProfile(p: CompanyProfile): string[] {
  const errors: string[] = [];
  (
    ["name", "whatDoes", "howEarns", "products", "sector", "competitors", "opportunities", "risks", "whyPriceMoves", "dividend", "dividendSchedule"] as const
  ).forEach((f) => nonEmpty(`${p.ticker}: ${f}`, p[f], errors));
  nonEmpty(`Profil: ticker`, p.ticker, errors);
  return errors;
}

export function validateEtfProfile(p: EtfProfile): string[] {
  const errors: string[] = [];
  (["ticker", "name", "tracks", "region", "sector", "diversification", "costLogic", "risks", "dividend"] as const).forEach(
    (f) => nonEmpty(`${p.ticker}: ${f}`, p[f], errors)
  );
  return errors;
}
