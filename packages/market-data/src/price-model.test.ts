import { describe, it, expect } from "vitest";
import {
  hashString,
  priceAtCents,
  floorToHourMs,
  hourIndex,
  deriveBaseCents,
  DEFAULT_VOLATILITY,
} from "./price-model.js";

describe("price-model", () => {
  it("hashString ist deterministisch und unterscheidet Eingaben", () => {
    expect(hashString("AAPL")).toBe(hashString("AAPL"));
    expect(hashString("AAPL")).not.toBe(hashString("MSFT"));
    expect(hashString("AAPL")).toBeGreaterThanOrEqual(0);
  });

  it("floorToHourMs richtet auf den Stundenbeginn aus", () => {
    const t = Date.parse("2026-06-22T10:37:42.500Z");
    expect(floorToHourMs(t)).toBe(Date.parse("2026-06-22T10:00:00.000Z"));
    expect(hourIndex(t)).toBe(Math.floor(t / 3_600_000));
  });

  it("deriveBaseCents ist deterministisch und im Bereich 10 €–610 €", () => {
    const b = deriveBaseCents("xyz");
    expect(b).toBe(deriveBaseCents("xyz"));
    expect(b).toBeGreaterThanOrEqual(1000);
    expect(b).toBeLessThan(61000);
  });

  it("priceAtCents ist deterministisch", () => {
    const t = Date.parse("2026-06-22T10:00:00Z");
    expect(priceAtCents("AAPL", 20000, 0.12, t)).toBe(priceAtCents("AAPL", 20000, 0.12, t));
  });

  it("bleibt in [base*(1-vol), base*(1+vol)] und positiv", () => {
    const base = 20000;
    const vol = DEFAULT_VOLATILITY;
    const start = Date.parse("2026-06-22T00:00:00Z");
    for (let h = 0; h < 24 * 30; h++) {
      const p = priceAtCents("AAPL", base, vol, start + h * 3_600_000);
      expect(p).toBeGreaterThanOrEqual(Math.floor(base * (1 - vol)));
      expect(p).toBeLessThanOrEqual(Math.ceil(base * (1 + vol)));
    }
  });

  it("ohne Volatilität entspricht der Kurs exakt dem Basispreis", () => {
    expect(priceAtCents("AAPL", 12345, 0, Date.now())).toBe(12345);
  });
});
