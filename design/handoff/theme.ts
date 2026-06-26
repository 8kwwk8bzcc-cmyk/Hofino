/**
 * Hofino · Corporate Design "Grünanlage"
 * ---------------------------------------------------------------------------
 * VERBINDLICHE Design-Tokens. Dies ist das neue, freigegebene Corporate Design.
 * Alle neuen und bestehenden Screens werden auf diese Tokens umgestellt.
 *
 * React Native + react-native-web tauglich (flache Layouts, keine exotischen
 * CSS-Effekte). Werte 1:1 aus dem Design-System (Hofino Design-System.dc.html).
 */

export const colors = {
  light: {
    navy:       '#0E2A47', // primary · Vertrauen, Wissen
    navySoft:   '#1C3D5C', // sekundäre Flächen / Icons auf Hell
    green:      '#1F9D6B', // secondary · Wachstum, Lernen, aktive Tabs
    gold:       '#E7BD57', // accent · XP, Erfolge (DEZENT einsetzen)
    bg:         '#F2F6FA', // App-Hintergrund
    surface:    '#FFFFFF', // Karten
    softBlue:   '#E8F0FA', // weiche Akzentfläche / Segment-Track
    mint:       '#E4F4EC', // weiche Erfolgs-/Highlight-Fläche
    goldSoft:   '#FBF1D6', // weiche Gold-Fläche (Hinweise, XP-Badge-BG)
    text:       '#0E2A47', // Primärtext
    muted:      '#5C7184', // Sekundärtext
    faint:      '#9AA7B4', // Tertiär / Labels / Placeholder
    border:     '#DCE6EE', // Rahmen, Trennlinien
    danger:     '#D96B6B', // zurückhaltendes Negativ-Rot
    // semantische Helfer
    success:    '#1F8A5B', // Text-Grün auf Hell (kontraststark)
    dangerBg:   '#FBEAEA',
  },
  dark: {
    navy:       '#34B97E', // primäre Akzentfarbe wird im Dark zu Grün-hell
    navySoft:   '#173049',
    green:      '#34B97E', // leicht heller für AA-Kontrast
    gold:       '#E7BD57',
    bg:         '#0A1A2C',
    surface:    '#12263C',
    softBlue:   '#173049',
    mint:       'rgba(52,185,126,0.14)',
    goldSoft:   'rgba(231,189,87,0.16)',
    text:       '#EAF1F8',
    muted:      '#8FA6BC',
    faint:      '#6B829A',
    border:     '#244763',
    danger:     '#E58A8A',
    success:    '#34B97E',
    dangerBg:   'rgba(229,138,138,0.14)',
  },
} as const;

/** Typografie. Google Fonts (frei + RN-tauglich). */
export const typography = {
  fontDisplay: 'Space Grotesk', // Überschriften & Zahlen
  fontBody:    'Hanken Grotesk', // Fließtext & UI
  scale: {
    h1:      { size: 30, weight: '700', family: 'Space Grotesk', lineHeight: 34 },
    h2:      { size: 24, weight: '700', family: 'Space Grotesk', lineHeight: 28 },
    h3:      { size: 19, weight: '700', family: 'Space Grotesk', lineHeight: 24 },
    bodyL:   { size: 16, weight: '400', family: 'Hanken Grotesk', lineHeight: 24 },
    body:    { size: 14.5, weight: '400', family: 'Hanken Grotesk', lineHeight: 21 },
    caption: { size: 12.5, weight: '500', family: 'Hanken Grotesk', lineHeight: 17 },
    // Overline: zusätzlich textTransform:'uppercase', letterSpacing: 0.9
    overline:{ size: 11, weight: '600', family: 'Hanken Grotesk', letterSpacing: 0.9 },
  },
} as const;

/** 4er-Spacing-Skala. */
export const spacing = {
  s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s8: 32, s10: 40,
} as const;

export const radius = {
  sm: 10, button: 14, input: 16, card: 22, pill: 999,
} as const;

/** Schatten (RN: shadow* / elevation; Web: boxShadow). */
export const shadow = {
  sm: { color: 'rgba(20,40,60,0.08)', offset: { width: 0, height: 1 },  radius: 3,  elevation: 1 },
  md: { color: 'rgba(20,40,60,0.08)', offset: { width: 0, height: 8 },  radius: 24, elevation: 4 },
  lg: { color: 'rgba(20,40,60,0.12)', offset: { width: 0, height: 20 }, radius: 48, elevation: 10 },
} as const;

/**
 * Modus-Tonalität (eine Basis, pro Rolle leicht angepasst — KEINE zweite App).
 * Kids = wärmer/verspielter (Haus, Gold-Akzente erlaubt).
 * Adult = ruhiger/reduzierter (weniger Gold, mehr Weißraum, kein Haus).
 */
export const modeTone = {
  kids:      { playful: true,  showHouse: true  },
  adult:     { playful: false, showHouse: false },
  family:    { playful: false, showHouse: false, readOnly: true },
  classroom: { playful: false, showHouse: false, aggregatesOnly: true },
} as const;

export const theme = { colors, typography, spacing, radius, shadow, modeTone } as const;
export type ThemeMode = 'light' | 'dark';
export default theme;
