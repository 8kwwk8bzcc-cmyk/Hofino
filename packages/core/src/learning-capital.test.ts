import { describe, it, expect } from "vitest";
import {
  grantLearningCapital,
  totalLearningCapitalCents,
  LEARNING_CAPITAL_CENTS,
  type CapitalGrant,
} from "./learning-capital.js";

describe("learning-capital", () => {
  it("Beträge entsprechen dem Konzept", () => {
    expect(LEARNING_CAPITAL_CENTS).toEqual({
      module_done: 50_000, // +500 €
      quiz_perfect: 50_000, // +500 €
      themenblock: 100_000, // +1.000 €
      milestone: 200_000, // +2.000 €
    });
  });

  it("gewährt je Ereignis genau einmal", () => {
    let grants: readonly CapitalGrant[] = [];
    const first = grantLearningCapital(grants, "module_done", "m1");
    expect(first.addedCents).toBe(50_000);
    grants = first.grants;

    const again = grantLearningCapital(grants, "module_done", "m1");
    expect(again.addedCents).toBe(0); // Wiederholung bringt nichts
    expect(again.grants).toHaveLength(1);

    const other = grantLearningCapital(grants, "module_done", "m2");
    expect(other.addedCents).toBe(50_000); // anderes Modul zählt
    grants = other.grants;

    expect(totalLearningCapitalCents(grants)).toBe(100_000);
  });

  it("verschiedene Ereignistypen auf dieselbe refId sind unabhängig", () => {
    let grants: readonly CapitalGrant[] = [];
    grants = grantLearningCapital(grants, "module_done", "m1").grants;
    const perfect = grantLearningCapital(grants, "quiz_perfect", "m1");
    expect(perfect.addedCents).toBe(50_000);
    expect(totalLearningCapitalCents(perfect.grants)).toBe(100_000);
  });
});
