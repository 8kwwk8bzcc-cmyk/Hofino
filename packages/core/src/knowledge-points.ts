// Wissenspunkte für die Wissensliga. Je Ereignis einmalig (kein Farmen durch Wiederholen).
// Perfektes Quiz = quiz_passed (+50) UND quiz_perfect_bonus (+100) als zwei Ereignisse.

export type KnowledgeSource =
  | "module_done"
  | "quiz_passed"
  | "quiz_perfect_bonus"
  | "themenblock"
  | "milestone";

export const KNOWLEDGE_POINTS: Record<KnowledgeSource, number> = {
  module_done: 100,
  quiz_passed: 50,
  quiz_perfect_bonus: 100,
  themenblock: 300,
  milestone: 500,
};

export interface PointsAward {
  source: KnowledgeSource;
  refId: string;
  points: number;
}

export interface PointsResult {
  awards: readonly PointsAward[];
  /** Tatsächlich neu vergebene Punkte (0, wenn das Ereignis schon vergeben war). */
  addedPoints: number;
}

/** Vergibt Wissenspunkte für (source, refId) – idempotent. */
export function awardKnowledgePoints(
  existing: readonly PointsAward[],
  source: KnowledgeSource,
  refId: string
): PointsResult {
  const already = existing.some((a) => a.source === source && a.refId === refId);
  if (already) return { awards: existing, addedPoints: 0 };
  const points = KNOWLEDGE_POINTS[source];
  return { awards: [...existing, { source, refId, points }], addedPoints: points };
}

/** Summe aller vergebenen Wissenspunkte. */
export function totalKnowledgePoints(awards: readonly PointsAward[]): number {
  return awards.reduce((sum, a) => sum + a.points, 0);
}
