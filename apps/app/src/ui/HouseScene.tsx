import React from "react";
import Svg, { Circle, Ellipse, Line, Polygon, Rect } from "react-native-svg";
import type { HouseStage } from "@hofino/core";
import { useColors } from "../theme/ThemeProvider.js";

// Wachsendes Haus: zeichnet je Stufe kumulativ mehr Elemente (Grundstück → Ausbauten).
const ORDER: HouseStage[] = ["grundstueck", "fundament", "waende", "dach", "erstes_haus", "ausbauten"];

export function HouseScene({ stage, size = 96 }: { stage: HouseStage; size?: number }) {
  const i = Math.max(0, ORDER.indexOf(stage));
  const c = useColors();
  const wall = "#FFFFFF";
  const stone = "#AEB9C7";
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Himmel-Akzent: Sonne */}
      <Circle cx={100} cy={20} r={10} fill={c.gold} />
      {/* Boden / Grundstück */}
      <Ellipse cx={60} cy={104} rx={54} ry={12} fill={c.mint} />
      <Line x1={10} y1={104} x2={110} y2={104} stroke={c.green} strokeWidth={2} />

      {/* Stufe 0: leeres Grundstück – kleiner Setzling */}
      {i === 0 && (
        <>
          <Line x1={60} y1={104} x2={60} y2={88} stroke="#8B5E34" strokeWidth={3} />
          <Circle cx={60} cy={84} r={8} fill={c.green} />
        </>
      )}

      {/* >=1 Fundament */}
      {i >= 1 && <Rect x={36} y={84} width={48} height={14} fill={stone} rx={2} />}
      {/* >=2 Wände */}
      {i >= 2 && <Rect x={40} y={58} width={40} height={26} fill={wall} stroke={c.navy} strokeWidth={2} />}
      {/* >=3 Dach */}
      {i >= 3 && <Polygon points="36,60 60,40 84,60" fill={c.navy} />}
      {/* >=4 Erstes Haus: Tür + Fenster */}
      {i >= 4 && (
        <>
          <Rect x={54} y={68} width={12} height={16} fill={c.navy} rx={1} />
          <Rect x={44} y={62} width={8} height={8} fill={c.gold} />
          <Rect x={68} y={62} width={8} height={8} fill={c.gold} />
        </>
      )}
      {/* >=5 Ausbauten: Anbau + Baum */}
      {i >= 5 && (
        <>
          <Rect x={80} y={70} width={16} height={14} fill={wall} stroke={c.navy} strokeWidth={2} />
          <Polygon points="78,72 88,62 98,72" fill={c.navy} />
          <Line x1={22} y1={98} x2={22} y2={86} stroke="#8B5E34" strokeWidth={3} />
          <Circle cx={22} cy={82} r={9} fill={c.green} />
        </>
      )}
    </Svg>
  );
}
