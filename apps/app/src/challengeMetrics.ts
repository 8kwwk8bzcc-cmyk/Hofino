// Gemeinsame Definition der Challenge-Metriken (Lehrer- und Schülerseite).
// Jede Metrik hat einen Vergleich (Ziel erreichen = gte, oder höchstens = lte),
// einen kurzen Label-Key (Picker) und einen Ziel-Satz-Key mit {n}.
// Prozess-Challenges (Streuung, Ruhige Hand, Gebühren …) belohnen bewusst nicht
// reine %-Performance, sondern Diversifikation, Buy-and-Hold und Kostenbewusstsein.

export type ChallengeMetric =
  | "konzepte"
  | "xp"
  | "branchen"
  | "regionen"
  | "etf"
  | "wenig_orders"
  | "gebuehren_max";

export interface MetricDef {
  compare: "gte" | "lte"; // gte: mindestens X erreichen · lte: höchstens X
  labelKey: string; // kurzer Name im Picker
  goalKey: string; // Ziel-Satz mit Platzhalter {n}
  source: "learning" | "depot";
}

export const CHALLENGE_METRICS: Record<ChallengeMetric, MetricDef> = {
  konzepte: { compare: "gte", source: "learning", labelKey: "class.challengeMetricKonzepte", goalKey: "class.challengeGoalKonzepte" },
  xp: { compare: "gte", source: "learning", labelKey: "class.challengeMetricXp", goalKey: "class.challengeGoalXp" },
  branchen: { compare: "gte", source: "depot", labelKey: "class.challengeMetricBranchen", goalKey: "class.challengeGoalBranchen" },
  regionen: { compare: "gte", source: "depot", labelKey: "class.challengeMetricRegionen", goalKey: "class.challengeGoalRegionen" },
  etf: { compare: "gte", source: "depot", labelKey: "class.challengeMetricEtf", goalKey: "class.challengeGoalEtf" },
  wenig_orders: { compare: "lte", source: "depot", labelKey: "class.challengeMetricOrders", goalKey: "class.challengeGoalOrders" },
  gebuehren_max: { compare: "lte", source: "depot", labelKey: "class.challengeMetricFees", goalKey: "class.challengeGoalFees" },
};

export const CHALLENGE_METRIC_ORDER: ChallengeMetric[] = [
  "konzepte",
  "xp",
  "branchen",
  "regionen",
  "etf",
  "wenig_orders",
  "gebuehren_max",
];

/** Ziel erreicht? Berücksichtigt gte/lte. */
export function challengeReached(metric: ChallengeMetric, value: number, target: number): boolean {
  return CHALLENGE_METRICS[metric].compare === "lte" ? value <= target : value >= target;
}

export interface ChallengeStudentStats {
  konzepte: number;
  xp: number;
  branchen: number; // verschiedene Branchen im Depot
  regionen: number; // verschiedene Länder/Regionen im Depot
  etf: number; // Anzahl ETF-Positionen
  orders: number; // Anzahl getätigter Orders
}

/** Aktueller Wert einer Person/Reihe für die Metrik. */
export function challengeValue(metric: ChallengeMetric, s: ChallengeStudentStats): number {
  switch (metric) {
    case "konzepte":
      return s.konzepte;
    case "xp":
      return s.xp;
    case "branchen":
      return s.branchen;
    case "regionen":
      return s.regionen;
    case "etf":
      return s.etf;
    case "wenig_orders":
      return s.orders;
    case "gebuehren_max":
      return s.orders * 5; // 5 € Gebühr je Order
  }
}
