import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatEuros, rank, type RankEntry } from "@hofino/core";
import { useStore } from "../store/store.js";
import { Card, H1, H2, Muted } from "../ui/components.js";
import { font, fonts, radius, space, type Palette } from "../theme.js";
import { useColors, useThemedStyles } from "../theme/ThemeProvider.js";

// Deterministische Mitstreiter, damit die Ligen auch lokal (Einzelnutzer) lebendig sind.
const BOTS = [
  { id: "b1", name: "Lina", perf: 12.4, capital: 612000, knowledge: 950 },
  { id: "b2", name: "Mehmet", perf: -3.1, capital: 488000, knowledge: 1300 },
  { id: "b3", name: "Ayla", perf: 7.8, capital: 559000, knowledge: 700 },
  { id: "b4", name: "Tom", perf: 21.0, capital: 705000, knowledge: 450 },
  { id: "b5", name: "Nora", perf: 1.2, capital: 521000, knowledge: 1600 },
];
const NAMES: Record<string, string> = Object.fromEntries(BOTS.map((b) => [b.id, b.name]));

function League({
  title,
  entries,
  format,
  meLabel,
}: {
  title: string;
  entries: RankEntry[];
  format: (score: number) => string;
  meLabel: string;
}) {
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const ranked = rank(entries, 10);
  return (
    <Card>
      <H2>{title}</H2>
      {ranked.map((e) => {
        const me = e.id === "me";
        return (
          <View key={e.id} style={[styles.row, me && styles.meRow]}>
            <Text style={[styles.rank, e.awarded && { color: c.gold }]}>
              {e.awarded ? `🏅 ${e.rank}` : e.rank}
            </Text>
            <Text style={[styles.name, me && { fontWeight: "800" }]}>{me ? meLabel : NAMES[e.id]}</Text>
            <Text style={styles.score}>{format(e.score)}</Text>
          </View>
        );
      })}
    </Card>
  );
}

const PREMIUM = [
  { icon: "🤖", key: "premium.aiCoach" },
  { icon: "📁", key: "premium.multiDepot" },
  { icon: "🛠️", key: "premium.etfWorkshop" },
  { icon: "📊", key: "premium.analysis" },
];

export function Rankings() {
  const { derived, t } = useStore();
  const styles = useThemedStyles(makeStyles);

  const perf: RankEntry[] = [...BOTS.map((b) => ({ id: b.id, score: b.perf })), { id: "me", score: derived.performancePercent }];
  const capital: RankEntry[] = [...BOTS.map((b) => ({ id: b.id, score: b.capital })), { id: "me", score: derived.equityCents }];
  const knowledge: RankEntry[] = [...BOTS.map((b) => ({ id: b.id, score: b.knowledge })), { id: "me", score: derived.lernXpSaison }];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>{t("rankings.title")}</H1>
      <Muted>{t("rankings.top10")}</Muted>

      <League title={t("rankings.performance")} meLabel={t("rankings.you")} entries={perf} format={(s) => `${s >= 0 ? "+" : ""}${s.toFixed(1)} %`} />
      <League title={t("rankings.capital")} meLabel={t("rankings.you")} entries={capital} format={(s) => formatEuros(s)} />
      <League title={t("rankings.knowledge")} meLabel={t("rankings.you")} entries={knowledge} format={(s) => `${Math.round(s)} P`} />

      <Card>
        <H2>{t("rankings.premiumTitle")}</H2>
        <Muted>{t("rankings.premiumNote")}</Muted>
        <View style={styles.tiles}>
          {PREMIUM.map((p) => (
            <View key={p.key} style={styles.tile}>
              <Text style={styles.tileIcon}>{p.icon}</Text>
              <Text style={styles.tileLabel}>{t(p.key)}</Text>
              <Text style={styles.lock}>🔒</Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: space.lg, gap: space.md, backgroundColor: c.bg },
    row: { flexDirection: "row", alignItems: "center", paddingVertical: space.sm, gap: space.md, borderBottomWidth: 1, borderBottomColor: c.border },
    meRow: { backgroundColor: c.mint, borderRadius: radius.sm },
    rank: { width: 44, fontSize: font.body, fontWeight: "700", fontFamily: fonts.bodyBold, color: c.text },
    name: { flex: 1, fontSize: font.body, fontFamily: fonts.body, color: c.text },
    score: { fontSize: font.body, fontWeight: "700", fontFamily: fonts.bodyBold, color: c.text },
    tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    tile: {
      width: "47%",
      backgroundColor: c.bg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: space.md,
      alignItems: "center",
      gap: 4,
      opacity: 0.75,
    },
    tileIcon: { fontSize: 28, fontFamily: fonts.body },
    tileLabel: { fontSize: font.small, fontWeight: "700", fontFamily: fonts.bodyBold, color: c.text, textAlign: "center" },
    lock: { fontSize: font.small, fontFamily: fonts.body },
  });
