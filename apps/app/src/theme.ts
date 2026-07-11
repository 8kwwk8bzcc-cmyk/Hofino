// Design-Tokens – Corporate Design „Grünanlage" (verbindlich, Quelle: Claude Design Handoff).
// Light + Dark. Runtime-Umschaltung über ThemeProvider/useColors (siehe theme/ThemeProvider.tsx).
// Token-Namen folgen dem Handoff (navy/green/gold/bg/muted/faint/…).

export const palettes = {
  light: {
    navy: "#0E2A47", // primary · Vertrauen, Wissen
    navySoft: "#1C3D5C", // sekundäre Flächen / Icons auf Hell
    green: "#1F9D6B", // secondary · Wachstum, Lernen, aktive Tabs
    gold: "#E7BD57", // accent · XP, Erfolge (dezent)
    bg: "#F2F6FA", // App-Hintergrund
    surface: "#FFFFFF", // Karten
    softBlue: "#E8F0FA", // weiche Akzentfläche / Segment-Track
    mint: "#E4F4EC", // weiche Erfolgs-/Highlight-Fläche
    goldSoft: "#FBF1D6", // weiche Gold-Fläche (Hinweise, XP-Badge-BG)
    goldText: "#9A7A1E", // lesbares Text-Gold auf goldSoft (Pills „Lehrer"/„Gold")
    text: "#0E2A47", // Primärtext
    muted: "#5C7184", // Sekundärtext
    faint: "#9AA7B4", // Tertiär / Labels / Placeholder
    border: "#DCE6EE", // Rahmen, Trennlinien
    danger: "#D96B6B", // zurückhaltendes Negativ-Rot
    success: "#1F8A5B", // kontraststarkes Text-Grün auf Hell
    dangerBg: "#FBEAEA",
  },
  dark: {
    navy: "#34B97E", // primärer Akzent wird im Dark zu Grün-hell
    navySoft: "#173049",
    green: "#34B97E", // heller für AA-Kontrast
    gold: "#E7BD57",
    bg: "#0A1A2C",
    surface: "#12263C",
    softBlue: "#173049",
    mint: "rgba(52,185,126,0.14)",
    goldSoft: "rgba(231,189,87,0.16)",
    goldText: "#E7BD57", // im Dark Mode ist das Voll-Gold auf der dunklen Fläche lesbar
    text: "#EAF1F8",
    muted: "#8FA6BC",
    faint: "#6B829A",
    border: "#244763",
    danger: "#E58A8A",
    success: "#34B97E",
    dangerBg: "rgba(229,138,138,0.14)",
  },
} as const;

export type Palette = { [K in keyof (typeof palettes)["light"]]: string };
export type ThemeMode = "light" | "dark";

// Fallback-Palette für Module ohne Theme-Context (z. B. Icon-Default). UI nutzt useColors().
export const colors = palettes.light;

// 4er-Spacing-Skala (Schlüssel rückwärtskompatibel).
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const spacing = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s8: 32, s10: 40 } as const;

export const radius = {
  sm: 10,
  md: 12,
  button: 14,
  lg: 16,
  input: 16,
  xl: 20,
  card: 22,
  pill: 999,
} as const;

// Typo-Skala (px). Display/Zahlen = Space Grotesk, Text/UI = Hanken Grotesk.
export const font = {
  h1: 30,
  h2: 24,
  h3: 19,
  bodyL: 16,
  body: 14.5,
  small: 12.5,
  caption: 12.5,
  overline: 11,
} as const;

// Schriftfamilien (geladen in App.tsx via expo-google-fonts).
export const fonts = {
  display: "SpaceGrotesk_700Bold",
  displaySemi: "SpaceGrotesk_600SemiBold",
  body: "HankenGrotesk_400Regular",
  bodyMed: "HankenGrotesk_500Medium",
  bodySemi: "HankenGrotesk_600SemiBold",
  bodyBold: "HankenGrotesk_700Bold",
} as const;

// Schatten (react-native-web bildet shadow* auf box-shadow ab).
const shadowColor = "rgba(20,40,60,0.08)";
export const shadow = {
  sm: { shadowColor, shadowOpacity: 1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor, shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  lg: { shadowColor: "rgba(20,40,60,0.12)", shadowOpacity: 1, shadowRadius: 48, shadowOffset: { width: 0, height: 20 }, elevation: 10 },
  // Karten-Schatten (= md), Schlüssel rückwärtskompatibel.
  card: { shadowColor, shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
} as const;

// Modus-Tonalität (eine Basis, pro Rolle leicht angepasst — KEINE zweite App).
export const modeTone = {
  kids: { playful: true, showHouse: false }, // Haus aktuell ausgeblendet (Mission-Board-Pivot)
  adult: { playful: false, showHouse: false },
  family: { playful: false, showHouse: false, readOnly: true },
  classroom: { playful: false, showHouse: false, aggregatesOnly: true },
} as const;
