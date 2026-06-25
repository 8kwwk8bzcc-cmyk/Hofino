import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatEuros } from "@hofino/core";
import { COMPANY_PROFILES, ETF_PROFILES } from "@hofino/content";
import { useStore } from "../store/store.js";
import { Body, Button, Card, H1, H2, Muted, Pill } from "../ui/components.js";
import { colors, font, fonts, space } from "../theme.js";

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const { prices, state, toggleWatch, instrumentById, t } = useStore();
  const inst = instrumentById.get(id)!;
  const company = COMPANY_PROFILES.find((p) => p.ticker === inst.ticker);
  const etf = ETF_PROFILES.find((p) => p.ticker === inst.ticker);
  const watched = state.watchlist.includes(id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title={t("discover.back")} onPress={onBack} variant="ghost" testID="detail-back" />
      <View style={styles.detailHead}>
        <H1>{inst.name}</H1>
        <Text style={styles.price}>{formatEuros(prices.get(id) ?? 0)}</Text>
      </View>
      <View style={styles.tags}>
        <Pill label={inst.type === "etf" ? t("inst.etf") : t("inst.stock")} />
        <Pill label={inst.sector} />
        <Pill label={inst.country} />
      </View>

      <Button
        title={watched ? t("discover.watchOn") : t("discover.watchAdd")}
        onPress={() => toggleWatch(id)}
        variant="secondary"
        testID="watch-toggle"
      />

      {company && (
        <Card>
          <H2>{t("discover.about", { name: company.name })}</H2>
          <Field q={t("discover.qWhat")} a={company.whatDoes} />
          <Field q={t("discover.qEarns")} a={company.howEarns} />
          <Field q={t("discover.qProducts")} a={company.products} />
          <Field q={t("discover.qCompetitors")} a={company.competitors} />
          <Field q={t("discover.qOpportunities")} a={company.opportunities} />
          <Field q={t("discover.qRisks")} a={company.risks} />
          <Field q={t("discover.qWhy")} a={company.whyPriceMoves} />
        </Card>
      )}
      {etf && (
        <Card>
          <H2>{etf.name}</H2>
          <Muted>
            ISIN {etf.isin} · WKN {etf.wkn} · {t("discover.etfNote")}
          </Muted>
          <Field q={t("discover.etfTracks")} a={etf.tracks} />
          <Field q={t("discover.etfRegion")} a={etf.region} />
          <Field q={t("discover.etfDiversification")} a={etf.diversification} />
          <Field q={t("discover.etfCosts")} a={etf.costLogic} />
          <Field q={t("discover.qRisks")} a={etf.risks} />
        </Card>
      )}
      {!company && !etf && (
        <Card>
          <Muted>{t("discover.noProfile")}</Muted>
        </Card>
      )}

      <Card>
        <H2>{t("discover.whyExample")}</H2>
        <Body>{t("discover.whyExampleBody")}</Body>
        <Muted>{t("discover.practiceVia")}</Muted>
      </Card>
    </ScrollView>
  );
}

function Field({ q, a }: { q: string; a: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.fieldQ}>{q}</Text>
      <Body>{a}</Body>
    </View>
  );
}

function Row({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const { prices, state, instrumentById, t } = useStore();
  const inst = instrumentById.get(id);
  if (!inst) return null;
  return (
    <Pressable testID={`inst-${id}`} onPress={() => onOpen(id)} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{inst.name}</Text>
        <Muted>
          {inst.ticker} · {inst.type === "etf" ? t("inst.etf") : t("inst.stock")}
        </Muted>
      </View>
      {state.watchlist.includes(id) && <Text style={styles.star}>★</Text>}
      <Text style={styles.rowPrice}>{formatEuros(prices.get(id) ?? 0)}</Text>
    </Pressable>
  );
}

export function Discover() {
  const { state, instruments, t } = useStore();
  const [selected, setSelected] = useState<string | null>(null);

  if (selected) return <Detail id={selected} onBack={() => setSelected(null)} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>{t("discover.title")}</H1>
      <Muted>{t("discover.count", { n: instruments.length })}</Muted>

      {state.watchlist.length > 0 && (
        <Card>
          <H2>{t("discover.watchlist")}</H2>
          {state.watchlist.map((id) => (
            <Row key={id} id={id} onOpen={setSelected} />
          ))}
        </Card>
      )}

      <Card>
        <H2>{t("discover.all")}</H2>
        {instruments.map((i) => (
          <Row key={i.id} id={i.id} onOpen={setSelected} />
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, backgroundColor: colors.background },
  detailHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  price: { fontSize: font.h2, fontWeight: "800", color: colors.text, fontFamily: fonts.display },
  tags: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
  fieldQ: { fontSize: font.small, fontWeight: "700", color: colors.textMuted, fontFamily: fonts.body },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: { fontSize: font.body, fontWeight: "700", color: colors.text, fontFamily: fonts.bodyBold },
  rowPrice: { fontSize: font.body, fontWeight: "700", color: colors.text, fontFamily: fonts.display },
  star: { color: colors.accent, fontSize: font.h3, fontFamily: fonts.body },
});
