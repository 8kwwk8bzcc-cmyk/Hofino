// Wissenslevel (XP-Kurve §13) + Auszeichnungs-Bewertung (Bronze/Silber/Gold). Reine Funktionen.
import type { Rang } from "./types.js";

/** Gesamt-XP, die man fuer Level L braucht: 100 * L * (L+1) / 2. */
export function xpSchwelle(level: number): number {
  return (100 * level * (level + 1)) / 2;
}

export interface LevelInfo {
  level: number;
  xpGesamt: number;
  xpImLevel: number;
  xpFuerNaechstes: number;
  fortschritt: number; // 0..1 bis zum naechsten Level
}

export function wissenslevel(xpGesamt: number): LevelInfo {
  let level = 0;
  while (xpSchwelle(level + 1) <= xpGesamt) level++;
  const basis = xpSchwelle(level);
  const next = xpSchwelle(level + 1);
  const spanne = next - basis;
  return {
    level,
    xpGesamt,
    xpImLevel: xpGesamt - basis,
    xpFuerNaechstes: spanne,
    fortschritt: spanne > 0 ? (xpGesamt - basis) / spanne : 0,
  };
}

export type Metrik = "korrekte_antworten" | "konzepte_abgeschlossen" | "wissenslevel";

export interface AuszeichnungDef {
  id: string;
  titel: string;
  metrik: Metrik;
  schwellen: { bronze: number; silber: number; gold: number };
}

export const AUSZEICHNUNGEN: AuszeichnungDef[] = [
  { id: "fleissig", titel: "Fleißig gelernt", metrik: "korrekte_antworten", schwellen: { bronze: 10, silber: 50, gold: 200 } },
  { id: "sammler", titel: "Konzept-Sammler", metrik: "konzepte_abgeschlossen", schwellen: { bronze: 1, silber: 5, gold: 20 } },
  { id: "aufstieg", titel: "Wissensaufstieg", metrik: "wissenslevel", schwellen: { bronze: 3, silber: 7, gold: 12 } },
];

export function rangFuer(wert: number, s: { bronze: number; silber: number; gold: number }): Rang | null {
  if (wert >= s.gold) return "gold";
  if (wert >= s.silber) return "silber";
  if (wert >= s.bronze) return "bronze";
  return null;
}

export interface LernStats {
  korrekteAntworten: number;
  konzepteAbgeschlossen: number;
  wissenslevel: number;
}

export interface AuszeichnungStatus {
  id: string;
  titel: string;
  rang: Rang | null;
  wert: number;
  naechsteSchwelle: number | null; // null = Gold erreicht
}

export function bewerteAuszeichnungen(stats: LernStats): AuszeichnungStatus[] {
  const wertVon: Record<Metrik, number> = {
    korrekte_antworten: stats.korrekteAntworten,
    konzepte_abgeschlossen: stats.konzepteAbgeschlossen,
    wissenslevel: stats.wissenslevel,
  };
  return AUSZEICHNUNGEN.map((a) => {
    const wert = wertVon[a.metrik];
    const rang = rangFuer(wert, a.schwellen);
    const naechsteSchwelle =
      rang === "gold" ? null : rang === "silber" ? a.schwellen.gold : rang === "bronze" ? a.schwellen.silber : a.schwellen.bronze;
    return { id: a.id, titel: a.titel, rang, wert, naechsteSchwelle };
  });
}
