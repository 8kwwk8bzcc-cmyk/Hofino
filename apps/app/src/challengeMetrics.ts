// Gemeinsame Definition der Challenge-Metriken (Lehrer- und Schülerseite).
// Jede Metrik hat einen Vergleich (Ziel erreichen = gte, oder höchstens = lte),
// einen kurzen Label-Key (Picker) und einen Ziel-Satz-Key mit {n}.
// Prozess-Challenges (Streuung, Ruhige Hand, Gebühren …) belohnen bewusst nicht
// reine %-Performance, sondern Diversifikation, Buy-and-Hold und Kostenbewusstsein.

export type ChallengeMetric =
  | "konzepte"
  | "xp"
  | "xp_klasse"
  | "themenblock"
  | "branchen"
  | "regionen"
  | "etf"
  | "wenig_orders"
  | "gebuehren_max";

export interface MetricDef {
  compare: "gte" | "lte"; // gte: mindestens X erreichen · lte: höchstens X
  scope: "individual" | "class"; // individual: je Schüler · class: kooperativ (Klassensumme)
  labelKey: string; // kurzer Name im Picker
  goalKey: string; // Ziel-Satz mit Platzhalter {n} (für themenblock leer → gespeicherter Titel)
  source: "learning" | "depot";
  needsRef?: boolean; // braucht einen Bezug (z. B. Themenblock-ID) statt einer Zielzahl
}

export const CHALLENGE_METRICS: Record<ChallengeMetric, MetricDef> = {
  konzepte: { compare: "gte", scope: "individual", source: "learning", labelKey: "class.challengeMetricKonzepte", goalKey: "class.challengeGoalKonzepte" },
  xp: { compare: "gte", scope: "individual", source: "learning", labelKey: "class.challengeMetricXp", goalKey: "class.challengeGoalXp" },
  xp_klasse: { compare: "gte", scope: "class", source: "learning", labelKey: "class.challengeMetricXpKlasse", goalKey: "class.challengeGoalXpKlasse" },
  themenblock: { compare: "gte", scope: "individual", source: "learning", needsRef: true, labelKey: "class.challengeMetricThemenblock", goalKey: "" },
  branchen: { compare: "gte", scope: "individual", source: "depot", labelKey: "class.challengeMetricBranchen", goalKey: "class.challengeGoalBranchen" },
  regionen: { compare: "gte", scope: "individual", source: "depot", labelKey: "class.challengeMetricRegionen", goalKey: "class.challengeGoalRegionen" },
  etf: { compare: "gte", scope: "individual", source: "depot", labelKey: "class.challengeMetricEtf", goalKey: "class.challengeGoalEtf" },
  wenig_orders: { compare: "lte", scope: "individual", source: "depot", labelKey: "class.challengeMetricOrders", goalKey: "class.challengeGoalOrders" },
  gebuehren_max: { compare: "lte", scope: "individual", source: "depot", labelKey: "class.challengeMetricFees", goalKey: "class.challengeGoalFees" },
};

export const CHALLENGE_METRIC_ORDER: ChallengeMetric[] = [
  "konzepte",
  "xp",
  "xp_klasse",
  "themenblock",
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
  blocksMastered: Record<string, number>; // gemeisterte Konzepte je Themenblock-ID
  classXpSum: number; // Summe der Klassen-XP (für kooperative Ziele)
}

/** Aktueller Wert einer Person/Reihe für die Metrik. `ref` z. B. Themenblock-ID. */
export function challengeValue(metric: ChallengeMetric, s: ChallengeStudentStats, ref?: string | null): number {
  switch (metric) {
    case "konzepte":
      return s.konzepte;
    case "xp":
      return s.xp;
    case "xp_klasse":
      return s.classXpSum;
    case "themenblock":
      return ref ? (s.blocksMastered[ref] ?? 0) : 0;
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
