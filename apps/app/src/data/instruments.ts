// Lokaler Instrument-Bestand (spiegelt supabase/seed.sql) mit Basispreisen für den Simulator.
// Später kommt diese Liste aus Supabase (instruments + price_snapshots).
export interface Instrument {
  id: string;
  ticker: string;
  name: string;
  type: "stock" | "etf";
  sector: string;
  country: string;
  basePriceCents: number;
}

export const INSTRUMENTS: Instrument[] = [
  { id: "AAPL", ticker: "AAPL", name: "Apple", type: "stock", sector: "Technologie", country: "US", basePriceCents: 21000 },
  { id: "MSFT", ticker: "MSFT", name: "Microsoft", type: "stock", sector: "Technologie", country: "US", basePriceCents: 42000 },
  { id: "AMZN", ticker: "AMZN", name: "Amazon", type: "stock", sector: "Konsum", country: "US", basePriceCents: 19000 },
  { id: "GOOGL", ticker: "GOOGL", name: "Alphabet", type: "stock", sector: "Kommunikation", country: "US", basePriceCents: 17000 },
  { id: "NVDA", ticker: "NVDA", name: "Nvidia", type: "stock", sector: "Technologie", country: "US", basePriceCents: 12000 },
  { id: "TSLA", ticker: "TSLA", name: "Tesla", type: "stock", sector: "Konsum", country: "US", basePriceCents: 25000 },
  { id: "SAP", ticker: "SAP", name: "SAP", type: "stock", sector: "Technologie", country: "DE", basePriceCents: 22000 },
  { id: "SIE", ticker: "SIE", name: "Siemens", type: "stock", sector: "Industrie", country: "DE", basePriceCents: 19000 },
  { id: "VOW3", ticker: "VOW3", name: "Volkswagen", type: "stock", sector: "Konsum", country: "DE", basePriceCents: 9500 },
  { id: "ALV", ticker: "ALV", name: "Allianz", type: "stock", sector: "Finanzen", country: "DE", basePriceCents: 30000 },
  { id: "ADS", ticker: "ADS", name: "Adidas", type: "stock", sector: "Konsum", country: "DE", basePriceCents: 22000 },
  { id: "MBG", ticker: "MBG", name: "Mercedes-Benz Group", type: "stock", sector: "Konsum", country: "DE", basePriceCents: 6000 },
  { id: "NESN", ticker: "NESN", name: "Nestlé", type: "stock", sector: "Konsumgüter", country: "CH", basePriceCents: 8500 },
  { id: "MC", ticker: "MC", name: "LVMH", type: "stock", sector: "Konsum", country: "FR", basePriceCents: 65000 },
  { id: "IWDA", ticker: "IWDA", name: "iShares Core MSCI World", type: "etf", sector: "Welt", country: "Global", basePriceCents: 9500 },
  { id: "CSPX", ticker: "CSPX", name: "iShares Core S&P 500", type: "etf", sector: "USA", country: "US", basePriceCents: 55000 },
  { id: "EIMI", ticker: "EIMI", name: "iShares Core MSCI EM IMI", type: "etf", sector: "Schwellenländer", country: "Global", basePriceCents: 3500 },
];

export const INSTRUMENT_BY_ID: ReadonlyMap<string, Instrument> = new Map(
  INSTRUMENTS.map((i) => [i.id, i])
);
