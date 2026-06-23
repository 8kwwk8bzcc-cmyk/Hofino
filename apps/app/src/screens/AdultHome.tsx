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
  const { state, derived } = useStore();
  const go = useNav();

  const noInvest = state.portfolio.holdings.length === 0;
  const next = noInvest
    ? "Lege unter Entdecken deine erste Position an oder starte mit einem Lernmodul."
    : derived.completedCount < MODULES.length
      ? "Vertiefe dein Wissen mit dem nächsten Lernmodul."
      : "Alle Module abgeschlossen – baue dein Depot weiter aus.";
  const nextTab = noInvest ? "discover" : "uebung";
  const nextCta = noInvest ? "Jetzt entdecken" : "Zum Lernen";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.top}>
        <Muted>Übersicht</Muted>
        <H1>{state.displayName}</H1>
      </View>

      <Card>
        <View style={styles.row}>
          <View>
            <Muted>Depotwert</Muted>
            <Text style={styles.big}>{formatEuros(derived.equityCents)}</Text>
          </View>
          <Pill
            label={`${derived.performancePercent >= 0 ? "+" : ""}${derived.performancePercent.toFixed(1)} %`}
            tone={derived.performancePercent >= 0 ? "good" : "neutral"}
          />
        </View>
        <View style={styles.row}>
          <Muted>Cash: {formatEuros(state.portfolio.cashCents)}</Muted>
          <Muted>Positionen: {formatEuros(derived.holdingsValueCents)}</Muted>
        </View>
      </Card>

      <Card>
        <H2>Lernfortschritt</H2>
        <ProgressBar value={derived.completedCount / MODULES.length} />
        <View style={styles.row}>
          <Muted>
            {derived.completedCount}/{MODULES.length} Module
          </Muted>
          <Muted>{derived.knowledgePoints} Wissenspunkte</Muted>
        </View>
        <Muted>Lernkapital (getrennt von der Performance): {formatEuros(derived.learningCapitalCents)}</Muted>
      </Card>

      <Card>
        <H2>Nächster Schritt</H2>
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
