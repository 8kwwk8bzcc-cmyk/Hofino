import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatEuros, rank } from "@hofino/core";
import { MODULES } from "@hofino/content";
import { useStore, type ChildSummary } from "../../store/store.js";
import { Body, Card, H1, H2, Muted, Pill } from "../../ui/components.js";
import { colors, font, space } from "../../theme.js";

// Eltern-Dashboard: Lernfortschritt + Depotentwicklung der verknüpften Kinder (nur lesend).
export function FamilyHome() {
  const { fetchFamily, state } = useStore();
  const [children, setChildren] = useState<ChildSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchFamily().then((c) => {
      if (active) setChildren(c);
    });
    return () => {
      active = false;
    };
  }, [fetchFamily, state.pendingLinks]);

  const challenge = rank((children ?? []).map((c) => ({ id: c.profileId, score: c.knowledgePoints })), 10);
  const nameById = new Map((children ?? []).map((c) => [c.profileId, c.displayName]));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.top}>
        <Muted>Family</Muted>
        <H1>{state.displayName}</H1>
      </View>

      {children === null ? (
        <Muted>Lädt …</Muted>
      ) : children.length === 0 ? (
        <Card>
          <H2>Noch kein Kind verknüpft</H2>
          <Body>Wechsle zu „Verknüpfen" und gib den Code deines Kindes ein. Dein Kind gibt die Verbindung dann frei.</Body>
        </Card>
      ) : (
        <>
          {children.map((c) => (
            <Card key={c.profileId}>
              <View style={styles.row}>
                <H2>{c.displayName}</H2>
                <Pill
                  label={`${c.performancePercent >= 0 ? "+" : ""}${c.performancePercent.toFixed(1)} %`}
                  tone={c.performancePercent >= 0 ? "good" : "neutral"}
                />
              </View>
              <View style={styles.row}>
                <Muted>Depotwert</Muted>
                <Text style={styles.val}>{formatEuros(c.equityCents)}</Text>
              </View>
              <View style={styles.row}>
                <Muted>Lernfortschritt</Muted>
                <Text style={styles.val}>
                  {c.completedCount}/{MODULES.length} Module
                </Text>
              </View>
              <View style={styles.row}>
                <Muted>Wissenspunkte</Muted>
                <Text style={styles.val}>{c.knowledgePoints}</Text>
              </View>
              <Muted>Nur-Lese-Ansicht – du kannst das Depot nicht verändern.</Muted>
            </Card>
          ))}

          {children.length > 1 && (
            <Card>
              <H2>Familien-Challenge</H2>
              <Muted>Wer sammelt die meisten Wissenspunkte?</Muted>
              {challenge.map((e) => (
                <View key={e.id} style={styles.row}>
                  <Text style={styles.rank}>
                    {e.awarded && e.rank <= 3 ? "🏅" : ""} {e.rank}. {nameById.get(e.id)}
                  </Text>
                  <Text style={styles.val}>{Math.round(e.score)} P</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, backgroundColor: colors.background },
  top: { marginTop: space.sm },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  val: { fontSize: font.body, fontWeight: "700", color: colors.text },
  rank: { fontSize: font.body, color: colors.text },
});
