import React from "react";
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { formatEuros } from "@hofino/core";
import { MODULES } from "@hofino/content";
import { useStore } from "../store/store.js";
import { Body, Button, Card, H1, H2, Muted, Pill, ProgressBar } from "../ui/components.js";
import { useNav } from "../nav.js";
import { colors, font, space } from "../theme.js";

// Erwachsenen-Übersicht: sachlich, ohne Haus-Metapher, Fokus auf Depot & Lernen.
export function AdultHome() {
  const { state, derived, t } = useStore();
  const go = useNav();

  const noInvest = state.portfolio.holdings.length === 0;
  const next = noInvest
    ? t("adult.next1")
    : derived.completedCount < MODULES.length
      ? t("adult.next2")
      : t("adult.next3");
  const nextTab = noInvest ? "values" : "learn";
  const nextCta = noInvest ? t("home.ctaDiscover") : t("home.ctaLearn");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.top}>
        <Muted>{t("tab.overview")}</Muted>
        <H1>{state.displayName}</H1>
      </View>

      <Card>
        <View style={styles.row}>
          <View>
            <Muted>{t("home.equity")}</Muted>
            <Text style={styles.big}>{formatEuros(derived.equityCents)}</Text>
          </View>
          <Pill
            label={`${derived.performancePercent >= 0 ? "+" : ""}${derived.performancePercent.toFixed(1)} %`}
            tone={derived.performancePercent >= 0 ? "good" : "neutral"}
          />
        </View>
        <View style={styles.row}>
          <Muted>{t("depot.cash", { cash: formatEuros(state.portfolio.cashCents) })}</Muted>
          <Muted>{t("depot.positions", { value: formatEuros(derived.holdingsValueCents) })}</Muted>
        </View>
      </Card>

      <Card>
        <H2>{t("adult.learnProgress")}</H2>
        <ProgressBar value={derived.completedCount / MODULES.length} />
        <View style={styles.row}>
          <Muted>{t("home.modulesPill", { done: derived.completedCount, total: MODULES.length })}</Muted>
          <Muted>{t("adult.knowledgePoints", { xp: derived.lernXpGesamt })}</Muted>
        </View>
        <Muted>{t("adult.learnCapital", { capital: formatEuros(derived.learningCapitalCents) })}</Muted>
      </Card>

      <Card>
        <H2>{t("adult.nextStep")}</H2>
        <Body>{next}</Body>
        <Button title={nextCta} onPress={() => go(nextTab)} testID="next-cta" />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.lg, backgroundColor: colors.background },
  top: { marginTop: space.sm },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  big: { fontSize: font.h1, fontWeight: "800", color: colors.text },
});
