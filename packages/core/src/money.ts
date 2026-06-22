// Geld in Hofino: IMMER als ganze Cent (Integer). Keine Floats für Beträge.

/** Geldbetrag in ganzen Cent. */
export type Cents = number;

/** 5 € Ordergebühr (pro Kauf/Verkauf, nicht pro Stück). */
export const ORDER_FEE_CENTS: Cents = 500;

/** Virtuelles Startkapital: 5.000 €. */
export const START_CAPITAL_CENTS: Cents = 500_000;

/** Wandelt einen Euro-Betrag in Cent um (z. B. euro(120) = 12000). */
export function euro(amount: number): Cents {
  return Math.round(amount * 100);
}

/** Formatiert Cent als deutschen Euro-Betrag, z. B. 500000 → "5.000,00 €". */
export function formatEuros(cents: Cents): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const euros = Math.floor(abs / 100);
  const rest = abs % 100;
  const grouped = euros.toLocaleString("de-DE");
  return `${negative ? "-" : ""}${grouped},${rest.toString().padStart(2, "0")} €`;
}
