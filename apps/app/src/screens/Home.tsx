import React from "react";
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { formatEuros } from "@hofino/core";
import { MODULES } from "@hofino/content";
import { useStore } from "../store/store.js";
import { Body, Card, H1, H2, HLogo, Muted, Pill, ProgressBar } from "../ui/components.js";
import { ChildFamilyCard } from "./family/ChildFamilyCard.js";
import { colors, font, space } from "../theme.js";

const STAGES: { id: string; emoji: string; label: string }[] = [
  { id: "grundstueck", emoji: "🟫", label: "Grundstück" },
  { id: "fundament", emoji: "🧱", label: "Fundament" },
  { id: "waende", emoji: "🏗️", label: "Wände" },
  { id: "dach", emoji: "🏠", label: "Dach" },
  { id: "erstes_haus", emoji: "🏡", label: "Erstes Haus" },
  { id: "ausbauten", emoji: "🏘️", label: "Ausbauten" },
];

export function Home() {
  const { state, derived } = useStore();
  const stageIndex = STAGES.findIndex((s) => s.id === derived.houseStage);
  const stage = STAGES[Math.max(0, stageIndex)]!;

  const mission = state.portfolio.holdings.length === 0
    ? "Tätige dein erstes Investment im Depot oder unter Entdecken."
    : derived.completedCount === 0
      ? "Schließe dein erstes Lernmodul ab und verdiene Lernkapital."
      : derived.completedCount < MODULES.length
        ? "Lerne weiter – schließe das nächste Modul ab."
        : "Stark! Du hast alle Module geschafft. Baue dein Depot weiter aus.";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.top}>
        <HLogo size={36} />
        <View>
          <Muted>Willkommen zurück</Muted>
          <H1>{state.displayName || "Hofino"}</H1>
        </View>
      </View>

      <Card>
        <H2>Dein Haus</H2>
        <View style={styles.house}>
          <Text style={styles.houseEmoji}>{stage.emoji}</Text>
          <View style={{ flex: 1, gap: space.xs }}>
            <Text style={styles.stageLabel}>{stage.label}</Text>
            <ProgressBar value={(stageIndex + 1) / STAGES.length} />
            <Muted>
              Stufe {stageIndex + 1} von {STAGES.length} · wächst durch Lernen & Meilensteine
            </Muted>
          </View>
        </View>
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.stat}>
          <Muted>Depotwert</Muted>
          <Text style={styles.statValue}>{formatEuros(derived.equityCents)}</Text>
          <Pill
            label={`${derived.performancePercent >= 0 ? "+" : ""}${derived.performancePercent.toFixed(1)} %`}
            tone={derived.performancePercent >= 0 ? "good" : "neutral"}
          />
        </Card>
        <Card style={styles.stat}>
          <Muted>Wissenspunkte</Muted>
          <Text style={styles.statValue}>{derived.knowledgePoints}</Text>
          <Pill label={`${derived.completedCount}/${MODULES.length} Module`} tone="gold" />
        </Card>
      </View>

      <Card>
        <H2>Nächste Mission</H2>
        <Body>{mission}</Body>
      </Card>

      <Card>
        <Muted>
          Lernkapital (getrennt von der Performance): {formatEuros(derived.learningCapitalCents)}. Cash:{" "}
          {formatEuros(state.portfolio.cashCents)}.
        </Muted>
      </Card>

      <ChildFamilyCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.lg, backgroundColor: colors.background },
  top: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm },
  house: { flexDirection: "row", alignItems: "center", gap: space.lg },
  houseEmoji: { fontSize: 56 },
  stageLabel: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  statsRow: { flexDirection: "row", gap: space.md },
  stat: { flex: 1 },
  statValue: { fontSize: font.h2, fontWeight: "800", color: colors.text },
});
