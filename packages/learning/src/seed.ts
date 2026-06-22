// Lädt die redaktionellen Inhalte (Beispiel-Seed + Themenblock-Dateien) und bietet Zugriffe.
import raw from "./seed.json";
import geldGrundlagen from "./content/geld_grundlagen.json";
import type { Frage, InhaltsSeed, Konzept, Stufe, Themenblock, Vorlage } from "./types.js";

const QUELLEN = [raw, geldGrundlagen] as unknown as InhaltsSeed[];

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
