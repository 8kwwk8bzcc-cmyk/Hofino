// Depot-Engine: Kauf/Verkauf ganzer Stücke, 5 €-Ordergebühr, Cash-Verrechnung, avg_cost.
// Reine Funktionen: nehmen einen Zustand entgegen und geben einen neuen zurück (immutable).

import { ORDER_FEE_CENTS, START_CAPITAL_CENTS, type Cents } from "./money.js";

export interface Holding {
  instrumentId: string;
  /** Ganze Stücke (keine Bruchteile). */
  quantity: number;
  /** Durchschnittlicher Kaufkurs je Stück, ohne Gebühr. */
  avgCostCents: Cents;
}

export interface Portfolio {
  cashCents: Cents;
  holdings: readonly Holding[];
}

export type OrderError = "invalid_quantity" | "insufficient_funds" | "insufficient_holdings";

export interface Order {
  instrumentId: string;
  side: "buy" | "sell";
  quantity: number;
  priceCents: Cents;
  feeCents: Cents;
  /** Kurswert ohne Gebühr (priceCents * quantity). */
  grossCents: Cents;
  /** Veränderung des Verrechnungskontos (negativ bei Kauf). */
  cashDeltaCents: Cents;
}

export type OrderResult =
  | { ok: true; portfolio: Portfolio; order: Order }
  | { ok: false; reason: OrderError };

/** Neues Depot mit Startkapital (Default: 5.000 €). */
export function createPortfolio(cashCents: Cents = START_CAPITAL_CENTS): Portfolio {
  return { cashCents, holdings: [] };
}

function isWholePositive(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0;
}

function findHolding(p: Portfolio, instrumentId: string): Holding | undefined {
  return p.holdings.find((h) => h.instrumentId === instrumentId);
}

/** Kauf: ganze Stücke, sofort zum übergebenen Kurs, 5 € Gebühr, Verrechnung gegen Cash. */
export function buy(
  p: Portfolio,
  instrumentId: string,
  quantity: number,
  priceCents: Cents
): OrderResult {
  if (!isWholePositive(quantity)) return { ok: false, reason: "invalid_quantity" };

  const grossCents = priceCents * quantity;
  const totalCents = grossCents + ORDER_FEE_CENTS;
  if (p.cashCents < totalCents) return { ok: false, reason: "insufficient_funds" };

  const existing = findHolding(p, instrumentId);
  let holdings: Holding[];
  if (existing) {
    const newQty = existing.quantity + quantity;
    const newAvg = Math.round(
      (existing.avgCostCents * existing.quantity + priceCents * quantity) / newQty
    );
    holdings = p.holdings.map((h) =>
      h.instrumentId === instrumentId ? { ...h, quantity: newQty, avgCostCents: newAvg } : h
    );
  } else {
    holdings = [...p.holdings, { instrumentId, quantity, avgCostCents: priceCents }];
  }

  const order: Order = {
    instrumentId,
    side: "buy",
    quantity,
    priceCents,
    feeCents: ORDER_FEE_CENTS,
    grossCents,
    cashDeltaCents: -totalCents,
  };
  return { ok: true, portfolio: { cashCents: p.cashCents - totalCents, holdings }, order };
}

/** Verkauf: ganze Stücke aus dem Bestand, 5 € Gebühr, Erlös (brutto − Gebühr) aufs Cash. */
export function sell(
  p: Portfolio,
  instrumentId: string,
  quantity: number,
  priceCents: Cents
): OrderResult {
  if (!isWholePositive(quantity)) return { ok: false, reason: "invalid_quantity" };

  const existing = findHolding(p, instrumentId);
  if (!existing || existing.quantity < quantity) {
    return { ok: false, reason: "insufficient_holdings" };
  }

  const grossCents = priceCents * quantity;
  const proceedsCents = grossCents - ORDER_FEE_CENTS;
  // Falls die Gebühr den Erlös übersteigt und das Cash nicht reicht, ablehnen.
  if (p.cashCents + proceedsCents < 0) return { ok: false, reason: "insufficient_funds" };

  const remaining = existing.quantity - quantity;
  const holdings =
    remaining > 0
      ? p.holdings.map((h) =>
          h.instrumentId === instrumentId ? { ...h, quantity: remaining } : h
        )
      : p.holdings.filter((h) => h.instrumentId !== instrumentId);

  const order: Order = {
    instrumentId,
    side: "sell",
    quantity,
    priceCents,
    feeCents: ORDER_FEE_CENTS,
    grossCents,
    cashDeltaCents: proceedsCents,
  };
  return { ok: true, portfolio: { cashCents: p.cashCents + proceedsCents, holdings }, order };
}

/** Marktwert der Positionen (ohne Cash) zu gegebenen Kursen. */
export function holdingsValueCents(
  p: Portfolio,
  priceByInstrument: ReadonlyMap<string, Cents>
): Cents {
  let value = 0;
  for (const h of p.holdings) {
    value += (priceByInstrument.get(h.instrumentId) ?? 0) * h.quantity;
  }
  return value;
}

/** Gesamter Depotwert = Cash + Marktwert der Positionen. */
export function depotValueCents(
  p: Portfolio,
  priceByInstrument: ReadonlyMap<string, Cents>
): Cents {
  return p.cashCents + holdingsValueCents(p, priceByInstrument);
}
