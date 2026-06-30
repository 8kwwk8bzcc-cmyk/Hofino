// Inhalts-Zugriffe. Quelle der Wahrheit ist jetzt das gelieferte Curriculum v2
// (content-v2.ts → V2_MODULES). Die Legacy-API (Konzept/Frage/Vorlage/Themenblock)
// wird über die Bridge aus v2 erzeugt, damit App-Screens und Engine unverändert laufen.
// Die alten Seed-Dateien bleiben als SEED_LEGACY erhalten (Referenz/Tests, nicht live).
import raw from "./seed.json";
import geldGrundlagen from "./content/geld_grundlagen.json";
import unternehmenAktien from "./content/unternehmen_aktien.json";
import risikoEtf from "./content/risiko_etf.json";
import depotKosten from "./content/depot_kosten.json";
import haltungLangfrist from "./content/haltung_langfrist.json";
import type { Frage, InhaltsSeed, Konzept, Stufe, Themenblock, Vorlage, LearningModule, LearningModuleSource } from "./types.js";
import { fromLegacyKonzept, resolveModule, liftModuleToSource } from "./migrate.js";
import { V2_MODULES } from "./content-v2.js";
import { v2ToLegacySeed } from "./bridge.js";

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

/** Alte redaktionelle Inhalte (vor Curriculum v2). Nicht mehr live – Referenz/Tests. */
export const SEED_LEGACY: InhaltsSeed = {
  themenbloecke: mergeById(QUELLEN.map((q) => q.themenbloecke ?? [])),
  konzepte: mergeById(QUELLEN.map((q) => q.konzepte ?? [])),
  fragen: mergeById(QUELLEN.map((q) => q.fragen ?? [])),
  vorlagen: mergeById(QUELLEN.map((q) => q.vorlagen ?? [])),
};

/** Live-Inhalt: Curriculum v2 in Legacy-Form (für App-Screens + Quiz-Engine). */
export const SEED: InhaltsSeed = v2ToLegacySeed();

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

// ── v2 app-facing (LearningModule, string) ────────────────────────────────────

/** Alle 104 v2-Module (app-facing). lang aktuell nur "de" (Inhalte sind de). */
export function alleModule(_lang: "de" | "en" = "de"): LearningModule[] {
  return V2_MODULES;
}

export function modulById(id: string, _lang: "de" | "en" = "de"): LearningModule | undefined {
  return V2_MODULES.find((m) => m.id === id);
}

/** v2-Module als Source-Form (LangText) – für Validierung/Readiness. */
export function alleModuleSource(): LearningModuleSource[] {
  return V2_MODULES.map(liftModuleToSource);
}

export function v2ModuleSources(): LearningModuleSource[] {
  return alleModuleSource();
}

export function alleModuleSourceMerged(): LearningModuleSource[] {
  return alleModuleSource();
}

// ── Legacy-Adapter (alte Inhalte → v2-Source) – nur für Tests/Migrationsanalyse ──

/** Adaptiert die SEED_LEGACY-Konzepte in die v2-Source-Form (mit Platzhaltern). */
export function legacyAdaptedSources(): LearningModuleSource[] {
  return SEED_LEGACY.konzepte.map((k) =>
    fromLegacyKonzept(
      k,
      SEED_LEGACY.fragen.filter((f) => f.konzept_id === k.id),
      SEED_LEGACY.vorlagen.filter((v) => v.konzept_id === k.id)
    )
  );
}

/** Adaptiertes Legacy-Modul (app-facing). */
export function legacyAdaptedModule(id: string, lang: "de" | "en" = "de"): LearningModule | undefined {
  const k = SEED_LEGACY.konzepte.find((x) => x.id === id);
  if (!k) return undefined;
  return resolveModule(
    fromLegacyKonzept(
      k,
      SEED_LEGACY.fragen.filter((f) => f.konzept_id === k.id),
      SEED_LEGACY.vorlagen.filter((v) => v.konzept_id === k.id)
    ),
    lang
  );
}
