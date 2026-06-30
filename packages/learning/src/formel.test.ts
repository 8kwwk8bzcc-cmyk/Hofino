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

  it("unterstützt die Funktions-Whitelist (ceil/floor/round/abs/min/max/pow)", () => {
    expect(evalFormel("ceil(ziel / betrag)", { ziel: 100, betrag: 30 })).toBe(4);
    expect(evalFormel("floor(budget / preis)", { budget: 100, preis: 30 })).toBe(3);
    expect(evalFormel("round(7 / 2)", {})).toBe(4);
    expect(evalFormel("abs(kauf - verkauf)", { kauf: 50, verkauf: 20 })).toBe(30);
    expect(evalFormel("max(a, b)", { a: 3, b: 9 })).toBe(9);
    expect(evalFormel("min(a, b) + 1", { a: 3, b: 9 })).toBe(4);
    expect(evalFormel("pow(betrag, 2)", { betrag: 5 })).toBe(25);
  });

  it("wirft bei unbekannter Funktion", () => {
    expect(() => evalFormel("sqrt(4)", {})).toThrow();
  });
});
