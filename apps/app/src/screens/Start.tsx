import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatEuros } from "@hofino/core";
import { wissenslevel } from "@hofino/learning";
import { useStore, type DailyPlan } from "../store/store.js";
import { Body, Button, Card, H1, H2, Muted, Pill } from "../ui/components.js";
import { DecisionFlow } from "./DecisionFlow.js";
import { MarketLab } from "./MarketLab.js";
import { ChildFamilyCard } from "./family/ChildFamilyCard.js";
import { StudentClassCard } from "./classroom/StudentClassCard.js";
import { useNav } from "../nav.js";
import { colors, font, fonts, space } from "../theme.js";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function StatusDot({ status }: { status: DailyPlan["woche"][number]["status"] }) {
  const bg = status === "completed" ? colors.secondary : status === "today_open" ? colors.accent : "transparent";
  const border = status === "missed" || status === "future" ? colors.border : bg;
  return <View style={[styles.dot, { backgroundColor: bg, borderColor: border }]} />;
}

// Eine Aufgaben-Karte des Tagesplans (Lernmission / Markt-Labor / Übungsentscheidung).
function TaskCard({
  step,
  title,
  content,
  meta,
  done,
  locked,
  cta,
  onPress,
}: {
  step: number;
  title: string;
  content: string;
  meta: string;
  done: boolean;
  locked?: boolean;
  cta: string;
  onPress: () => void;
}) {
  const { t } = useStore();
  return (
    <Card style={done ? styles.cardDone : undefined}>
      <View style={styles.taskHead}>
        <Text style={styles.step}>{t("start.step", { n: step })}</Text>
        {done ? <Pill label={t("start.done")} tone="good" /> : locked ? <Pill label={t("start.locked")} tone="neutral" /> : null}
      </View>
      <H2>{title}</H2>
      <Body>{content}</Body>
      <Muted>{meta}</Muted>
      {!done && (
        <Button title={cta} onPress={onPress} disabled={locked} variant={locked ? "secondary" : undefined} testID={`task-${step}`} />
      )}
    </Card>
  );
}

export function Start() {
  const { state, derived, t, fetchDailyPlan, markMarketViewed } = useStore();
  const go = useNav();
  const isAdult = state.role === "adult";

  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);

  const reload = useCallback(async () => {
    setPlan(await fetchDailyPlan());
    setLoaded(true);
  }, [fetchDailyPlan]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!loaded) return null;

  if (marketOpen && plan?.instrumentId) {
    return (
      <MarketLab
        instrumentId={plan.instrumentId}
        onClose={async () => {
          setMarketOpen(false);
          await reload();
        }}
        onDecide={() => {
          setMarketOpen(false);
          setDecisionOpen(true);
        }}
      />
    );
  }

  if (decisionOpen && plan?.instrumentId) {
    return (
      <DecisionFlow
        instrumentId={plan.instrumentId}
        instrumentName={plan.instrumentName ?? "—"}
        onClose={() => setDecisionOpen(false)}
        onDone={async () => {
          setDecisionOpen(false);
          await reload();
        }}
      />
    );
  }

  const openCount = plan ? [plan.learningDone, plan.marketViewed, plan.decisionDone].filter((x) => !x).length : 3;
  const allDone = openCount === 0;
  const lvl = wissenslevel(derived.lernXpGesamt);
  const toNext = Math.max(0, lvl.xpFuerNaechstes - lvl.xpImLevel);

  const openMarket = async () => {
    await markMarketViewed();
    setMarketOpen(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.summary}>
        <H1>{t("start.headline")}</H1>
        <Muted>{t("start.subtitle")}</Muted>
        <Text style={styles.status}>{allDone ? t("start.allDone") : t("start.openCount", { n: openCount })}</Text>
        <View style={styles.week}>
          {WEEKDAYS.map((d, i) => (
            <View key={d} style={styles.weekDay}>
              <Muted>{d}</Muted>
              <StatusDot status={plan?.woche[i]?.status ?? "future"} />
            </View>
          ))}
        </View>
      </Card>

      <TaskCard
        step={1}
        title={t("start.learnTitle")}
        content={plan?.konzeptTitel ?? t("start.learnFallback")}
        meta={t("start.learnMeta")}
        done={Boolean(plan?.learningDone)}
        cta={t("start.learnCta")}
        onPress={() => go("learn")}
      />

      <TaskCard
        step={2}
        title={t("start.marketTitle")}
        content={t("start.marketContent", { name: plan?.instrumentName ?? "—" })}
        meta={t("start.marketMeta")}
        done={Boolean(plan?.marketViewed)}
        cta={t("start.marketCta")}
        onPress={openMarket}
      />

      {plan?.decisionDone ? (
        <Card style={styles.cardDone}>
          <View style={styles.taskHead}>
            <Text style={styles.step}>{t("start.step", { n: 3 })}</Text>
            <Pill label={t("start.done")} tone="good" />
          </View>
          <H2>{t("start.decisionTitle")}</H2>
          <Body>{t("decision.doneNote")}</Body>
        </Card>
      ) : (
        <TaskCard
          step={3}
          title={t("start.decisionTitle")}
          content={t("start.decisionContent")}
          meta={t("start.decisionMeta")}
          done={false}
          locked={!plan?.marketViewed}
          cta={t("start.decisionCta")}
          onPress={() => setDecisionOpen(true)}
        />
      )}

      <View style={styles.metricsRow}>
        <Card style={styles.metric}>
          <Muted>{t("start.knowledge")}</Muted>
          <Text style={styles.metricValue}>{derived.lernXpGesamt} XP</Text>
          <Muted>{t("start.toNextLevel", { xp: toNext, n: lvl.level + 1 })}</Muted>
        </Card>
        <Card style={styles.metric}>
          <Muted>{t("start.portfolio")}</Muted>
          <Text style={styles.metricValue}>{formatEuros(derived.equityCents)}</Text>
          <Pill label={t("start.virtual")} tone="neutral" />
        </Card>
      </View>

      {!isAdult && (
        <>
          <ChildFamilyCard />
          <StudentClassCard />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.lg, backgroundColor: colors.background },
  summary: { gap: space.sm },
  status: { fontWeight: "700", color: colors.primary, fontFamily: fonts.bodyBold },
  week: { flexDirection: "row", justifyContent: "space-between", marginTop: space.xs },
  weekDay: { alignItems: "center", gap: space.xs },
  dot: { width: 14, height: 14, borderRadius: 999, borderWidth: 2 },
  taskHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  step: { fontSize: font.small, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", fontFamily: fonts.bodyBold },
  cardDone: { borderColor: colors.secondary, backgroundColor: "#F0FDF4" },
  metricsRow: { flexDirection: "row", gap: space.md },
  metric: { flex: 1 },
  metricValue: { fontSize: font.h2, fontWeight: "800", color: colors.text, fontFamily: fonts.display },
});
