import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatEuros, rank } from "@hofino/core";
import { alleKonzepte, alleThemenbloecke } from "@hofino/learning";
import {
  useStore,
  type ChallengeMetric,
  type ClassChallenge,
  type ClassOverviewRow,
  type LessonEntry,
  type TeacherClass as TClass,
} from "../../store/store.js";
import { Body, Button, Card, H1, H2, Muted, Pill, ProgressBar } from "../../ui/components.js";
import {
  CHALLENGE_METRICS,
  CHALLENGE_METRIC_ORDER,
  challengeReached,
  challengeValue,
  challengeEnded,
  formatDateDE,
  type ChallengeStudentStats,
} from "../../challengeMetrics.js";
import { TeacherPresentation } from "./TeacherPresentation.js";
import { ConsentTemplate } from "./ConsentTemplate.js";
import { DeleteAccountSection } from "../DeleteAccount.js";
import { FeedbackButton } from "../FeedbackButton.js";
import { TeacherContentBeamer } from "./TeacherContentBeamer.js";
import { useToast } from "../../ui/Toast.js";
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
    fetchCurriculum,
    setBlocksRelease,
    fetchClassChallenges,
    createChallenge,
    deleteChallenge,
    fetchClassLessons,
    t,
  } = useStore();
  const c = useColors();
  const toast = useToast();
  const styles = useThemedStyles(makeStyles);
  const [cls, setCls] = useState<TClass | null>(null);
  const [rows, setRows] = useState<ClassOverviewRow[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [challenges, setChallenges] = useState<ClassChallenge[]>([]);
  const [lessons, setLessons] = useState<LessonEntry[]>([]);
  const [metric, setMetric] = useState<ChallengeMetric>("konzepte");
  const [target, setTarget] = useState("");
  const [blockRef, setBlockRef] = useState<string | null>(null);
  const [durationWeeks, setDurationWeeks] = useState<number | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [contentBeamer, setContentBeamer] = useState(false);
  const now = new Date();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const konzepte = alleKonzepte();
  const bloecke = alleThemenbloecke();
  const blockSize = (id: string) => konzepte.filter((k) => k.themenblock_id === id).length;

  // Block-Abhängigkeiten aus den Konzept-Voraussetzungen ableiten (Voraussetzungs-Schutz):
  // transitive Voraussetzungen (muss vorher frei sein) und Abhängige (baut darauf auf).
  const { prereqsOf, dependentsOf } = useMemo(() => {
    const byId = new Map(konzepte.map((k) => [k.id, k]));
    const direct = new Map<string, Set<string>>(); // block → direkte Voraussetzungs-Blöcke
    for (const k of konzepte) {
      for (const vid of k.voraussetzungen ?? []) {
        const v = byId.get(vid);
        if (v && v.themenblock_id !== k.themenblock_id) {
          (direct.get(k.themenblock_id) ?? direct.set(k.themenblock_id, new Set()).get(k.themenblock_id)!).add(
            v.themenblock_id,
          );
        }
      }
    }
    const closure = (start: string, edges: Map<string, Set<string>>) => {
      const out = new Set<string>();
      const stack = [...(edges.get(start) ?? [])];
      while (stack.length) {
        const b = stack.pop()!;
        if (out.has(b)) continue;
        out.add(b);
        for (const n of edges.get(b) ?? []) stack.push(n);
      }
      return out;
    };
    const reverse = new Map<string, Set<string>>();
    for (const [blk, deps] of direct) for (const d of deps) (reverse.get(d) ?? reverse.set(d, new Set()).get(d)!).add(blk);
    return {
      prereqsOf: (id: string) => closure(id, direct),
      dependentsOf: (id: string) => closure(id, reverse),
    };
  }, [konzepte]);
  const classXpSum = rows.reduce((s, r) => s + r.knowledgePoints, 0);

  const reload = useCallback(async () => {
    const c = await fetchTeacherClass();
    setCls(c);
    setRows(c ? await fetchClassOverview(c.id) : []);
    setAssigned(c ? new Set(await fetchAssignments(c.id)) : new Set());
    if (c) {
      const cur = await fetchCurriculum(c.id);
      setLocked(new Set(Object.entries(cur).filter(([, s]) => s === "gesperrt").map(([id]) => id)));
    } else {
      setLocked(new Set());
    }
    setChallenges(c ? await fetchClassChallenges(c.id) : []);
    setLessons(c ? await fetchClassLessons(c.id) : []);
    setLoaded(true);
  }, [fetchTeacherClass, fetchClassOverview, fetchAssignments, fetchCurriculum, fetchClassChallenges, fetchClassLessons]);

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
    decisions: r.decisionsCount,
    blocksMastered: r.blocksMastered,
    classXpSum,
  });
  // Wie viele Schüler haben das (individuelle) Ziel erreicht?
  const reachedCount = (ch: ClassChallenge) =>
    rows.filter((r) => challengeReached(ch.metric, challengeValue(ch.metric, statsFromRow(r), ch.ref), ch.target)).length;
  // Kooperatives Ziel erreicht? (Klassensumme)
  const classReached = (ch: ClassChallenge) => challengeReached(ch.metric, classXpSum, ch.target);

  const endsAtFromDuration = () =>
    durationWeeks ? new Date(now.getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000).toISOString() : null;

  const createChallengeFromForm = async () => {
    if (!cls) return;
    const endsAt = endsAtFromDuration();
    if (metric === "themenblock") {
      if (!blockRef || locked.has(blockRef)) return; // gesperrte Blöcke nicht koppeln
      const block = bloecke.find((b) => b.id === blockRef);
      const size = blockSize(blockRef);
      if (!block || size <= 0) return;
      await createChallenge(cls.id, metric, size, t("class.challengeGoalThemenblock", { block: block.titel.de }), blockRef, endsAt);
      setBlockRef(null);
    } else {
      const n = parseInt(target, 10);
      if (!Number.isFinite(n) || n <= 0) return;
      await createChallenge(cls.id, metric, n, t(CHALLENGE_METRICS[metric].goalKey, { n }), null, endsAt);
      setTarget("");
    }
    await reload();
  };

  const DURATIONS: { key: string; weeks: number | null }[] = [
    { key: "class.dur1w", weeks: 1 },
    { key: "class.dur4w", weeks: 4 },
    { key: "class.dur8w", weeks: 8 },
    { key: "class.durHalf", weeks: 26 },
    { key: "class.durNone", weeks: null },
  ];
  const statusText = (ch: ClassChallenge) =>
    !ch.endsAt ? null : challengeEnded(ch.endsAt, now) ? t("class.challengeEnded") : t("class.challengeRunsUntil", { date: formatDateDE(ch.endsAt) });

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

  // Themenblock freigeben/sperren mit Voraussetzungs-Schutz:
  //  • Freigeben  → alle (transitiven) Voraussetzungs-Blöcke werden mit freigegeben.
  //  • Sperren    → alle (transitiven) abhängigen Blöcke werden mit gesperrt.
  // So bleibt die Freigabe-Menge immer konsistent zur Abhängigkeitskette.
  const toggleBlock = async (blockId: string) => {
    if (!cls) return;
    const willLock = !locked.has(blockId);
    const known = new Set(bloecke.map((b) => b.id)); // nur echte (App-)Blöcke berücksichtigen
    const next = new Set(locked);
    const cascade: string[] = [];

    if (willLock) {
      next.add(blockId);
      for (const d of dependentsOf(blockId)) {
        if (known.has(d) && !next.has(d)) {
          next.add(d);
          cascade.push(d);
        }
      }
    } else {
      next.delete(blockId);
      for (const p of prereqsOf(blockId)) {
        if (known.has(p) && next.has(p)) {
          next.delete(p);
          cascade.push(p);
        }
      }
    }

    const prev = locked;
    setLocked(next);
    // Alle geänderten Blöcke (der geklickte + kaskadierte) in einem Rutsch persistieren.
    const changed = [blockId, ...cascade];
    try {
      await setBlocksRelease(
        cls.id,
        changed.map((id) => ({ themenblockId: id, released: !next.has(id) })),
      );
      if (cascade.length > 0) {
        toast.show(
          t(willLock ? "class.cascadeLocked" : "class.cascadeReleased", { n: cascade.length }),
          "info",
        );
      }
    } catch {
      setLocked(prev); // optimistische Änderung zurücknehmen
      toast.show(t("class.saveError"), "error");
    }
  };

  const toggleAssign = async (konzeptId: string) => {
    if (!cls) return;
    const prev = assigned;
    const next = new Set(assigned);
    const wasAssigned = next.has(konzeptId);
    if (wasAssigned) next.delete(konzeptId);
    else next.add(konzeptId);
    setAssigned(next);
    try {
      if (wasAssigned) await unassignKonzept(cls.id, konzeptId);
      else await assignKonzept(cls.id, konzeptId);
    } catch {
      setAssigned(prev); // optimistische Änderung zurücknehmen
      toast.show(t("class.saveError"), "error");
    }
  };

  useEffect(() => {
    reload();
  }, [reload]);

  const [consentChecked, setConsentChecked] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  const create = async () => {
    setMsg(null);
    const r = await createClass(name.trim(), consentChecked);
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

  if (showTemplate) {
    return <ConsentTemplate onClose={() => setShowTemplate(false)} />;
  }
  if (presenting && cls) {
    return <TeacherPresentation classCode={cls.code} onClose={() => setPresenting(false)} />;
  }
  if (contentBeamer && cls) {
    return <TeacherContentBeamer locked={locked} onClose={() => setContentBeamer(false)} />;
  }

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
          <Pressable
            testID="consent-checkbox"
            onPress={() => setConsentChecked((v) => !v)}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, consentChecked && styles.checkboxOn]}>
              {consentChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>{t("class.consentCheck")}</Text>
          </Pressable>
          <Button
            title={t("class.consentTemplate")}
            variant="ghost"
            onPress={() => setShowTemplate(true)}
            testID="show-consent-template"
          />
          <Button
            title={t("class.create")}
            onPress={create}
            disabled={name.trim().length < 1 || !consentChecked}
            testID="create-class"
          />
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
            <Button title={t("present.start")} onPress={() => setPresenting(true)} testID="start-present" />
            <Button title={t("present.contentStart")} variant="secondary" onPress={() => setContentBeamer(true)} testID="start-content" />
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
            <H2>{t("class.curriculumTitle")}</H2>
            <Muted>{t("class.curriculumHint")}</Muted>
            {bloecke.map((b) => {
              const isLocked = locked.has(b.id);
              return (
                <Pressable
                  key={b.id}
                  testID={`block-${b.id}`}
                  onPress={() => toggleBlock(b.id)}
                  style={[styles.assignRow, isLocked && styles.blockRowLocked]}
                >
                  <Text style={styles.assignName}>{b.titel.de}</Text>
                  <Pill
                    label={isLocked ? t("class.blockLocked") : t("class.blockReleased")}
                    tone={isLocked ? "locked" : "good"}
                  />
                </Pressable>
              );
            })}
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
              <>
                <View style={styles.metricRow}>
                  {/* Nur freigegebene Blöcke sind wählbar (Kopplung ans Curriculum). */}
                  {bloecke
                    .filter((b) => !locked.has(b.id))
                    .map((b) => (
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
                {locked.size > 0 && <Muted>{t("class.challengeBlocksLockedNote")}</Muted>}
              </>
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
            <Muted>{t("class.challengeDuration")}</Muted>
            <View style={styles.metricRow}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d.key}
                  testID={`challenge-dur-${d.weeks ?? "none"}`}
                  onPress={() => setDurationWeeks(d.weeks)}
                  style={[styles.metricBtn, durationWeeks === d.weeks && styles.metricBtnOn]}
                >
                  <Text style={[styles.metricText, durationWeeks === d.weeks && styles.metricTextOn]}>{t(d.key)}</Text>
                </Pressable>
              ))}
            </View>
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
                    {statusText(ch) && (
                      <Text style={[styles.challengeStatus, challengeEnded(ch.endsAt, now) && styles.challengeStatusEnded]}>
                        {statusText(ch)}
                      </Text>
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

          <Card>
            <H2>{t("class.lessonsTitle")}</H2>
            {lessons.length === 0 ? (
              <Muted>{t("class.lessonsEmpty")}</Muted>
            ) : (
              lessons.map((l, idx) => (
                <View key={idx} style={styles.lessonRow}>
                  <Text style={styles.studentName}>{l.name}</Text>
                  <Body>{l.text}</Body>
                </View>
              ))
            )}
          </Card>
        </>
      )}
      <FeedbackButton />
      <DeleteAccountSection />
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    checkRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface,
    },
    checkboxOn: { borderColor: c.green, backgroundColor: c.mint },
    checkmark: { color: c.green, fontWeight: "800", fontFamily: fonts.bodyBold },
    checkLabel: { flex: 1, fontSize: font.small, color: c.text, fontFamily: fonts.body },
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
    blockRowLocked: { borderColor: c.border, backgroundColor: c.bg, opacity: 0.7 },
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
    challengeStatus: { fontSize: font.caption, fontFamily: fonts.bodyMed, color: c.success },
    challengeStatusEnded: { color: c.muted },
    lessonRow: { paddingVertical: space.sm, gap: 2, borderTopWidth: 1, borderTopColor: c.border, marginTop: space.xs },
    rankRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space.xs },
    rankText: { fontSize: font.body, fontFamily: fonts.body, color: c.text },
    rankScore: { fontSize: font.body, fontWeight: "700", fontFamily: fonts.display, color: c.text },
  });
