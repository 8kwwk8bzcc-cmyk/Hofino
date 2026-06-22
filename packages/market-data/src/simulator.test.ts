import { describe, it, expect } from "vitest";
import { SimulatedMarketDataProvider } from "./simulator.js";

describe("SimulatedMarketDataProvider", () => {
  it("liefert deterministische Kurse zum selben Zeitpunkt", () => {
    const sim = new SimulatedMarketDataProvider([{ id: "AAPL", basePriceCents: 20000 }]);
    const d = new Date("2026-06-22T10:00:00Z");
    expect(sim.priceAtCents("AAPL", d)).toBe(sim.priceAtCents("AAPL", d));
  });

  it("respektiert konfigurierten Basispreis bei Volatilität 0", () => {
    const sim = new SimulatedMarketDataProvider([
      { id: "FLAT", basePriceCents: 10000, volatility: 0 },
    ]);
    expect(sim.priceAtCents("FLAT", new Date("2026-01-01T00:00:00Z"))).toBe(10000);
    expect(sim.priceAtCents("FLAT", new Date("2026-12-31T23:00:00Z"))).toBe(10000);
  });

  it("variiert über die Stunden", () => {
    const sim = new SimulatedMarketDataProvider([{ id: "AAPL", basePriceCents: 20000 }]);
    const prices = new Set<number>();
    for (let h = 0; h < 48; h++) {
      prices.add(sim.priceAtCents("AAPL", new Date(Date.UTC(2026, 5, 22, h))));
    }
    expect(prices.size).toBeGreaterThan(5);
  });

  it("getHourlyPrices richtet asOf auf die Stunde aus und liefert je ID einen Punkt", async () => {
    const clock = () => new Date("2026-06-22T10:37:00Z");
    const sim = new SimulatedMarketDataProvider(
      [{ id: "AAPL", basePriceCents: 20000 }],
      clock
    );
    const points = await sim.getHourlyPrices(["AAPL", "MSFT"]);
    expect(points).toHaveLength(2);
    expect(points[0]?.asOf).toBe("2026-06-22T10:00:00.000Z");
    expect(points[0]?.priceCents).toBe(
      sim.priceAtCents("AAPL", new Date("2026-06-22T10:00:00Z"))
    );
    // Unbekannte ID (ohne Config) bekommt trotzdem einen positiven Kurs.
    expect(points[1]?.priceCents).toBeGreaterThan(0);
  });
});
