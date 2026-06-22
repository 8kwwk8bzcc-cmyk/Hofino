// Lädt die redaktionellen Seed-Inhalte (2 Beispiel-Konzepte) und bietet einfache Zugriffe.
import raw from "./seed.json";
import type { Frage, InhaltsSeed, Konzept, Stufe, Themenblock, Vorlage } from "./types.js";

export const SEED = raw as unknown as InhaltsSeed;

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
