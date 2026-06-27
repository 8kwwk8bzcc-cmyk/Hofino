import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatEuros, rank } from "@hofino/core";
import { alleKonzepte, alleThemenbloecke } from "@hofino/learning";
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
  const [blockRef, setBlockRef] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const konzepte = alleKonzepte();
  const bloecke = alleThemenbloecke();
  const blockSize = (id: string) => konzepte.filter((k) => k.themenblock_id === id).length;
  const classXpSum = rows.reduce((s, r) => s + r.knowledgePoints, 0);

  const reload = useCallback(async () => {
    const c = await fetchTeacherClass();
    setCls(c);
    setRows(c ? await fetchClassOverview(c.id) : []);
    setAssigned(c ? new Set(await fetchAssignments(c.id)) : new Set());
    setChallenges(c ? await fetchClassChallenges(c.id) : []);
    setLoaded(true);
  }, [fetchTeacherClass, fetchClassOverview, fetchAssignments, fetchClassChallenges]);

  // Anzeige-Titel einer Challenge (Themenblock nutzt den gespeicherten Titel mit Blockname).
  const challengeTitle = useCallback(
    (ch: ClassChallenge) => (ch.metric === "themenblock" ? ch.title : t(CHALLENGE_METRICS[ch.metric].goalKey, { n: ch.target })),
    [t],
  );
  // Grobe Aggregate einer Klassenzeile → Challenge-Stats (Datenschutz: nur Zahlen).
  const statsFromRow = (r: ClassOverviewRow): ChallengeStudentStats => ({
    konzepte: r.modulesCompleted,
    xp: r.knowledgePoints,
    branchen: r.sectorsCount,
    regionen: r.regionsCount,
    etf: r.etfCount,
    orders: r.ordersCount,
    blocksMastered: r.blocksMastered,
    classXpSum,
  });
  // Wie viele Schüler haben das (individuelle) Ziel erreicht?
  const reachedCount = (ch: ClassChallenge) =>
    rows.filter((r) => challengeReached(ch.metric, challengeValue(ch.metric, statsFromRow(r), ch.ref), ch.target)).length;
  // Kooperatives Ziel erreicht? (Klassensumme)
  const classReached = (ch: ClassChallenge) => challengeReached(ch.metric, classXpSum, ch.target);

  const createChallengeFromForm = async () => {
    if (!cls) return;
    if (metric === "themenblock") {
      if (!blockRef) return;
      const block = bloecke.find((b) => b.id === blockRef);
      const size = blockSize(blockRef);
      if (!block || size <= 0) return;
      await createChallenge(cls.id, metric, size, t("class.challengeGoalThemenblock", { block: block.titel.de }), blockRef);
      setBlockRef(null);
    } else {
      const n = parseInt(target, 10);
      if (!Number.isFinite(n) || n <= 0) return;
      await createChallenge(cls.id, metric, n, t(CHALLENGE_METRICS[metric].goalKey, { n }));
      setTarget("");
    }
    await reload();
  };

  const removeChallenge = async (id: string) => {
    await deleteChallenge(id);
    await reload();
  };

  // Saison-Wertung: pro Kategorie der/die Führende – bewusst MEHRERE Titel statt nur Gewinn,
  // und ohne reine %-Performance (Prozess/Wissen schlagen Zufallsgewinn).
  const seasonLeader = (sel: (r: ClassOverviewRow) => number, mode: "max" | "min", onlyInvested = false) => {
    const cand = rows.filter((r) => (onlyInvested ? r.ordersCount > 0 : true));
    if (cand.length === 0) return null;
    const best = cand.reduce((a, b) => (mode === "max" ? (sel(b) > sel(a) ? b : a) : sel(b) < sel(a) ? b : a));
    if (mode === "max" && sel(best) <= 0) return null; // niemand hat hier etwas erreicht
    return { name: best.displayName, value: sel(best) };
  };
  const seasonTitles: { key: string; leader: { name: string; value: number } | null }[] = [
    { key: "class.seasonKonzepte", leader: seasonLeader((r) => r.modulesCompleted, "max") },
    { key: "class.seasonXp", leader: seasonLeader((r) => r.knowledgePoints, "max") },
    { key: "class.seasonStreuung", leader: seasonLeader((r) => r.sectorsCount, "max") },
    { key: "class.seasonRuhig", leader: seasonLeader((r) => r.ordersCount, "min", true) },
    { key: "class.seasonEtf", leader: seasonLeader((r) => r.etfCount, "max") },
  ];

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
            {metric === "themenblock" ? (
              <View style={styles.metricRow}>
                {bloecke.map((b) => (
                  <Pressable
                    key={b.id}
                    testID={`challenge-block-${b.id}`}
                    onPress={() => setBlockRef(b.id)}
                    style={[styles.metricBtn, blockRef === b.id && styles.metricBtnOn]}
                  >
                    <Text style={[styles.metricText, blockRef === b.id && styles.metricTextOn]}>{b.titel.de}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <TextInput
                testID="challenge-target"
                value={target}
                onChangeText={setTarget}
                keyboardType="number-pad"
                placeholder={t("class.challengeTargetPlaceholder")}
                placeholderTextColor={c.muted}
                style={styles.input}
              />
            )}
            <Button
              title={t("class.challengeCreate")}
              onPress={createChallengeFromForm}
              disabled={metric === "themenblock" ? !blockRef : !(parseInt(target, 10) > 0)}
              testID="create-challenge"
            />
            {challenges.length === 0 ? (
              <Muted>{t("class.challengeNone")}</Muted>
            ) : (
              challenges.map((ch) => {
                const isClass = CHALLENGE_METRICS[ch.metric].scope === "class";
                const done = isClass ? 0 : reachedCount(ch);
                return (
                  <View key={ch.id} style={styles.challengeRow}>
                    <View style={styles.challengeHead}>
                      <Text style={styles.challengeTitle}>{challengeTitle(ch)}</Text>
                      <Pressable testID={`delete-challenge-${ch.id}`} onPress={() => removeChallenge(ch.id)} hitSlop={8}>
                        <Text style={styles.challengeDelete}>✕</Text>
                      </Pressable>
                    </View>
                    {isClass ? (
                      <>
                        <ProgressBar value={ch.target ? Math.min(classXpSum / ch.target, 1) : 0} variant="gold" />
                        <Muted>
                          {classReached(ch)
                            ? t("class.challengeClassDone")
                            : t("class.challengeClassProgress", { value: classXpSum, target: ch.target })}
                        </Muted>
                      </>
                    ) : (
                      <>
                        <ProgressBar value={rows.length ? done / rows.length : 0} variant="gold" />
                        <Muted>{t("class.challengeReached", { done, total: rows.length })}</Muted>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </Card>

          {rows.length > 0 && (
            <Card>
              <H2>{t("class.seasonTitle")}</H2>
              <Muted>{t("class.seasonHint")}</Muted>
              {seasonTitles.map((s) => (
                <View key={s.key} style={styles.rankRow}>
                  <Text style={styles.rankText}>🏅 {t(s.key)}</Text>
                  <Text style={styles.rankScore}>
                    {s.leader ? `${s.leader.name} (${s.leader.value})` : t("class.seasonNobody")}
                  </Text>
                </View>
              ))}
            </Card>
          )}

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
