// Design-Tokens – „Mission Board / Daily Finance Workout" (Spec mission-board-no-house-v1).
// Token-Namen bleiben stabil (Screens referenzieren sie), nur Werte sind neu.
export const colors = {
  primary: "#081F3A", // Navy – Vertrauen, Wissen
  secondary: "#22C55E", // Grün – Wachstum, Lernen
  accent: "#F2C94C", // Gold – XP, Erfolge, Belohnungen
  background: "#F3F6FA", // ruhige Flächen
  surface: "#FFFFFF", // Karten
  text: "#081F3A",
  textMuted: "#64748B",
  border: "#D8E2EA",
  danger: "#D96B6B", // calm negative – zurückhaltendes Rot
  // ergänzende Flächen/Status
  softBlue: "#EAF2FB",
  softMint: "#E4F8EF",
  success: "#16A34A",
  warning: "#F2B705",
  info: "#3B82F6",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, card: 22, pill: 999 } as const;

export const font = {
  h1: 32,
  h2: 24,
  h3: 20,
  body: 16,
  small: 13,
} as const;

// Weiche Karten-Schatten (react-native-web bildet shadow* auf box-shadow ab).
export const shadow = {
  card: {
    shadowColor: "#081F3A",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const;
