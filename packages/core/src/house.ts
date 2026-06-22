// Haus-System (nur Kindermodus): Fortschritt durch Lernen & Meilensteine, nicht durch Glück.
// Schlechte Depotentwicklung lässt das Haus NICHT einstürzen – Stufe steigt nur, fällt nie.

export type HouseStage =
  | "grundstueck"
  | "fundament"
  | "waende"
  | "dach"
  | "erstes_haus"
  | "ausbauten";

export const HOUSE_STAGES: readonly HouseStage[] = [
  "grundstueck",
  "fundament",
  "waende",
  "dach",
  "erstes_haus",
  "ausbauten",
];

export interface HouseProgress {
  /** erstes Investment getätigt → Fundament */
  hasInvested: boolean;
  /** Anzahl abgeschlossener Lernmodule → ab 1: Wände */
  modulesCompleted: number;
  /** Risiko & Diversifikation verstanden → Dach */
  riskAndDiversificationUnderstood: boolean;
  /** abgeschlossene Themenblöcke → ab 1: Erstes Haus */
  themenbloeckeCompleted: number;
  /** erreichte große Meilensteine → ab 1: Ausbauten */
  milestonesReached: number;
}

/**
 * Aktuelle Haus-Stufe aus dem Fortschritt. Stufen sind sequenzielle Tore; da Fortschritt
 * nur wächst (nie schrumpft), ist die Stufe monoton steigend – kein Einsturz.
 */
export function houseStage(p: HouseProgress): HouseStage {
  const gates: ReadonlyArray<readonly [HouseStage, boolean]> = [
    ["fundament", p.hasInvested],
    ["waende", p.modulesCompleted >= 1],
    ["dach", p.riskAndDiversificationUnderstood],
    ["erstes_haus", p.themenbloeckeCompleted >= 1],
    ["ausbauten", p.milestonesReached >= 1],
  ];
  let stage: HouseStage = "grundstueck";
  for (const [next, unlocked] of gates) {
    if (!unlocked) break;
    stage = next;
  }
  return stage;
}
