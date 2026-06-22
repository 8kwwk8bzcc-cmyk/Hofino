// @hofino/market-data – Kursdaten-Abstraktion. Kein Code außerhalb dieses Pakets kennt einen
// konkreten Anbieter. MVP = Simulator (M3); später lizenzierter, verzögerter Feed.

export interface PricePoint {
  instrumentId: string;
  priceCents: number;
  asOf: string;
}

export interface MarketDataProvider {
  /** Liefert die aktuellen Stundenkurse für alle gehandelten Instrumente. */
  getHourlyPrices(instrumentIds: string[]): Promise<PricePoint[]>;
}
