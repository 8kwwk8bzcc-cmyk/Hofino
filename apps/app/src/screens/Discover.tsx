import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatEuros } from "@hofino/core";
import { COMPANY_PROFILES, ETF_PROFILES } from "@hofino/content";
import { useStore } from "../store/store.js";
import { INSTRUMENTS, INSTRUMENT_BY_ID } from "../data/instruments.js";
import { Body, Button, Card, H1, H2, Muted, Pill } from "../ui/components.js";
import { TradePanel } from "../ui/TradePanel.js";
import { colors, font, space } from "../theme.js";

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const { prices, state, toggleWatch } = useStore();
  const inst = INSTRUMENT_BY_ID.get(id)!;
  const company = COMPANY_PROFILES.find((p) => p.ticker === inst.ticker);
  const etf = ETF_PROFILES.find((p) => p.ticker === inst.ticker);
  const watched = state.watchlist.includes(id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="‹ Zurück" onPress={onBack} variant="ghost" testID="detail-back" />
      <View style={styles.detailHead}>
        <H1>{inst.name}</H1>
        <Text style={styles.price}>{formatEuros(prices.get(id) ?? 0)}</Text>
      </View>
      <View style={styles.tags}>
        <Pill label={inst.type === "etf" ? "ETF" : "Aktie"} />
        <Pill label={inst.sector} />
        <Pill label={inst.country} />
      </View>

      <Button
        title={watched ? "★ Auf Wunschliste" : "☆ Zur Wunschliste"}
        onPress={() => toggleWatch(id)}
        variant="secondary"
        testID="watch-toggle"
      />

      {company && (
        <Card>
          <H2>Über {company.name}</H2>
          <Field q="Was macht das Unternehmen?" a={company.whatDoes} />
          <Field q="Wie verdient es Geld?" a={company.howEarns} />
          <Field q="Bekannte Produkte" a={company.products} />
          <Field q="Chancen" a={company.opportunities} />
          <Field q="Risiken" a={company.risks} />
          <Field q="Warum kann der Kurs schwanken?" a={company.whyPriceMoves} />
        </Card>
      )}
      {etf && (
        <Card>
          <H2>{etf.name}</H2>
          <Muted>
            ISIN {etf.isin} · WKN {etf.wkn} · neutrales Lernbeispiel, keine Kaufempfehlung
          </Muted>
          <Field q="Was bildet der ETF ab?" a={etf.tracks} />
          <Field q="Streuung" a={etf.diversification} />
          <Field q="Kosten" a={etf.costLogic} />
          <Field q="Risiken" a={etf.risks} />
        </Card>
      )}
      {!company && !etf && (
        <Card>
          <Muted>Für dieses Instrument liegt noch kein Profil vor (kommt mit weiteren Inhalten).</Muted>
        </Card>
      )}

      <Card>
        <H2>Kaufen</H2>
        <TradePanel instrumentId={id} mode="buy" />
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
  const { prices, state } = useStore();
  const inst = INSTRUMENT_BY_ID.get(id)!;
  return (
    <Pressable testID={`inst-${id}`} onPress={() => onOpen(id)} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{inst.name}</Text>
        <Muted>
          {inst.ticker} · {inst.type === "etf" ? "ETF" : "Aktie"}
        </Muted>
      </View>
      {state.watchlist.includes(id) && <Text style={styles.star}>★</Text>}
      <Text style={styles.rowPrice}>{formatEuros(prices.get(id) ?? 0)}</Text>
    </Pressable>
  );
}

export function Discover() {
  const { state } = useStore();
  const [selected, setSelected] = useState<string | null>(null);

  if (selected) return <Detail id={selected} onBack={() => setSelected(null)} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>Entdecken</H1>
      <Muted>{INSTRUMENTS.length} Werte: bekannte Unternehmen und ETFs als Lernbeispiele.</Muted>

      {state.watchlist.length > 0 && (
        <Card>
          <H2>Deine Wunschliste</H2>
          {state.watchlist.map((id) => (
            <Row key={id} id={id} onOpen={setSelected} />
          ))}
        </Card>
      )}

      <Card>
        <H2>Alle Werte</H2>
        {INSTRUMENTS.map((i) => (
          <Row key={i.id} id={i.id} onOpen={setSelected} />
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, backgroundColor: colors.background },
  detailHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  price: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  tags: { flexDirection: "row", gap: space.sm, flexWrap: "wrap" },
  fieldQ: { fontSize: font.small, fontWeight: "700", color: colors.textMuted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: { fontSize: font.body, fontWeight: "700", color: colors.text },
  rowPrice: { fontSize: font.body, fontWeight: "700", color: colors.text },
  star: { color: colors.accent, fontSize: font.h3 },
});
