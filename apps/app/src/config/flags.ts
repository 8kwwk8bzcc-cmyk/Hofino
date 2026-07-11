// Feature-Flags (mission-board-no-house-v1). Steuern den Produkt-Pivot vom Haus-Dashboard
// zum „Daily Finance Workout". Haus-Logik/-Daten bleiben erhalten, werden nur UI-seitig
// per house_enabled=false ausgeblendet (siehe Spec product_decision.house_strategy).
// Review 2026-07-10: 9 tote Flags entfernt — sie hatten keinen Konsumenten und suggerierten
// Steuerbarkeit, die nicht existierte (z. B. hätte order_fee_enabled=false nichts abgeschaltet).
// Neue Flags erst anlegen, wenn der Code sie tatsächlich prüft.
export const FLAGS = {
  house_enabled: false,
} as const;

export type FeatureFlag = keyof typeof FLAGS;

// Entwickler-Login: ersetzt die normale Anmeldung durch eine Persona-Auswahl zum
// schnellen Durchtesten aller Rollen/Szenarien. Nur aktiv, wenn EXPO_PUBLIC_DEV_LOGIN=1
// zur Build-Zeit gesetzt ist. VOR dem echten Launch abschalten (Env-Zeile entfernen).
export const DEV_LOGIN = process.env.EXPO_PUBLIC_DEV_LOGIN === "1";
