// SimulatedMarketDataProvider: deterministische, realistische Stundenkurse für den MVP.
// Ohne Netzwerk, ohne Vertrag – die App ist damit vollständig entwickel- und testbar.

import {
  DEFAULT_VOLATILITY,
  deriveBaseCents,
  floorToHourMs,
  priceAtCents,
} from "./price-model.js";
import type { MarketDataProvider, PricePoint } from "./provider.js";

export interface SimInstrument {
  id: string;
  /** Basispreis in Cent. Fehlt er, wird er deterministisch aus der ID abgeleitet. */
  basePriceCents?: number;
  /** Schwankungsbreite (Default 0,12 = ±12 %). */
  volatility?: number;
}

export class SimulatedMarketDataProvider implements MarketDataProvider {
  private readonly byId: Map<string, SimInstrument>;
  private readonly now: () => Date;

  constructor(instruments: readonly SimInstrument[] = [], now: () => Date = () => new Date()) {
    this.byId = new Map(instruments.map((i) => [i.id, i]));
    this.now = now;
  }

  /** Deterministischer Kurs (Cent) eines Instruments zu einem Zeitpunkt. */
  priceAtCents(instrumentId: string, date: Date): number {
    const cfg = this.byId.get(instrumentId);
    const base = cfg?.basePriceCents ?? deriveBaseCents(instrumentId);
    const vol = cfg?.volatility ?? DEFAULT_VOLATILITY;
    return priceAtCents(instrumentId, base, vol, date.getTime());
  }

  async getHourlyPrices(instrumentIds: string[]): Promise<PricePoint[]> {
    const atMs = floorToHourMs(this.now().getTime());
    const asOf = new Date(atMs).toISOString();
    const at = new Date(atMs);
    return instrumentIds.map((instrumentId) => ({
      instrumentId,
      priceCents: this.priceAtCents(instrumentId, at),
      asOf,
    }));
  }
}
