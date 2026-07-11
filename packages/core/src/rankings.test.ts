import { describe, it, expect } from "vitest";
import { performancePercent, rank } from "./rankings.js";
import { euro } from "./money.js";

describe("rankings – Performance", () => {
  it("0 % am Start (Depotwert = Startkapital, kein Lernkapital)", () => {
    expect(performancePercent(500_000, 0)).toBeCloseTo(0);
  });

  it("Gewinn auf Basis Startkapital", () => {
    expect(performancePercent(550_000, 0)).toBeCloseTo(10);
  });

  it("Lernkapital erhöht die Basis", () => {
    // Basis = 5.000 € + 500 € = 5.500 €; Depotwert 5.500 € → 0 %
    expect(performancePercent(550_000, euro(500))).toBeCloseTo(0);
    // Depotwert 6.050 € auf Basis 5.500 € → +10 %
    expect(performancePercent(605_000, euro(500))).toBeCloseTo(10);
  });

  it("Verlust ergibt negativen Wert", () => {
    expect(performancePercent(450_000, 0)).toBeCloseTo(-10);
  });
});

describe("rankings – rank()", () => {
  it("sortiert absteigend und vergibt 1-basierte Ränge", () => {
    const r = rank([
      { id: "a", score: 10 },
      { id: "b", score: 30 },
      { id: "c", score: 20 },
    ]);
    expect(r.map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(r.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("gleiche Scores teilen sich den Rang (Competition Ranking)", () => {
    const r = rank([
      { id: "a", score: 50 },
      { id: "b", score: 50 },
      { id: "c", score: 10 },
    ]);
    expect(r.map((e) => e.rank)).toEqual([1, 1, 3]);
  });

  it("zeichnet nur die Top N aus", () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({ id: `u${i}`, score: 100 - i }));
    const r = rank(entries, 10);
    expect(r.filter((e) => e.awarded)).toHaveLength(10);
    expect(r[9]?.awarded).toBe(true);
    expect(r[10]?.awarded).toBe(false);
  });
});

// Review 2026-07-10: Gleichstand-Verhalten explizit dokumentieren — bei Punktgleichheit
// auf dem letzten Auszeichnungs-Rang erhalten ALLE Gleichplatzierten die Auszeichnung.
describe("rank – Gleichstand auf dem letzten Auszeichnungsrang", () => {
  it("zeichnet alle Punktgleichen auf Rang ≤ topN aus (kann > topN Auszeichnungen ergeben)", () => {
    const entries = [
      { id: "a", score: 100 },
      { id: "b", score: 90 },
      { id: "c", score: 90 },
      { id: "d", score: 90 },
      { id: "e", score: 80 },
    ];
    const ranked = rank(entries, 2);
    // a=1, b/c/d teilen Rang 2 → alle vier ausgezeichnet, e=Rang 5 nicht.
    expect(ranked.filter((r) => r.awarded).map((r) => r.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(ranked.find((r) => r.id === "e")?.awarded).toBe(false);
    expect(ranked.find((r) => r.id === "e")?.rank).toBe(5);
  });
});
