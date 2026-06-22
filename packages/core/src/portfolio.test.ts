import { describe, it, expect } from "vitest";
import { euro } from "./money.js";
import {
  buy,
  sell,
  createPortfolio,
  depotValueCents,
  holdingsValueCents,
  type Portfolio,
} from "./portfolio.js";

describe("portfolio – Kauf", () => {
  it("Konzept-Beispiel: 4 Aktien à 120 € + 5 € Gebühr = 485 € Abzug", () => {
    const p = createPortfolio();
    const r = buy(p, "AAPL", 4, euro(120));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.grossCents).toBe(48_000);
    expect(r.order.feeCents).toBe(500);
    expect(r.order.cashDeltaCents).toBe(-48_500);
    expect(r.portfolio.cashCents).toBe(500_000 - 48_500); // 451.500
    expect(r.portfolio.holdings).toEqual([
      { instrumentId: "AAPL", quantity: 4, avgCostCents: 12_000 },
    ]);
  });

  it("lehnt zu teuren Kauf ab (insufficient_funds), Zustand unverändert", () => {
    const p = createPortfolio(euro(100));
    const r = buy(p, "AAPL", 1, euro(120));
    expect(r).toEqual({ ok: false, reason: "insufficient_funds" });
  });

  it("berücksichtigt die Gebühr an der Cash-Grenze", () => {
    // Kurswert exakt = Cash, aber Gebühr fehlt → Ablehnung.
    const p = createPortfolio(euro(120));
    expect(buy(p, "X", 1, euro(120)).ok).toBe(false);
    // Cash deckt Kurswert + Gebühr → ok.
    const p2 = createPortfolio(euro(125));
    const r = buy(p2, "X", 1, euro(120));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.portfolio.cashCents).toBe(0);
  });

  it("verbietet Bruchstücke und ungültige Mengen", () => {
    const p = createPortfolio();
    for (const q of [0, -1, 1.5, Number.NaN]) {
      expect(buy(p, "X", q, euro(10))).toEqual({ ok: false, reason: "invalid_quantity" });
    }
  });

  it("aktualisiert avg_cost beim Nachkauf (gewichteter Durchschnitt, ohne Gebühr)", () => {
    const p: Portfolio = createPortfolio();
    const r1 = buy(p, "X", 2, euro(100));
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = buy(r1.portfolio, "X", 2, euro(200));
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const h = r2.portfolio.holdings[0];
    expect(h?.quantity).toBe(4);
    expect(h?.avgCostCents).toBe(15_000); // (2*100 + 2*200)/4 = 150 €
  });
});

describe("portfolio – Verkauf", () => {
  it("verkauft Teilbestand, zieht 5 € Gebühr vom Erlös ab", () => {
    const bought = buy(createPortfolio(), "X", 5, euro(100));
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    const r = sell(bought.portfolio, "X", 2, euro(150));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.grossCents).toBe(30_000);
    expect(r.order.cashDeltaCents).toBe(29_500); // 300 € − 5 € Gebühr
    expect(r.portfolio.holdings[0]?.quantity).toBe(3);
    // avg_cost bleibt beim Verkauf unverändert
    expect(r.portfolio.holdings[0]?.avgCostCents).toBe(10_000);
  });

  it("entfernt die Position bei Komplettverkauf", () => {
    const bought = buy(createPortfolio(), "X", 3, euro(100));
    if (!bought.ok) return;
    const r = sell(bought.portfolio, "X", 3, euro(120));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.portfolio.holdings).toEqual([]);
  });

  it("lehnt Verkauf über den Bestand hinaus ab (insufficient_holdings)", () => {
    const bought = buy(createPortfolio(), "X", 1, euro(100));
    if (!bought.ok) return;
    expect(sell(bought.portfolio, "X", 2, euro(100))).toEqual({
      ok: false,
      reason: "insufficient_holdings",
    });
    expect(sell(bought.portfolio, "Y", 1, euro(100))).toEqual({
      ok: false,
      reason: "insufficient_holdings",
    });
  });
});

describe("portfolio – Bewertung", () => {
  it("depotValue = Cash + Marktwert der Positionen", () => {
    const bought = buy(createPortfolio(), "X", 2, euro(100));
    if (!bought.ok) return;
    const prices = new Map([["X", euro(130)]]);
    expect(holdingsValueCents(bought.portfolio, prices)).toBe(26_000);
    // Cash: 500.000 − (20.000 + 500) = 479.500; + 26.000 = 505.500
    expect(depotValueCents(bought.portfolio, prices)).toBe(479_500 + 26_000);
  });
});
