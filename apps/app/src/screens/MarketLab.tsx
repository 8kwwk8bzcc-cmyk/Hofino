import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatEuros } from "@hofino/core";
import { COMPANY_PROFILES, ETF_PROFILES } from "@hofino/content";
import { useStore } from "../store/store.js";
import { Body, Button, Card, H1, H2, Muted, Pill } from "../ui/components.js";
import { colors, font, fonts, space } from "../theme.js";

function Field({ q, a }: { q: string; a: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.fieldQ}>{q}</Text>
      <Body>{a}</Body>
    </View>
  );
}

// Markt-Labor: ein Wert wird neutral beobachtet, bevor die Übungsentscheidung getroffen wird.
export function MarketLab({
  instrumentId,
  onClose,
  onDecide,
}: {
  instrumentId: string;
  onClose: () => void;
  onDecide: () => void;
}) {
  const { instrumentById, prices, t } = useStore();
  const inst = instrumentById.get(instrumentId);
  const company = COMPANY_PROFILES.find((p) => p.ticker === inst?.ticker);
  const etf = ETF_PROFILES.find((p) => p.ticker === inst?.ticker);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title={t("discover.back")} variant="ghost" onPress={onClose} testID="marketlab-back" />
      <H1>{t("marketlab.headline")}</H1>

      <Card>
        <View style={styles.head}>
          <View>
            <H2>{inst?.name ?? "—"}</H2>
            <Muted>{inst?.ticker} · {inst?.type === "etf" ? t("inst.etf") : t("inst.stock")}</Muted>
          </View>
          <View style={{ alignItems: "flex-end", gap: space.xs }}>
            <Text style={styles.price}>{formatEuros(prices.get(instrumentId) ?? 0)}</Text>
            <Pill label={t("start.virtual")} tone="neutral" />
          </View>
        </View>
      </Card>

      {company && (
        <Card>
          <Field q={t("discover.qWhat")} a={company.whatDoes} />
          <Field q={t("discover.qEarns")} a={company.howEarns} />
          <Field q={t("discover.qWhy")} a={company.whyPriceMoves} />
          <Field q={t("discover.qRisks")} a={company.risks} />
        </Card>
      )}
      {etf && (
        <Card>
          <Field q={t("discover.etfTracks")} a={etf.tracks} />
          <Field q={t("discover.etfDiversification")} a={etf.diversification} />
          <Field q={t("discover.etfCosts")} a={etf.costLogic} />
          <Field q={t("discover.qRisks")} a={etf.risks} />
        </Card>
      )}

      <Card style={styles.observe}>
        <H2>{t("marketlab.observe")}</H2>
        <Muted>{t("marketlab.observeHint")}</Muted>
      </Card>

      <Button title={t("start.decisionCta")} onPress={onDecide} testID="marketlab-decide" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, backgroundColor: colors.background },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  price: { fontSize: font.h3, fontWeight: "800", color: colors.text, fontFamily: fonts.display },
  fieldQ: { fontSize: font.small, fontWeight: "700", color: colors.textMuted, fontFamily: fonts.body },
  observe: { backgroundColor: "#EAF2FB" },
});
