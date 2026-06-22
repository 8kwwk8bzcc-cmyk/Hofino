import { describe, it, expect } from "vitest";
import { evalFormel } from "./formel.js";

describe("evalFormel", () => {
  it("Grundrechenarten + Vorrang + Klammern", () => {
    expect(evalFormel("2 + 3 * 4", {})).toBe(14);
    expect(evalFormel("(2 + 3) * 4", {})).toBe(20);
    expect(evalFormel("10 - 2 - 3", {})).toBe(5);
    expect(evalFormel("-5 + 2", {})).toBe(-3);
  });

  it("Variablen + Seed-Formeln", () => {
    expect(evalFormel("n * preis + 5", { n: 4, preis: 120 })).toBe(485);
    expect(evalFormel("n * (verkauf - kauf) - 10", { n: 3, kauf: 20, verkauf: 50 })).toBe(80);
  });

  it("wirft bei unbekannter Variable / ungültigem Zeichen", () => {
    expect(() => evalFormel("x + 1", {})).toThrow();
    expect(() => evalFormel("2 % 3", {})).toThrow();
  });
});
