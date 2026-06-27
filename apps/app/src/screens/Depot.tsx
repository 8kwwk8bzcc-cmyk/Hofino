import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatEuros } from "@hofino/core";
import { useStore, type DividendEntry, type JournalEntry } from "../store/store.js";
import { Body, Button, Card, H1, H2, InstrumentAvatar, Muted, Pill } from "../ui/components.js";
import { TradePanel } from "../ui/TradePanel.js";
import { useNav } from "../nav.js";
import { font, fonts, space, type Palette } from "../theme.js";
import { useColors, useThemedStyles } from "../theme/ThemeProvider.js";

export function Depot() {
  const { state, prices, derived, instrumentById, fetchDecisionJournal, fetchDividends, t } = useStore();
  const go = useNav();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [sellId, setSellId] = useState<string | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [dividends, setDividends] = useState<DividendEntry[]>([]);
  const holdings = state.portfolio.holdings;

  const loadJournal = useCallback(async () => {
    setJournal(await fetchDecisionJournal());
    setDividends(await fetchDividends());
  }, [fetchDecisionJournal, fetchDividends]);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  const actionText = (e: JournalEntry) =>
    e.action === "hold"
      ? t("depot.actHold")
      : t(e.action === "buy" ? "depot.actBuy" : "depot.actSell", { n: e.quantity });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>{t("depot.title")}</H1>

      <Card>
        <View style={styles.headRow}>
          <View>
            <Muted>{t("start.portfolio")}</Muted>
            <Text style={styles.big}>{formatEuros(derived.equityCents)}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: space.xs }}>
            <Pill label={t("start.virtual")} tone="neutral" />
            <Text style={styles.calmPct}>
              {t("depot.today", {
                pct: `${derived.performancePercent >= 0 ? "+" : ""}${derived.performancePercent.toFixed(1)}`,
              })}
            </Text>
          </View>
        </View>
        <View style={styles.splitRow}>
          <Muted>{t("depot.cash", { cash: formatEuros(state.portfolio.cashCents) })}</Muted>
          <Muted>{t("depot.positions", { value: formatEuros(derived.holdingsValueCents) })}</Muted>
        </View>
      </Card>

      <Card style={styles.feeCard}>
        <Body>{t("depot.feeTitle")}</Body>
        <Muted>{t("depot.feeBody")}</Muted>
      </Card>

      {holdings.length === 0 ? (
        <Card>
          <H2>{t("depot.noPositionsTitle")}</H2>
          <Body>{t("depot.noPositionsBody")}</Body>
        </Card>
      ) : (
        <Card>
          <H2>{t("depot.yourPositions")}</H2>
          {holdings.map((h) => {
            const inst = instrumentById.get(h.instrumentId);
            const price = prices.get(h.instrumentId) ?? 0;
            const value = price * h.quantity;
            const plPct = h.avgCostCents > 0 ? ((price - h.avgCostCents) / h.avgCostCents) * 100 : 0;
            return (
              <View key={h.instrumentId} style={styles.pos} testID={`pos-${h.instrumentId}`}>
                <Pressable
                  style={({ pressed }) => [styles.posTop, pressed && { opacity: 0.6 }]}
                  onPress={() => setSellId(sellId === h.instrumentId ? null : h.instrumentId)}
                >
                  <InstrumentAvatar name={inst?.name ?? h.instrumentId} symbol={inst?.ticker ?? undefined} type={inst?.type} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.posName}>{inst?.name ?? h.instrumentId}</Text>
                    <Muted>{t("depot.qtyAvg", { qty: h.quantity, avg: formatEuros(h.avgCostCents) })}</Muted>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.posVal}>{formatEuros(value)}</Text>
                    <Text style={[styles.pl, { color: plPct >= 0 ? c.green : c.danger }]}>
                      {plPct >= 0 ? "+" : ""}
                      {plPct.toFixed(1)} %
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.posActions}>
                  <Button
                    title={t("depot.view")}
                    variant="ghost"
                    onPress={() => go("values", { instrumentId: h.instrumentId })}
                    testID={`view-${h.instrumentId}`}
                  />
                  <Button
                    title={t("trade.sell")}
                    variant="secondary"
                    onPress={() => setSellId(sellId === h.instrumentId ? null : h.instrumentId)}
                    testID={`decide-${h.instrumentId}`}
                  />
                </View>
                {sellId === h.instrumentId && <TradePanel instrumentId={h.instrumentId} mode="sell" />}
              </View>
            );
          })}
        </Card>
      )}

      {dividends.length > 0 && (
        <Card>
          <H2>{t("depot.dividendsTitle")}</H2>
          <Muted>{t("depot.dividendsHint")}</Muted>
          {dividends.map((d) => (
            <View key={d.id} style={styles.entry}>
              <View style={styles.entryHead}>
                <Text style={styles.entryName}>{instrumentById.get(d.instrumentId)?.name ?? "—"}</Text>
                <Text style={styles.divAmount}>+{formatEuros(d.amountCents)}</Text>
              </View>
              <Muted>{d.period}</Muted>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <H2>{t("depot.journalTitle")}</H2>
        {journal.length === 0 ? (
          <Muted>{t("depot.journalEmpty")}</Muted>
        ) : (
          journal.map((e) => (
            <View key={e.id} style={styles.entry}>
              <View style={styles.entryHead}>
                <Text style={styles.entryName}>{instrumentById.get(e.instrumentId ?? "")?.name ?? "—"}</Text>
                <Text style={styles.entryAction}>{actionText(e)}</Text>
              </View>
              <Muted>{t(`reason.${e.reasonType}`)}</Muted>
              <Muted>{e.createdAt.slice(0, 10)}</Muted>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: space.lg, gap: space.md, backgroundColor: c.bg },
    headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    big: { fontSize: font.h1, fontWeight: "800", color: c.text, fontFamily: fonts.display },
    calmPct: { fontSize: font.small, color: c.muted, fontWeight: "600", fontFamily: fonts.display },
    splitRow: { flexDirection: "row", justifyContent: "space-between" },
    feeCard: { backgroundColor: c.softBlue },
    pos: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border, gap: space.sm },
    posTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
    posName: { fontSize: font.body, fontWeight: "700", color: c.text, fontFamily: fonts.bodyBold },
    posVal: { fontSize: font.body, fontWeight: "700", color: c.text, fontFamily: fonts.display },
    pl: { fontSize: font.small, fontWeight: "700", fontFamily: fonts.display },
    posActions: { flexDirection: "row", gap: space.sm },
    entry: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border, gap: 2 },
    entryHead: { flexDirection: "row", justifyContent: "space-between" },
    entryName: { fontSize: font.body, fontWeight: "700", color: c.text, fontFamily: fonts.bodyBold },
    entryAction: { fontSize: font.body, fontWeight: "700", color: c.navy, fontFamily: fonts.display },
    divAmount: { fontSize: font.body, fontWeight: "700", color: c.success, fontFamily: fonts.display },
  });
