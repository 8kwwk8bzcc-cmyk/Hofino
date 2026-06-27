import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatEuros, rank } from "@hofino/core";
import { alleKonzepte } from "@hofino/learning";
import {
  useStore,
  type ChallengeMetric,
  type ClassChallenge,
  type ClassOverviewRow,
  type TeacherClass as TClass,
} from "../../store/store.js";
import { Body, Button, Card, H1, H2, Muted, Pill, ProgressBar } from "../../ui/components.js";
import {
  CHALLENGE_METRICS,
  CHALLENGE_METRIC_ORDER,
  challengeReached,
  challengeValue,
  type ChallengeStudentStats,
} from "../../challengeMetrics.js";
import { font, fonts, radius, space, type Palette } from "../../theme.js";
import { useColors, useThemedStyles } from "../../theme/ThemeProvider.js";

export function TeacherClass() {
  const {
    fetchTeacherClass,
    fetchClassOverview,
    createClass,
    fetchAssignments,
    assignKonzept,
    unassignKonzept,
    fetchClassChallenges,
    createChallenge,
    deleteChallenge,
    t,
  } = useStore();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const [cls, setCls] = useState<TClass | null>(null);
  const [rows, setRows] = useState<ClassOverviewRow[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [challenges, setChallenges] = useState<ClassChallenge[]>([]);
  const [metric, setMetric] = useState<ChallengeMetric>("konzepte");
  const [target, setTarget] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const konzepte = alleKonzepte();

  const reload = useCallback(async () => {
    const c = await fetchTeacherClass();
    setCls(c);
    setRows(c ? await fetchClassOverview(c.id) : []);
    setAssigned(c ? new Set(await fetchAssignments(c.id)) : new Set());
    setChallenges(c ? await fetchClassChallenges(c.id) : []);
    setLoaded(true);
  }, [fetchTeacherClass, fetchClassOverview, fetchAssignments, fetchClassChallenges]);

  // Lesbares Ziel-Label aus Metrik + Zielzahl (auch als gespeicherter Titel verwendet).
  const goalLabel = useCallback((m: ChallengeMetric, n: number) => t(CHALLENGE_METRICS[m].goalKey, { n }), [t]);
  // Grobe Aggregate einer Klassenzeile → Challenge-Stats (Datenschutz: nur Zahlen).
  const statsFromRow = (r: ClassOverviewRow): ChallengeStudentStats => ({
    konzepte: r.modulesCompleted,
    xp: r.knowledgePoints,
    branchen: r.sectorsCount,
    regionen: r.regionsCount,
    etf: r.etfCount,
    orders: r.ordersCount,
  });
  // Wie viele Schüler haben das Ziel erreicht?
  const reachedCount = (ch: ClassChallenge) =>
    rows.filter((r) => challengeReached(ch.metric, challengeValue(ch.metric, statsFromRow(r)), ch.target)).length;

  const createChallengeFromForm = async () => {
    if (!cls) return;
    const n = parseInt(target, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    await createChallenge(cls.id, metric, n, goalLabel(metric, n));
    setTarget("");
    await reload();
  };

  const removeChallenge = async (id: string) => {
    await deleteChallenge(id);
    await reload();
  };

  const toggleAssign = async (konzeptId: string) => {
    if (!cls) return;
    const next = new Set(assigned);
    if (next.has(konzeptId)) {
      next.delete(konzeptId);
      setAssigned(next);
      await unassignKonzept(cls.id, konzeptId);
    } else {
      next.add(konzeptId);
      setAssigned(next);
      await assignKonzept(cls.id, konzeptId);
    }
  };

  useEffect(() => {
    reload();
  }, [reload]);

  const create = async () => {
    setMsg(null);
    const r = await createClass(name.trim());
    if (r.ok) {
      setName("");
      await reload();
    } else {
      setMsg(r.message);
    }
  };

  const ranked = rank(rows.map((r) => ({ id: r.childProfileId, score: r.knowledgePoints })), 10);
  const nameById = new Map(rows.map((r) => [r.childProfileId, r.displayName]));

  if (!loaded) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>{t("tab.class")}</H1>

      {!cls ? (
        <Card>
          <H2>{t("class.create")}</H2>
          <Body>{t("class.createBody")}</Body>
          <TextInput
            testID="class-name-input"
            value={name}
            onChangeText={setName}
            placeholder={t("class.namePlaceholder")}
            placeholderTextColor={c.muted}
            style={styles.input}
          />
          <Button title={t("class.create")} onPress={create} disabled={name.trim().length < 1} testID="create-class" />
          {msg && <Text style={styles.msg}>{msg}</Text>}
        </Card>
      ) : (
        <>
          <Card>
            <H2>{cls.name}</H2>
            <Muted>{t("class.codeToJoin")}</Muted>
            <Text style={styles.code} testID="class-code">
              {cls.code}
            </Text>
            <Button title={t("class.refresh")} variant="secondary" onPress={reload} testID="refresh-class" />
          </Card>

          <Card>
            <H2>{t("class.students", { n: rows.length })}</H2>
            {rows.length === 0 ? (
              <Muted>{t("class.noStudents", { code: cls.code })}</Muted>
            ) : (
              rows.map((r) => (
                <View key={r.childProfileId} style={styles.studentRow}>
                  <Text style={styles.studentName}>{r.displayName}</Text>
                  <View style={styles.metrics}>
                    <Muted>{t("class.studentMetrics", { done: r.modulesCompleted, total: konzepte.length, points: r.knowledgePoints })}</Muted>
                    <Muted>≈ {formatEuros(r.depotValueRoundedCents)}</Muted>
                  </View>
                </View>
              ))
            )}
            <Muted>{t("class.aggregatesOnly")}</Muted>
          </Card>

          <Card>
            <H2>{t("class.assignTitle")}</H2>
            <Muted>{t("class.assignHint")}</Muted>
            {konzepte.map((k) => {
              const on = assigned.has(k.id);
              return (
                <Pressable
                  key={k.id}
                  testID={`assign-${k.id}`}
                  onPress={() => toggleAssign(k.id)}
                  style={[styles.assignRow, on && styles.assignRowOn]}
                >
                  <Text style={styles.assignName}>{k.titel.de}</Text>
                  {on ? <Pill label={t("class.assigned")} tone="good" /> : <Text style={styles.assignAdd}>+</Text>}
                </Pressable>
              );
            })}
          </Card>

          <Card>
            <H2>{t("class.challengesTitle")}</H2>
            <Muted>{t("class.challengesHint")}</Muted>
            <View style={styles.metricRow}>
              {CHALLENGE_METRIC_ORDER.map((m) => (
                <Pressable
                  key={m}
                  testID={`challenge-metric-${m}`}
                  onPress={() => setMetric(m)}
                  style={[styles.metricBtn, metric === m && styles.metricBtnOn]}
                >
                  <Text style={[styles.metricText, metric === m && styles.metricTextOn]}>
                    {t(CHALLENGE_METRICS[m].labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              testID="challenge-target"
              value={target}
              onChangeText={setTarget}
              keyboardType="number-pad"
              placeholder={t("class.challengeTargetPlaceholder")}
              placeholderTextColor={c.muted}
              style={styles.input}
            />
            <Button
              title={t("class.challengeCreate")}
              onPress={createChallengeFromForm}
              disabled={!(parseInt(target, 10) > 0)}
              testID="create-challenge"
            />
            {challenges.length === 0 ? (
              <Muted>{t("class.challengeNone")}</Muted>
            ) : (
              challenges.map((ch) => {
                const done = reachedCount(ch);
                return (
                  <View key={ch.id} style={styles.challengeRow}>
                    <View style={styles.challengeHead}>
                      <Text style={styles.challengeTitle}>{goalLabel(ch.metric, ch.target)}</Text>
                      <Pressable testID={`delete-challenge-${ch.id}`} onPress={() => removeChallenge(ch.id)} hitSlop={8}>
                        <Text style={styles.challengeDelete}>✕</Text>
                      </Pressable>
                    </View>
                    <ProgressBar value={rows.length ? done / rows.length : 0} variant="gold" />
                    <Muted>{t("class.challengeReached", { done, total: rows.length })}</Muted>
                  </View>
                );
              })
            )}
          </Card>

          {rows.length > 0 && (
            <Card>
              <H2>{t("class.leaderboard")}</H2>
              <Muted>{t("family.challengeQ")}</Muted>
              {ranked.map((e) => (
                <View key={e.id} style={styles.rankRow}>
                  <Text style={styles.rankText}>
                    {e.awarded && e.rank <= 3 ? "🏅" : ""} {e.rank}. {nameById.get(e.id)}
                  </Text>
                  <Text style={styles.rankScore}>{Math.round(e.score)} P</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: space.lg, gap: space.md, backgroundColor: c.bg },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: space.md,
      fontSize: font.body,
      fontFamily: fonts.body,
      color: c.text,
      backgroundColor: c.surface,
    },
    msg: { fontSize: font.small, color: c.navy, fontWeight: "600", fontFamily: fonts.body },
    code: { fontSize: font.h1, fontWeight: "800", fontFamily: fonts.display, color: c.navy, letterSpacing: 2 },
    assignRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      marginTop: space.xs,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      backgroundColor: c.surface,
    },
    assignRowOn: { borderColor: c.green, backgroundColor: c.mint },
    assignName: { fontSize: font.body, fontFamily: fonts.body, color: c.text, flexShrink: 1, paddingRight: space.sm },
    assignAdd: { fontSize: font.h2, color: c.muted, fontWeight: "700", fontFamily: fonts.bodyBold },
    studentRow: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border, gap: 2 },
    studentName: { fontSize: font.body, fontWeight: "700", fontFamily: fonts.bodyBold, color: c.text },
    metrics: { flexDirection: "row", justifyContent: "space-between" },
    metricRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xs },
    metricBtn: {
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
      alignItems: "center",
    },
    metricBtnOn: { borderColor: c.green, backgroundColor: c.mint },
    metricText: { fontSize: font.small, fontFamily: fonts.bodyMed, color: c.muted, textAlign: "center" },
    metricTextOn: { color: c.success, fontFamily: fonts.bodySemi },
    challengeRow: { paddingVertical: space.sm, gap: 6, borderTopWidth: 1, borderTopColor: c.border, marginTop: space.xs },
    challengeHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    challengeTitle: { fontSize: font.body, fontFamily: fonts.bodySemi, color: c.text, flexShrink: 1, paddingRight: space.sm },
    challengeDelete: { fontSize: font.h3, color: c.muted, fontFamily: fonts.bodyBold },
    rankRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space.xs },
    rankText: { fontSize: font.body, fontFamily: fonts.body, color: c.text },
    rankScore: { fontSize: font.body, fontWeight: "700", fontFamily: fonts.display, color: c.text },
  });
