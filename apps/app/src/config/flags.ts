// Feature-Flags (mission-board-no-house-v1). Steuern den Produkt-Pivot vom Haus-Dashboard
// zum „Daily Finance Workout". Haus-Logik/-Daten bleiben erhalten, werden nur UI-seitig
// per house_enabled=false ausgeblendet (siehe Spec product_decision.house_strategy).
export const FLAGS = {
  house_enabled: false,
  daily_workout_enabled: true,
  market_lab_enabled: true,
  decision_journal_enabled: true,
  hold_decision_enabled: true,
  order_fee_enabled: true,
  rankings_enabled: true,
  classroom_enabled: true,
  family_readonly_enabled: true,
  dark_mode_enabled_initially: false,
} as const;

export type FeatureFlag = keyof typeof FLAGS;

// Entwickler-Login: ersetzt die normale Anmeldung durch eine Persona-Auswahl zum
// schnellen Durchtesten aller Rollen/Szenarien. Nur aktiv, wenn EXPO_PUBLIC_DEV_LOGIN=1
// zur Build-Zeit gesetzt ist. VOR dem echten Launch abschalten (Env-Zeile entfernen).
export const DEV_LOGIN = process.env.EXPO_PUBLIC_DEV_LOGIN === "1";
