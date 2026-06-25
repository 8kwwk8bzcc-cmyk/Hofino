// Konsistentes Outline-Icon-Set (ersetzt Emojis in den Tab-Bars).
// Stil lt. Spec: gerundete Outline-Icons, stroke 2.25, round caps/joins. Abhängigkeitsfrei
// über react-native-svg (bereits im Projekt). Farbe via Prop (aktiv = growth_green).
import React from "react";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import { colors } from "../theme.js";

export interface IconProps {
  size?: number;
  color?: string;
}

function Base({ size = 24, color = colors.textMuted, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

// Start / heutiges Training – Aktivitäts-Puls (bewusst KEIN Haus).
export function IconStart(p: IconProps) {
  return (
    <Base {...p}>
      <Polyline points="3 12 7 12 10 20 14 4 17 12 21 12" />
    </Base>
  );
}

// Lernen – aufgeschlagenes Buch.
export function IconLearn(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M12 6.5C10.3 5.2 7.8 4.7 4 5.2V18c3.8-.5 6.3 0 8 1.3" />
      <Path d="M12 6.5C13.7 5.2 16.2 4.7 20 5.2V18c-3.8-.5-6.3 0-8 1.3" />
    </Base>
  );
}

// Depot – Aktentasche.
export function IconDepot(p: IconProps) {
  return (
    <Base {...p}>
      <Rect x="3" y="7" width="18" height="13" rx="2.5" />
      <Path d="M8.5 7V5.5A2 2 0 0 1 10.5 3.5h3A2 2 0 0 1 15.5 5.5V7" />
      <Line x1="3" y1="12.5" x2="21" y2="12.5" />
    </Base>
  );
}

// Werte – Lupe (Recherche/Lernbeispiele).
export function IconValues(p: IconProps) {
  return (
    <Base {...p}>
      <Circle cx="11" cy="11" r="7" />
      <Line x1="20.5" y1="20.5" x2="16.2" y2="16.2" />
    </Base>
  );
}

// Liga – Pokal.
export function IconLeague(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <Path d="M7 6H4v1.5A3.5 3.5 0 0 0 7 11M17 6h3v1.5A3.5 3.5 0 0 1 17 11" />
      <Line x1="12" y1="14" x2="12" y2="17" />
      <Path d="M8.5 20h7M9.5 20l.5-3h4l.5 3" />
    </Base>
  );
}

// Klasse – Abschlusshut.
export function IconClass(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M3 9.5 12 5.5l9 4-9 4-9-4Z" />
      <Path d="M7 11.7V15.5c0 1.4 2.5 2.5 5 2.5s5-1.1 5-2.5V11.7" />
      <Line x1="21" y1="9.5" x2="21" y2="14" />
    </Base>
  );
}

// Module – Liste mit Häkchen.
export function IconModules(p: IconProps) {
  return (
    <Base {...p}>
      <Line x1="9" y1="6" x2="20" y2="6" />
      <Line x1="9" y1="12" x2="20" y2="12" />
      <Line x1="9" y1="18" x2="20" y2="18" />
      <Polyline points="3 5.5 4.3 7 6 4.5" />
      <Polyline points="3 11.5 4.3 13 6 10.5" />
      <Polyline points="3 17.5 4.3 19 6 16.5" />
    </Base>
  );
}

// Beamer – Monitor.
export function IconBeamer(p: IconProps) {
  return (
    <Base {...p}>
      <Rect x="3" y="4" width="18" height="12" rx="2" />
      <Line x1="9" y1="20" x2="15" y2="20" />
      <Line x1="12" y1="16" x2="12" y2="20" />
    </Base>
  );
}

// Familie – zwei Personen.
export function IconFamily(p: IconProps) {
  return (
    <Base {...p}>
      <Circle cx="9" cy="8" r="3" />
      <Path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <Path d="M16 5.2A3 3 0 0 1 16 10.8M17.5 14c2.3.4 4 2.3 4 5" />
    </Base>
  );
}

// Verknüpfen – Kette.
export function IconLink(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M9.5 14.5 14.5 9.5" />
      <Path d="M8 11 6 13a3.5 3.5 0 0 0 5 5l2-2" />
      <Path d="M16 13l2-2a3.5 3.5 0 0 0-5-5l-2 2" />
    </Base>
  );
}
