import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatEuros } from "@hofino/core";
import { useStore } from "../store/store.js";
import { Body, BodyL, Button, Card, H1, H2, InstrumentAvatar, Input, Muted, Pill, StepProgress } from "../ui/components.js";
import { TradePanel } from "../ui/TradePanel.js";
import { font, fonts, radius, space, type Palette } from "../theme.js";
import { useColors, useThemedStyles } from "../theme/ThemeProvider.js";

type Step = "welcome" | "pick" | "buy" | "learn";

// Autobauer liegen in der Quelle unter „Consumer Discretionary" – eigene Kategorie per Ticker.
const AUTO = new Set(["TSLA", "VOW3", "MBG", "BMW", "P911", "RACE", "F", "GM", "TM", "CON"]);
// Vorschläge, wenn noch nichts gesucht/gewählt wurde.
const POPULAR = ["AAPL", "TSLA", "NKE", "NVDA", "ADS", "SAP"];

interface Instrument {
  id: string;
  ticker: string;
  name: string;
  type: string;
  sector?: string;
}

const CATEGORIES: { key: string; labelKey: string; match: (i: Instrument) => boolean }[] = [
  { key: "tech", labelKey: "tutorial.catTech", match: (i) => i.sector === "Technology" },
  { key: "auto", labelKey: "tutorial.catAuto", match: (i) => AUTO.has(i.ticker) },
  {
    key: "brands",
    labelKey: "tutorial.catBrands",
    match: (i) => !AUTO.has(i.ticker) && (i.sector === "Consumer Discretionary" || i.sector === "Consumer Staples"),
  },
  { key: "media", labelKey: "tutorial.catMedia", match: (i) => i.sector === "Communication Services" },
  { key: "health", labelKey: "tutorial.catHealth", match: (i) => i.sector === "Health Care" },
  { key: "money", labelKey: "tutorial.catMoney", match: (i) => i.sector === "Financials" },
  {
    key: "industry",
    labelKey: "tutorial.catIndustry",
    match: (i) => ["Industrials", "Energy", "Utilities", "Materials"].includes(i.sector ?? ""),
  },
];

export function WelcomeTutorial({ onFinish, onSkip }: { onFinish: () => void; onSkip: () => void }) {
  const { instruments, prices, instrumentById, t } = useStore();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [step, setStep] = useState<Step>("welcome");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  const stocks = useMemo(() => instruments.filter((i) => i.type === "stock"), [instruments]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: Instrument[];
    if (q) {
      list = stocks.filter((i) => i.name.toLowerCase().includes(q) || i.ticker.toLowerCase().includes(q));
    } else if (category) {
      const cat = CATEGORIES.find((x) => x.key === category);
      list = cat ? stocks.filter(cat.match) : stocks;
    } else {
      list = stocks.filter((i) => POPULAR.includes(i.ticker));
    }
    return list.slice(0, 12);
  }, [stocks, query, category]);

  const stepNum = step === "welcome" ? 1 : step === "pick" ? 2 : step === "buy" ? 3 : 4;
  const chosenInst = chosen ? instrumentById.get(chosen) : undefined;

  const pick = (id: string) => {
    setChosen(id);
    setStep("buy");
  };

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headRow}>
          <Pill label={t("tutorial.badge")} tone="good" />
          <Pressable onPress={onSkip} testID="tutorial-skip" hitSlop={8}>
            <Text style={styles.skip}>{t("tutorial.skip")}</Text>
          </Pressable>
        </View>
        <StepProgress total={4} filled={stepNum} />

        {step === "welcome" && (
          <Card>
            <H1>{t("tutorial.welcomeTitle")}</H1>
            <BodyL>{t("tutorial.welcomeBody")}</BodyL>
            <Button title={t("tutorial.welcomeStart")} onPress={() => setStep("pick")} testID="tutorial-start" />
          </Card>
        )}

        {step === "pick" && (
          <>
            <Card>
              <H2>{t("tutorial.pickTitle")}</H2>
              <Muted>{t("tutorial.pickBody")}</Muted>
              <Input
                value={query}
                onChangeText={(v) => {
                  setQuery(v);
                  setCategory(null);
                }}
                placeholder={t("tutorial.searchPlaceholder")}
                autoCapitalize="none"
                testID="tutorial-search"
              />
              <Muted>{t("tutorial.noIdea")}</Muted>
              <View style={styles.chips}>
                {CATEGORIES.map((cat) => {
                  const on = category === cat.key && !query.trim();
                  return (
                    <Pressable
                      key={cat.key}
                      testID={`tutorial-cat-${cat.key}`}
                      onPress={() => {
                        setQuery("");
                        setCategory(cat.key);
                      }}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(cat.labelKey)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
            <Card>
              {results.length === 0 ? (
                <Muted>{t("tutorial.noResults")}</Muted>
              ) : (
                results.map((i) => (
                  <Pressable key={i.id} testID={`tutorial-pick-${i.ticker}`} onPress={() => pick(i.id)} style={styles.row}>
                    <View style={styles.rowLeft}>
                      <InstrumentAvatar name={i.name} symbol={i.ticker} type={i.type} size={36} />
                      <Text style={styles.rowName}>{i.name}</Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.rowPrice}>{formatEuros(prices.get(i.id) ?? 0)}</Text>
                      <Text style={styles.rowAdd}>{t("tutorial.choose")}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </Card>
          </>
        )}

        {step === "buy" && chosenInst && (
          <Card>
            <View style={styles.rowLeft}>
              <InstrumentAvatar name={chosenInst.name} symbol={chosenInst.ticker} type={chosenInst.type} size={44} />
              <H2>{chosenInst.name}</H2>
            </View>
            <Muted>{t("tutorial.buyBody")}</Muted>
            <TradePanel instrumentId={chosenInst.id} mode="buy" onSuccess={() => setStep("learn")} />
            <Pressable onPress={() => setStep("pick")} testID="tutorial-pick-other" hitSlop={8}>
              <Text style={styles.link}>{t("tutorial.buyAnother")}</Text>
            </Pressable>
          </Card>
        )}

        {step === "learn" && (
          <Card>
            <H1>{t("tutorial.learnTitle")}</H1>
            <BodyL>{t("tutorial.learnBody")}</BodyL>
            <Button title={t("tutorial.learnGo")} onPress={onFinish} testID="tutorial-finish" />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg, zIndex: 50 },
    container: { padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 },
    headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    skip: { fontSize: font.body, color: c.muted, fontFamily: fonts.body },
    link: { fontSize: font.body, color: c.green, fontFamily: fonts.bodySemi, paddingTop: space.sm },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xs },
    chip: {
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
    },
    chipOn: { borderColor: c.green, backgroundColor: c.mint },
    chipText: { fontSize: font.small, fontFamily: fonts.bodyMed, color: c.muted },
    chipTextOn: { color: c.success, fontFamily: fonts.bodySemi },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: space.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1 },
    rowName: { fontSize: font.body, fontFamily: fonts.bodySemi, color: c.text, flexShrink: 1 },
    rowRight: { alignItems: "flex-end" },
    rowPrice: { fontSize: font.body, fontFamily: fonts.display, color: c.text },
    rowAdd: { fontSize: font.caption, fontFamily: fonts.bodySemi, color: c.green },
  });
