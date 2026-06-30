import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Polyline, Polygon, Line } from "react-native-svg";
import { formatEuros } from "@hofino/core";
import { font, fonts, space, type Palette } from "../theme.js";
import { useColors, useThemedStyles } from "../theme/ThemeProvider.js";

// Schlanker, abhängigkeitsfreier Linien-Chart (react-native-svg ist bereits im Projekt).
// Zeigt eine Wertreihe (z. B. Kursverlauf oder Depotwert) mit weicher Flächenfüllung.
// Farbe richtet sich nach der Gesamtentwicklung (grün = gestiegen, dezentes Rot = gefallen).
export function LineChart({
  values,
  height = 120,
  emptyHint,
}: {
  values: number[];
  height?: number;
  emptyHint?: string;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const clean = values.filter((v) => Number.isFinite(v));

  if (clean.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>{emptyHint ?? ""}</Text>
      </View>
    );
  }

  // Koordinatensystem in einem festen ViewBox; SVG skaliert responsiv auf die Breite.
  const W = 300;
  const H = height;
  const pad = 6;
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const stepX = (W - pad * 2) / (clean.length - 1);
  const x = (i: number) => pad + i * stepX;
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);

  const points = clean.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPoints = `${x(0).toFixed(1)},${H} ${points} ${x(clean.length - 1).toFixed(1)},${H}`;

  const up = clean[clean.length - 1] >= clean[0];
  const lineColor = up ? c.green : c.danger;
  const fillColor = up ? c.mint : "rgba(217,107,107,0.12)";
  const first = clean[0];
  const last = clean[clean.length - 1];
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;

  return (
    <View>
      <View style={styles.legend}>
        <Text style={styles.range}>
          {formatEuros(min)} – {formatEuros(max)}
        </Text>
        <Text style={[styles.change, { color: lineColor }]}>
          {changePct >= 0 ? "+" : ""}
          {changePct.toFixed(1)} %
        </Text>
      </View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Line x1={pad} y1={y(first)} x2={W - pad} y2={y(first)} stroke={c.border} strokeWidth={1} strokeDasharray="4 4" />
        <Polygon points={areaPoints} fill={fillColor} />
        <Polyline points={points} fill="none" stroke={lineColor} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    empty: { alignItems: "center", justifyContent: "center", backgroundColor: c.softBlue, borderRadius: 12 },
    emptyText: { fontSize: font.small, color: c.muted, fontFamily: fonts.body, textAlign: "center", paddingHorizontal: space.md },
    legend: { flexDirection: "row", justifyContent: "space-between", marginBottom: space.xs },
    range: { fontSize: font.caption, color: c.muted, fontFamily: fonts.body },
    change: { fontSize: font.caption, fontWeight: "700", fontFamily: fonts.display },
  });
