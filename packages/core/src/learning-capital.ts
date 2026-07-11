// Lernkapital-Beträge (Domänenregel §6). HINWEIS (Review 2026-07-10): Die Vergabe läuft
// live serverseitig über die RPC lern_konzept_abschliessen (supabase/migrations) — dieses
// Modul dokumentiert die verbindlichen Beträge als getestete Referenz. Beträge hier und
// in der RPC müssen übereinstimmen (Konzept 50000 · Themenblock 100000 · Meilenstein 200000).
// Lernkapital (virtuell): wird je Nutzer und Ereignis nur EINMAL gewährt.
// Wiederholen bringt kein zusätzliches Kapital. Getrennt von der Investment-Performance.

import { type Cents } from "./money.js";

export type CapitalReason = "module_done" | "quiz_perfect" | "themenblock" | "milestone";

export const LEARNING_CAPITAL_CENTS: Record<CapitalReason, Cents> = {
  module_done: 50_000, // +500 €
  quiz_perfect: 50_000, // +500 €
  themenblock: 100_000, // +1.000 €
  milestone: 200_000, // +2.000 €
};

export interface CapitalGrant {
  reason: CapitalReason;
  /** Bezug, z. B. module_id / block_id – macht das Ereignis eindeutig. */
  refId: string;
  amountCents: Cents;
}

export interface GrantResult {
  grants: readonly CapitalGrant[];
  /** Tatsächlich neu gewährt (0, wenn das Ereignis schon vergeben war). */
  addedCents: Cents;
}

/** Gewährt Lernkapital für (reason, refId) – idempotent: Doppelvergabe = 0. */
export function grantLearningCapital(
  existing: readonly CapitalGrant[],
  reason: CapitalReason,
  refId: string
): GrantResult {
  const already = existing.some((g) => g.reason === reason && g.refId === refId);
  if (already) return { grants: existing, addedCents: 0 };
  const amountCents = LEARNING_CAPITAL_CENTS[reason];
  return { grants: [...existing, { reason, refId, amountCents }], addedCents: amountCents };
}

/** Summe des bisher gewährten Lernkapitals. */
export function totalLearningCapitalCents(grants: readonly CapitalGrant[]): Cents {
  return grants.reduce((sum, g) => sum + g.amountCents, 0);
}
