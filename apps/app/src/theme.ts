// Design-Tokens aus CLAUDE.md §11 – verbindlich.
export const colors = {
  primary: "#0D2B45", // Dunkelblau/Petrol – Vertrauen, Wissen
  secondary: "#22C55E", // Grün – Wachstum, Lernen
  accent: "#F4C542", // Gold/Gelb – Erfolge, Belohnungen
  background: "#F5F7FA", // ruhige Flächen
  surface: "#FFFFFF", // Karten/Flächen
  text: "#0D2B45",
  textMuted: "#5B6B7B",
  border: "#E3E8EF",
  danger: "#DC2626",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const font = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
} as const;
