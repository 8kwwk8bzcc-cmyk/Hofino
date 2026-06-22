// Deterministisches, realistisches Stundenkurs-Modell für den MVP-Simulator.
// WICHTIG: Diese Datei ist KANONISCH und hat KEINE Imports (nur Math), damit sie
// unverändert auch in den Deno-Edge-Functions läuft (Kopie: supabase/functions/_shared/price-model.ts).
// Bei Änderungen beide Dateien synchron halten – ein Test erzwingt Byte-Gleichheit.

export const DEFAULT_VOLATILITY = 0.12;
const HOUR_MS = 3_600_000;

/** FNV-1a-Hash → vorzeichenlose 32-Bit-Zahl. Deterministisch, plattformunabhängig. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32-PRNG aus einem Seed: liefert Werte in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stundenindex seit Epoch. */
export function hourIndex(atMs: number): number {
  return Math.floor(atMs / HOUR_MS);
}

/** Beginn der Stunde in ms (für `as_of`). */
export function floorToHourMs(atMs: number): number {
  return hourIndex(atMs) * HOUR_MS;
}

/**
 * Plausibler Basispreis (Cent) für eine Instrument-ID ohne externe Konfiguration:
 * deterministisch im Bereich ~10 € … ~610 €.
 */
export function deriveBaseCents(instrumentId: string): number {
  return 1000 + (hashString(`base:${instrumentId}`) % 60000);
}

/**
 * Kurs (Cent) eines Instruments zu einem Zeitpunkt – glatt, beschränkt und deterministisch.
 * Faktor liegt in [1 − vol, 1 + vol]; daher nie negativ. Keine kumulative Drift („Explosion").
 */
export function priceAtCents(
  instrumentId: string,
  basePriceCents: number,
  volatility: number,
  atMs: number
): number {
  const hi = hourIndex(atMs);
  const rng = mulberry32(hashString(instrumentId));
  const phaseDay = rng() * Math.PI * 2;
  const phaseWeek = rng() * Math.PI * 2;
  const daily = Math.sin((2 * Math.PI * hi) / 24 + phaseDay);
  const weekly = Math.sin((2 * Math.PI * hi) / (24 * 7) + phaseWeek);
  const noise = (hashString(`${instrumentId}:${hi}`) / 4294967295) * 2 - 1;
  const factor = 1 + volatility * (0.6 * daily + 0.3 * weekly + 0.1 * noise);
  const base = Math.max(1, basePriceCents);
  return Math.max(1, Math.round(base * factor));
}
