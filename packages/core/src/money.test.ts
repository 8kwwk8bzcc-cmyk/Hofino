import { describe, it, expect } from "vitest";
import { euro, formatEuros, ORDER_FEE_CENTS, START_CAPITAL_CENTS } from "./money.js";

describe("money", () => {
  it("Konstanten entsprechen dem Konzept", () => {
    expect(ORDER_FEE_CENTS).toBe(500); // 5 €
    expect(START_CAPITAL_CENTS).toBe(500_000); // 5.000 €
  });

  it("euro() wandelt in Cent", () => {
    expect(euro(120)).toBe(12_000);
    expect(euro(5)).toBe(500);
    expect(euro(0.01)).toBe(1);
  });

  it("formatEuros() formatiert deutsch", () => {
    expect(formatEuros(500_000)).toBe("5.000,00 €");
    expect(formatEuros(48_500)).toBe("485,00 €");
    expect(formatEuros(12_057)).toBe("120,57 €");
    expect(formatEuros(0)).toBe("0,00 €");
    expect(formatEuros(-300)).toBe("-3,00 €");
  });
});
