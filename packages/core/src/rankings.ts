// Ranglisten: Performance, Gesamtkapital, Wissensliga. Top 10 erhalten Auszeichnungen.
// Reine Berechnung – im Produktivbetrieb serverseitig (Manipulationsschutz, siehe ARCHITECTURE.md).

import { START_CAPITAL_CENTS, type Cents } from "./money.js";

/**
 * Performance in Prozent: Gewinn/Verlust auf der Basis (Startkapital + Lernkapital).
 * equityCents ist der Depotwert nach Gebühren (Gebühren mindern bereits das Cash).
 */
export function performancePercent(equityCents: Cents, learningCapitalCents: Cents): number {
  const basis = START_CAPITAL_CENTS + learningCapitalCents;
  if (basis <= 0) return 0;
  return ((equityCents - basis) / basis) * 100;
}

export interface RankEntry {
  id: string;
  score: number;
}

export interface RankedEntry extends RankEntry {
  /** 1-basierter Rang. Gleiche Scores teilen sich den Rang (Competition Ranking). */
  rank: number;
  /** true, wenn der Rang in den Top N liegt. */
  awarded: boolean;
}

/**
 * Sortiert absteigend nach Score und vergibt Ränge (Competition-Ranking: gleiche Scores
 * teilen sich den Rang); Top N werden ausgezeichnet (Default 10).
 * BEWUSST SO: Bei Punktgleichstand auf Rang ≤ N werden ALLE Gleichplatzierten ausgezeichnet —
 * es können also mehr als N Auszeichnungen vergeben werden. Fair gegenüber Gleichstand,
 * kein willkürlicher Tie-Break (Review 2026-07-10, als gewollt dokumentiert + getestet).
 */
export function rank(entries: readonly RankEntry[], topN = 10): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const result: RankedEntry[] = [];
  let prevScore: number | null = null;
  let prevRank = 0;
  sorted.forEach((entry, index) => {
    const rk = prevScore !== null && entry.score === prevScore ? prevRank : index + 1;
    result.push({ ...entry, rank: rk, awarded: rk <= topN });
    prevScore = entry.score;
    prevRank = rk;
  });
  return result;
}
