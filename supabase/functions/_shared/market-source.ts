// Schicht A — Marktdaten-Quelle (Ingestion, serverseitig). Austauschbar per Env
// MARKET_DATA_SOURCE. Kein Client-Code kennt eine konkrete Quelle; ein Quellenwechsel
// (Free-Tier → lizenzierter Feed) ist eine neue Implementierung hier, KEIN App-Change.
// Preise IMMER in Cent (bigint-kompatibel), konform zu CLAUDE.md §4.
import { DEFAULT_VOLATILITY, deriveBaseCents, floorToHourMs, priceAtCents } from "./price-model.ts";

export interface Quote {
  providerSymbol: string;
  priceCents: number; // EUR-Cent
  asOf: string; // ISO-Zeitstempel der Quelle (oder Abrufzeit als Fallback)
}

export interface MarketDataSource {
  readonly name: string; // landet in prices.source / price_snapshots.source
  // baseCentsBySymbol: kuratierter Basiskurs je Symbol (vom Aufrufer aus der DB).
  // Quellen mit echten Kursen (z. B. TwelveData) ignorieren ihn.
  fetchQuotes(providerSymbols: string[], baseCentsBySymbol?: Record<string, number>): Promise<Quote[]>;
}

// Deterministische Pseudo-Kurse je Symbol. Default für lokale Entwicklung und
// Offline-Fallback ohne Internet/Vertrag. Schwankt ±12 % um den kuratierten
// Basiskurs (baseCentsBySymbol); fehlt er, wird er aus der ID abgeleitet.
export class SimulatedSource implements MarketDataSource {
  readonly name = "simulated";
  constructor(private readonly now: () => number = () => Date.now()) {}
  async fetchQuotes(providerSymbols: string[], baseCentsBySymbol?: Record<string, number>): Promise<Quote[]> {
    const atMs = floorToHourMs(this.now());
    const asOf = new Date(atMs).toISOString();
    return providerSymbols.map((s) => ({
      providerSymbol: s,
      priceCents: priceAtCents(s, baseCentsBySymbol?.[s] ?? deriveBaseCents(s), DEFAULT_VOLATILITY, atMs),
      asOf,
    }));
  }
}

function parsePriceToCents(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100); // EUR → Cent
}

// Twelve Data (https://twelvedata.com/docs). /price unterstützt mehrere Symbole
// kommagetrennt; Antwort ist dann ein Objekt je Symbol ({ "SAP:XETR": { price } }),
// bei genau einem Symbol direkt { price }. Exchange wird über das Symbolformat
// "TICKER:XETR" (provider_symbol) gewählt → EUR-Notierung, keine FX-Umrechnung.
// Free-Tier ist credit-limitiert (Limit im eigenen Dashboard prüfen): daher chunked,
// und bei HTTP/Parse-Fehlern wird der Batch übersprungen (Fallback im Aufrufer).
export class TwelveDataSource implements MarketDataSource {
  readonly name = "twelvedata";
  constructor(
    private readonly apiKey: string,
    private readonly chunkSize = 8,
  ) {}

  async fetchQuotes(providerSymbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    const asOf = new Date().toISOString();
    for (let i = 0; i < providerSymbols.length; i += this.chunkSize) {
      const batch = providerSymbols.slice(i, i + this.chunkSize);
      const url =
        `https://api.twelvedata.com/price?symbol=${encodeURIComponent(batch.join(","))}` +
        `&apikey=${encodeURIComponent(this.apiKey)}`;
      let data: Record<string, unknown> | null = null;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error(`twelvedata: HTTP ${res.status} für [${batch.join(",")}]`);
          continue; // Fallback: bestehende Kurse bleiben stehen
        }
        data = (await res.json()) as Record<string, unknown>;
      } catch (e) {
        console.error(`twelvedata: fetch fehlgeschlagen für [${batch.join(",")}]:`, e);
        continue;
      }
      if (batch.length === 1) {
        const cents = parsePriceToCents((data as { price?: unknown }).price);
        if (cents != null) out.push({ providerSymbol: batch[0], priceCents: cents, asOf });
      } else {
        for (const sym of batch) {
          const entry = data[sym] as { price?: unknown } | undefined;
          const cents = parsePriceToCents(entry?.price);
          if (cents != null) out.push({ providerSymbol: sym, priceCents: cents, asOf });
        }
      }
    }
    return out;
  }
}

// Mappt den Env-Namen auf eine Implementierung. Weitere Quellen hier ergänzen.
export function createMarketDataSource(
  name: string | undefined,
  env: { TWELVEDATA_API_KEY?: string } = {},
): MarketDataSource {
  switch ((name ?? "simulated").toLowerCase()) {
    case "twelvedata": {
      const key = env.TWELVEDATA_API_KEY;
      if (!key) throw new Error("TWELVEDATA_API_KEY fehlt für MARKET_DATA_SOURCE=twelvedata");
      return new TwelveDataSource(key);
    }
    case "simulated":
    default:
      return new SimulatedSource();
  }
}
