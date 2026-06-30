// Lädt die redaktionellen Inhalte (Beispiel-Seed + Themenblock-Dateien) und bietet Zugriffe.
import raw from "./seed.json";
import geldGrundlagen from "./content/geld_grundlagen.json";
import unternehmenAktien from "./content/unternehmen_aktien.json";
import risikoEtf from "./content/risiko_etf.json";
import depotKosten from "./content/depot_kosten.json";
import haltungLangfrist from "./content/haltung_langfrist.json";
import type { Frage, InhaltsSeed, Konzept, Stufe, Themenblock, Vorlage, LearningModule, LearningModuleSource } from "./types.js";
import { fromLegacyKonzept, resolveModule } from "./migrate.js";

const QUELLEN = [
  raw,
  geldGrundlagen,
  unternehmenAktien,
  risikoEtf,
  depotKosten,
  haltungLangfrist,
] as unknown as InhaltsSeed[];

function mergeById<T extends { id: string }>(listen: T[][]): T[] {
  const map = new Map<string, T>();
  for (const liste of listen) for (const item of liste) map.set(item.id, item);
  return [...map.values()];
}

export const SEED: InhaltsSeed = {
  themenbloecke: mergeById(QUELLEN.map((q) => q.themenbloecke ?? [])),
  konzepte: mergeById(QUELLEN.map((q) => q.konzepte ?? [])),
  fragen: mergeById(QUELLEN.map((q) => q.fragen ?? [])),
  vorlagen: mergeById(QUELLEN.map((q) => q.vorlagen ?? [])),
};

export function alleThemenbloecke(): Themenblock[] {
  return SEED.themenbloecke;
}

export function alleKonzepte(): Konzept[] {
  return SEED.konzepte;
}

export function konzeptById(id: string): Konzept | undefined {
  return SEED.konzepte.find((k) => k.id === id);
}

export function fragenFuer(konzeptId: string, stufe?: Stufe): Frage[] {
  return SEED.fragen.filter((f) => f.konzept_id === konzeptId && (stufe === undefined || f.stufe === stufe));
}

export function vorlagenFuer(konzeptId: string, stufe?: Stufe): Vorlage[] {
  return SEED.vorlagen.filter((v) => v.konzept_id === konzeptId && (stufe === undefined || v.stufe === stufe));
}

// ── Neue Bildungsarchitektur (v2): Legacy-Inhalte als LearningModule(Source) ──
// Solange die Inhalte nicht blockweise neu geschrieben sind, werden sie über
// fromLegacyKonzept() adaptiert (mit markierten Platzhaltern für v2-Felder).

/** Alle Konzepte als v2-Source-Module (LangText, mit Migrations-Markern). */
export function alleModuleSource(): LearningModuleSource[] {
  return SEED.konzepte.map((k) => fromLegacyKonzept(k, fragenFuer(k.id), vorlagenFuer(k.id)));
}

/** Alle Module app-facing aufgelöst (string), Default-Sprache de. */
export function alleModule(lang: "de" | "en" = "de"): LearningModule[] {
  return alleModuleSource().map((m) => resolveModule(m, lang));
}

export function modulById(id: string, lang: "de" | "en" = "de"): LearningModule | undefined {
  const k = konzeptById(id);
  return k ? resolveModule(fromLegacyKonzept(k, fragenFuer(k.id), vorlagenFuer(k.id)), lang) : undefined;
}

// ── v2-Content-Import (blockweise JSON unter ./content/v2/) ───────────────────
// Format je Datei: LearningModuleSource[] (siehe content/v2/README.md). Sobald ein
// Block geliefert ist: JSON-Datei anlegen, hier importieren und in V2_QUELLEN eintragen.
// Frischer Lernpfad → v2 ersetzt Legacy pro Block; gemischter Stand bleibt valide.
const V2_QUELLEN: LearningModuleSource[][] = [
  // import tbGeld from "./content/v2/tb_geld_wert_entscheidungen.json";
  // tbGeld as unknown as LearningModuleSource[],
];

/** Alle bereits gelieferten v2-Module (LangText, dedupliziert per id). */
export function v2ModuleSources(): LearningModuleSource[] {
  return mergeById(V2_QUELLEN);
}

/**
 * Bevorzugt v2-Inhalt, fällt für noch nicht gelieferte IDs auf die Legacy-Adaption zurück.
 * Während der blockweisen Migration die empfohlene Quelle der Wahrheit.
 */
export function alleModuleSourceMerged(): LearningModuleSource[] {
  const merged = new Map<string, LearningModuleSource>();
  for (const m of alleModuleSource()) merged.set(m.id, m);
  for (const m of v2ModuleSources()) merged.set(m.id, m);
  return [...merged.values()];
}
