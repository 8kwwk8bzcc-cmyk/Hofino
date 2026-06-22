import { describe, it, expect } from "vitest";
import {
  awardKnowledgePoints,
  totalKnowledgePoints,
  KNOWLEDGE_POINTS,
  type PointsAward,
} from "./knowledge-points.js";

describe("knowledge-points", () => {
  it("Punktwerte entsprechen dem Konzept", () => {
    expect(KNOWLEDGE_POINTS).toEqual({
      module_done: 100,
      quiz_passed: 50,
      quiz_perfect_bonus: 100,
      themenblock: 300,
      milestone: 500,
    });
  });

  it("perfektes Quiz = bestanden (+50) und Bonus (+100) = 150 Punkte", () => {
    let awards: readonly PointsAward[] = [];
    awards = awardKnowledgePoints(awards, "quiz_passed", "q1").awards;
    awards = awardKnowledgePoints(awards, "quiz_perfect_bonus", "q1").awards;
    expect(totalKnowledgePoints(awards)).toBe(150);
  });

  it("vergibt je Ereignis nur einmal", () => {
    let awards: readonly PointsAward[] = [];
    const first = awardKnowledgePoints(awards, "module_done", "m1");
    expect(first.addedPoints).toBe(100);
    awards = first.awards;
    const again = awardKnowledgePoints(awards, "module_done", "m1");
    expect(again.addedPoints).toBe(0);
    expect(again.awards).toHaveLength(1);
  });
});
