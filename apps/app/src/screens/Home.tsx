import React from "react";
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { formatEuros } from "@hofino/core";
import { MODULES } from "@hofino/content";
import { useStore } from "../store/store.js";
import { Body, Button, Card, H1, H2, HLogo, Muted, Pill, ProgressBar } from "../ui/components.js";
import { HouseScene } from "../ui/HouseScene.js";
import { ChildFamilyCard } from "./family/ChildFamilyCard.js";
import { StudentClassCard } from "./classroom/StudentClassCard.js";
import { useNav } from "../nav.js";
import { colors, font, space } from "../theme.js";

const STAGES: { id: string; emoji: string }[] = [
  { id: "grundstueck", emoji: "🟫" },
  { id: "fundament", emoji: "🧱" },
  { id: "waende", emoji: "🏗️" },
  { id: "dach", emoji: "🏠" },
  { id: "erstes_haus", emoji: "🏡" },
  { id: "ausbauten", emoji: "🏘️" },
];

export function Home() {
  const { state, derived, t } = useStore();
  const go = useNav();
  const stageIndex = STAGES.findIndex((s) => s.id === derived.houseStage);
  const stage = STAGES[Math.max(0, stageIndex)]!;

  const noInvest = state.portfolio.holdings.length === 0;
  const mission = noInvest
    ? t("home.missionInvest")
    : derived.completedCount === 0
      ? t("home.missionFirstModule")
      : derived.completedCount < MODULES.length
        ? t("home.missionKeepLearning")
        : t("home.missionAllDone");
  const missionTab = noInvest ? "discover" : "uebung";
  const missionCta = noInvest ? t("home.ctaDiscover") : t("home.ctaLearn");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.top}>
        <HLogo size={36} />
        <View>
          <Muted>{t("home.welcomeBack")}</Muted>
          <H1>{state.displayName || "Hofino"}</H1>
        </View>
      </View>

      <Card>
        <H2>{t("home.house")}</H2>
        <View style={styles.house}>
          <HouseScene stage={derived.houseStage} size={96} />
          <View style={{ flex: 1, gap: space.xs }}>
            <Text style={styles.stageLabel}>{t(`house.${stage.id}`)}</Text>
            <ProgressBar value={(stageIndex + 1) / STAGES.length} />
            <Muted>{t("home.stage", { n: stageIndex + 1, total: STAGES.length })}</Muted>
          </View>
        </View>
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.stat}>
          <Muted>{t("home.equity")}</Muted>
          <Text style={styles.statValue}>{formatEuros(derived.equityCents)}</Text>
          <Pill
            label={`${derived.performancePercent >= 0 ? "+" : ""}${derived.performancePercent.toFixed(1)} %`}
            tone={derived.performancePercent >= 0 ? "good" : "neutral"}
          />
        </Card>
        <Card style={styles.stat}>
          <Muted>{t("home.knowledge")}</Muted>
          <Text style={styles.statValue}>{derived.lernXpGesamt}</Text>
          <Pill label={t("home.modulesPill", { done: derived.completedCount, total: MODULES.length })} tone="gold" />
        </Card>
      </View>

      <Card>
        <H2>{t("home.mission")}</H2>
        <Body>{mission}</Body>
        <Button title={missionCta} onPress={() => go(missionTab)} testID="mission-cta" />
      </Card>

      <Card>
        <Muted>
          {t("home.capitalNote", {
            capital: formatEuros(derived.learningCapitalCents),
            cash: formatEuros(state.portfolio.cashCents),
          })}
        </Muted>
      </Card>

      <ChildFamilyCard />
      <StudentClassCard />
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
