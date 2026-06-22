import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatEuros } from "@hofino/core";
import { useStore } from "../store/store.js";
import { INSTRUMENT_BY_ID } from "../data/instruments.js";
import { Body, Card, H1, H2, Muted, Pill } from "../ui/components.js";
import { TradePanel } from "../ui/TradePanel.js";
import { colors, font, space } from "../theme.js";

export function Depot() {
  const { state, prices, derived } = useStore();
  const [sellId, setSellId] = useState<string | null>(null);
  const holdings = state.portfolio.holdings;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>Depot</H1>

      <Card>
        <View style={styles.headRow}>
          <View>
            <Muted>Depotwert gesamt</Muted>
            <Text style={styles.big}>{formatEuros(derived.equityCents)}</Text>
          </View>
          <Pill
            label={`${derived.performancePercent >= 0 ? "+" : ""}${derived.performancePercent.toFixed(1)} %`}
            tone={derived.performancePercent >= 0 ? "good" : "neutral"}
          />
        </View>
        <View style={styles.splitRow}>
          <Muted>Cash: {formatEuros(state.portfolio.cashCents)}</Muted>
          <Muted>Positionen: {formatEuros(derived.holdingsValueCents)}</Muted>
        </View>
      </Card>

      {holdings.length === 0 ? (
        <Card>
          <H2>Noch keine Positionen</H2>
          <Body>Geh zu „Entdecken" und kaufe deine erste Aktie oder deinen ersten ETF.</Body>
        </Card>
      ) : (
        <Card>
          <H2>Deine Positionen</H2>
          {holdings.map((h) => {
            const inst = INSTRUMENT_BY_ID.get(h.instrumentId);
            const price = prices.get(h.instrumentId) ?? 0;
            const value = price * h.quantity;
            const plPct = h.avgCostCents > 0 ? ((price - h.avgCostCents) / h.avgCostCents) * 100 : 0;
            return (
              <Pressable
                key={h.instrumentId}
                testID={`pos-${h.instrumentId}`}
                onPress={() => setSellId(sellId === h.instrumentId ? null : h.instrumentId)}
                style={styles.pos}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.posName}>{inst?.name ?? h.instrumentId}</Text>
                  <Muted>
                    {h.quantity} Stück · Ø {formatEuros(h.avgCostCents)}
                  </Muted>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.posVal}>{formatEuros(value)}</Text>
                  <Text style={[styles.pl, { color: plPct >= 0 ? colors.secondary : colors.danger }]}>
                    {plPct >= 0 ? "+" : ""}
                    {plPct.toFixed(1)} %
                  </Text>
                </View>
              </Pressable>
            );
          })}
          <Muted>Tippe eine Position an, um zu verkaufen.</Muted>
        </Card>
      )}

      {sellId && (
        <Card>
          <H2>{INSTRUMENT_BY_ID.get(sellId)?.name} verkaufen</H2>
          <TradePanel instrumentId={sellId} mode="sell" />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, backgroundColor: colors.background },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  big: { fontSize: font.h1, fontWeight: "800", color: colors.text },
  splitRow: { flexDirection: "row", justifyContent: "space-between" },
  pos: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  posName: { fontSize: font.body, fontWeight: "700", color: colors.text },
  posVal: { fontSize: font.body, fontWeight: "700", color: colors.text },
  pl: { fontSize: font.small, fontWeight: "700" },
});
