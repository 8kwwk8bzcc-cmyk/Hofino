import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  alleKonzepte,
  fragenFuer,
  vorlagenFuer,
  instanziiereFrage,
  instanziiereVorlage,
  initLeitner,
  makeRng,
  naechsterLeitner,
  wissenslevel,
  bewerteAuszeichnungen,
  STUFEN,
  type FrageInstanz,
  type Konzept,
  type SRZustand,
  type Stufe,
} from "@hofino/learning";
import { formatEuros } from "@hofino/core";
import { supabase } from "../lib/supabase.js";
import { useStore, type ClassChallenge } from "../store/store.js";
import { CHALLENGE_METRICS, challengeReached, challengeValue, type ChallengeStudentStats } from "../challengeMetrics.js";
import { AwardBadge, Body, Button, Card, H1, H2, Muted, Pill, ProgressBar } from "../ui/components.js";
import { font, fonts, radius, space, type Palette } from "../theme.js";
import { useColors, useThemedStyles } from "../theme/ThemeProvider.js";

type Phase =
  | "liste"
  | "erklaerung"
  | "frage"
  | "feedback"
  | "konzept_fertig"
  | "wdh"
  | "wdh_feedback"
  | "fertig";
const ALTERSBAND = "kind_11_14" as const; // MVP-Default; später aus dem Profil
const STUFE_KEY: Record<Stufe, string> = {
  erklaeren: "learn.stufeErklaeren",
  erkennen: "learn.stufeErkennen",
  verstehen: "learn.stufeVerstehen",
  anwenden: "learn.stufeAnwenden",
  meistern: "learn.stufeMeistern",
};

function heuteISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function baueInstanz(konzept: Konzept, stufe: Stufe, rng: () => number): FrageInstanz | null {
  if (konzept.ist_rechnerisch && (stufe === "anwenden" || stufe === "meistern")) {
    const vs = vorlagenFuer(konzept.id, stufe);
    if (vs.length) return instanziiereVorlage(vs[Math.floor(rng() * vs.length)]!, rng);
  }
  const fs = fragenFuer(konzept.id, stufe);
  if (fs.length) return instanziiereFrage(fs[Math.floor(rng() * fs.length)]!, rng);
  return null;
}

// Für Wiederholungen: irgendeine spielbare Frage des Konzepts (bevorzugt anspruchsvollere Stufe).
function baueInstanzBeliebig(konzept: Konzept, rng: () => number): FrageInstanz | null {
  const reihenfolge: Stufe[] = konzept.ist_rechnerisch
    ? ["anwenden", "meistern", "verstehen", "erkennen", "erklaeren"]
    : ["verstehen", "erkennen", "anwenden", "meistern", "erklaeren"];
  for (const s of reihenfolge) {
    const inst = baueInstanz(konzept, s, rng);
    if (inst) return inst;
  }
  return null;
}

export function LearnPlus() {
  const { t, state, instrumentById, fetchMyAssignments, fetchMyChallenges, fetchClassXp } = useStore();
  const c = useColors();
  const styles = useThemedStyles(makeStyles);
  const konzepte = alleKonzepte();
  const [phase, setPhase] = useState<Phase>("liste");
  const [konzept, setKonzept] = useState<Konzept | null>(null);
  const [stufeIdx, setStufeIdx] = useState(0);
  const [instanz, setInstanz] = useState<FrageInstanz | null>(null);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const [srMap, setSrMap] = useState<Record<string, SRZustand>>({});
  const [tages, setTages] = useState<{ neu: number; wieder: number; xp: number }>({ neu: 0, wieder: 0, xp: 0 });
  const [xpGesamt, setXpGesamt] = useState(0);
  const [korrektGesamt, setKorrektGesamt] = useState(0);
  const [abgeschlossen, setAbgeschlossen] = useState(0);
  const [wdhQueue, setWdhQueue] = useState<string[]>([]);
  const [wdhIdx, setWdhIdx] = useState(0);
  const [zeigeErklaerung, setZeigeErklaerung] = useState(false);
  const [letzteXp, setLetzteXp] = useState(0);
  const [lernkapital, setLernkapital] = useState(0);
  const [zugewiesen, setZugewiesen] = useState<Set<string>>(new Set());
  const [challenges, setChallenges] = useState<ClassChallenge[]>([]);
  const [gemeisterteIds, setGemeisterteIds] = useState<Set<string>>(new Set());
  const [classXpSum, setClassXpSum] = useState(0);

  // Eigene Challenge-Kennzahlen (für die persönliche Fortschrittsanzeige).
  const myStats: ChallengeStudentStats = useMemo(() => {
    const held = state.portfolio.holdings.filter((h) => h.quantity > 0);
    const insts = held.map((h) => instrumentById.get(h.instrumentId)).filter((i): i is NonNullable<typeof i> => !!i);
    const blocksMastered: Record<string, number> = {};
    for (const k of konzepte) {
      if (gemeisterteIds.has(k.id)) blocksMastered[k.themenblock_id] = (blocksMastered[k.themenblock_id] ?? 0) + 1;
    }
    return {
      konzepte: abgeschlossen,
      xp: xpGesamt,
      branchen: new Set(insts.map((i) => i.sector).filter(Boolean)).size,
      regionen: new Set(insts.map((i) => i.country).filter(Boolean)).size,
      etf: insts.filter((i) => i.type === "etf").length,
      orders: state.ordersCount,
      decisions: state.decisionsCount,
      blocksMastered,
      classXpSum,
    };
  }, [state.portfolio.holdings, state.ordersCount, state.decisionsCount, instrumentById, abgeschlossen, xpGesamt, gemeisterteIds, classXpSum, konzepte]);

  const heute = heuteISO();
  const faellig = konzepte.filter((k) => {
    const sr = srMap[k.id];
    return sr?.naechste_faelligkeit && sr.naechste_faelligkeit <= heute;
  });

  const ladeStatus = useCallback(async () => {
    const sr = await supabase.from("lern_sr_zustand").select("konzept_id, leitner_box, richtig_in_folge, gemeistert, naechste_faelligkeit, letzte_antwort_korrekt");
    const map: Record<string, SRZustand> = {};
    for (const r of sr.data ?? [])
      map[r.konzept_id] = {
        konzept_id: r.konzept_id,
        leitner_box: r.leitner_box,
        richtig_in_folge: r.richtig_in_folge,
        gemeistert: r.gemeistert,
        naechste_faelligkeit: r.naechste_faelligkeit,
        letzte_antwort_korrekt: r.letzte_antwort_korrekt,
      };
    setSrMap(map);
    const st = await supabase.rpc("lern_tagesstatus");
    if (st.data?.ok) setTages({ neu: st.data.neu_genutzt, wieder: st.data.wieder_genutzt, xp: st.data.wiederhol_xp });
    const status = await supabase.from("lern_status").select("xp_gesamt").maybeSingle();
    setXpGesamt(Number(status.data?.xp_gesamt ?? 0));
    const korrekt = await supabase.from("lern_antworten").select("id", { count: "exact", head: true }).eq("korrekt", true);
    setKorrektGesamt(korrekt.count ?? 0);
    const fort = await supabase.from("lern_konzept_fortschritt").select("konzept_id, hoechste_abgeschlossene_stufe");
    const gemeistert = (fort.data ?? []).filter((r) => r.hoechste_abgeschlossene_stufe === "meistern");
    setAbgeschlossen(gemeistert.length);
    setGemeisterteIds(new Set(gemeistert.map((r) => r.konzept_id as string)));
    setClassXpSum(await fetchClassXp());
    setZugewiesen(new Set(await fetchMyAssignments()));
    setChallenges(await fetchMyChallenges());
  }, [fetchMyAssignments, fetchMyChallenges, fetchClassXp]);

  useEffect(() => {
    ladeStatus();
  }, [ladeStatus]);

  const naechsteStufe = async (k: Konzept, ab: number) => {
    const rng = makeRng((Date.now() & 0xffffffff) ^ (ab * 2654435761));
    for (let i = ab; i < STUFEN.length; i++) {
      const inst = baueInstanz(k, STUFEN[i]!, rng);
      if (inst) {
        setStufeIdx(i);
        setInstanz(inst);
        setGewaehlt(null);
        setPhase("frage");
        return;
      }
    }
    // keine weitere Stufe → Konzept abgeschlossen: Lernkapital gewähren
    const res = await supabase.rpc("lern_konzept_abschliessen", { p_konzept: k.id });
    setLernkapital(typeof res.data?.lernkapital_cents === "number" ? res.data.lernkapital_cents : 0);
    setPhase("konzept_fertig");
  };

  const oeffneKonzept = async (k: Konzept) => {
    setKonzept(k);
    setPhase("erklaerung");
  };

  const starteStufen = async () => {
    if (!konzept) return;
    await supabase.rpc("lern_erklaerung_gesehen", { p_konzept: konzept.id });
    naechsteStufe(konzept, 0);
  };

  const antworten = async (idx: number) => {
    if (!konzept || !instanz) return;
    setGewaehlt(idx);
    const korrekt = !!instanz.optionen[idx]?.korrekt;
    const sr = srMap[konzept.id] ?? initLeitner(konzept.id, heuteISO());
    const neu = naechsterLeitner(sr, korrekt, heuteISO());
    const res = await supabase.rpc("lern_antwort_speichern", {
      p_konzept: konzept.id,
      p_stufe: instanz.stufe,
      p_frage_id: instanz.frage_id ?? "",
      p_vorlage_id: instanz.vorlage_id ?? "",
      p_korrekt: korrekt,
      p_ist_wiederholung: false,
      p_basis_xp: instanz.wissenspunkte,
      p_box: neu.leitner_box,
      p_richtig_in_folge: neu.richtig_in_folge,
      p_gemeistert: neu.gemeistert,
      p_faellig: neu.naechste_faelligkeit,
    });
    if (res.data && res.data.ok === false) {
      setPhase("fertig"); // Tageslimit erreicht
      return;
    }
    setSrMap((m) => ({ ...m, [konzept.id]: neu }));
    setTages((t) => ({ ...t, neu: t.neu + 1 }));
    setPhase("feedback");
  };

  const naechsteWdh = (queue: string[], idx: number) => {
    const rng = makeRng((Date.now() & 0xffffffff) ^ (idx * 40503));
    for (let i = idx; i < queue.length; i++) {
      const k = konzepte.find((x) => x.id === queue[i]);
      if (!k) continue;
      const inst = baueInstanzBeliebig(k, rng);
      if (inst) {
        setKonzept(k);
        setInstanz(inst);
        setWdhIdx(i);
        setGewaehlt(null);
        setZeigeErklaerung(false);
        setPhase("wdh");
        return;
      }
    }
    setPhase("liste");
    ladeStatus();
  };

  const starteWiederholung = () => {
    const rest = Math.max(0, 10 - tages.wieder);
    const queue = faellig.map((k) => k.id).slice(0, rest);
    if (queue.length === 0) return;
    setWdhQueue(queue);
    naechsteWdh(queue, 0);
  };

  const antwortenWdh = async (idx: number) => {
    if (!konzept || !instanz) return;
    setGewaehlt(idx);
    const korrekt = !!instanz.optionen[idx]?.korrekt;
    const sr = srMap[konzept.id] ?? initLeitner(konzept.id, heute);
    const neu = naechsterLeitner(sr, korrekt, heute);
    const res = await supabase.rpc("lern_antwort_speichern", {
      p_konzept: konzept.id,
      p_stufe: instanz.stufe,
      p_frage_id: instanz.frage_id ?? "",
      p_vorlage_id: instanz.vorlage_id ?? "",
      p_korrekt: korrekt,
      p_ist_wiederholung: true,
      p_basis_xp: instanz.wissenspunkte,
      p_box: neu.leitner_box,
      p_richtig_in_folge: neu.richtig_in_folge,
      p_gemeistert: neu.gemeistert,
      p_faellig: neu.naechste_faelligkeit,
    });
    if (res.data && res.data.ok === false) {
      setPhase("fertig");
      return;
    }
    setSrMap((m) => ({ ...m, [konzept.id]: neu }));
    setTages((t) => ({ ...t, wieder: t.wieder + 1 }));
    setLetzteXp(typeof res.data?.granted_xp === "number" ? res.data.granted_xp : 0);
    setPhase("wdh_feedback");
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (phase === "liste") {
    const lvl = wissenslevel(xpGesamt);
    const auszeichnungen = bewerteAuszeichnungen({
      korrekteAntworten: korrektGesamt,
      konzepteAbgeschlossen: abgeschlossen,
      wissenslevel: lvl.level,
    });
    const rangLabelKey: Record<string, string> = {
      bronze: "learn.rankBronze",
      silber: "learn.rankSilber",
      gold: "learn.rankGold",
    };
    const naechsterRangKey: Record<string, string> = {
      none: "learn.rankBronze",
      bronze: "learn.rankSilber",
      silber: "learn.rankGold",
    };
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <H1>{t("learn.title")}</H1>
        <Card>
          <View style={styles.row}>
            <H2>{t("learn.level", { n: lvl.level })}</H2>
            <Pill label={`${xpGesamt} XP`} tone="gold" />
          </View>
          <ProgressBar value={lvl.fortschritt} />
          <Muted>
            {t("learn.xpToNext", { xp: Math.max(0, lvl.xpFuerNaechstes - lvl.xpImLevel), n: lvl.level + 1 })}
          </Muted>
        </Card>
        <Card>
          <H2>{t("learn.awards")}</H2>
          <Muted>{t("learn.awardsSubtitle")}</Muted>
          {auszeichnungen.map((a) => {
            const naechsterRang = t(naechsterRangKey[a.rang ?? "none"]);
            return (
              <AwardBadge
                key={a.id}
                title={a.titel}
                rank={a.rang}
                rankLabel={a.rang ? t(rangLabelKey[a.rang]) : t("learn.rankNone")}
                progress={a.naechsteSchwelle === null ? 1 : a.wert / a.naechsteSchwelle}
                progressLabel={
                  a.naechsteSchwelle === null
                    ? t("learn.goldReached")
                    : t("learn.toNextRank", { wert: a.wert, schwelle: a.naechsteSchwelle, rang: naechsterRang })
                }
              />
            );
          })}
        </Card>
        {challenges.length > 0 && (
          <Card>
            <H2>{t("learn.classChallenges")}</H2>
            {challenges.map((ch) => {
              const def = CHALLENGE_METRICS[ch.metric];
              const value = challengeValue(ch.metric, myStats, ch.ref);
              const reached = challengeReached(ch.metric, value, ch.target);
              const label = ch.metric === "themenblock" ? ch.title : t(def.goalKey, { n: ch.target });
              const isClass = def.scope === "class";
              return (
                <View key={ch.id} style={{ gap: 6, marginTop: space.xs }}>
                  <View style={styles.row}>
                    <Body>{isClass ? `🤝 ${label}` : label}</Body>
                    {reached && <Pill label={t("learn.challengeDone")} tone="good" />}
                  </View>
                  <ProgressBar
                    value={def.compare === "lte" ? (reached ? 1 : 0) : ch.target ? value / ch.target : 0}
                    variant="gold"
                  />
                  <Muted>
                    {def.compare === "lte"
                      ? t("learn.challengeAtMost", { value, target: ch.target })
                      : isClass
                        ? t("learn.challengeClass", { value, target: ch.target })
                        : `${Math.min(value, ch.target)}/${ch.target}`}
                  </Muted>
                </View>
              );
            })}
          </Card>
        )}
        <Card>
          <Muted>{t("learn.todayLearned")}</Muted>
          <Body>{t("learn.todayCounts", { neu: tages.neu, wieder: tages.wieder })}</Body>
          <ProgressBar value={tages.neu / 10} />
        </Card>
        {faellig.length > 0 && (
          <Card style={{ borderColor: c.gold, borderWidth: 2 }}>
            <H2>{t("learn.miniTask")}</H2>
            <Body>{t("learn.dueToReview", { n: faellig.length })}</Body>
            <Button
              title={tages.wieder >= 10 ? t("learn.reviewDone") : t("learn.reviewStart")}
              onPress={starteWiederholung}
              disabled={tages.wieder >= 10}
              testID="wdh-start"
            />
          </Card>
        )}
        {[...konzepte]
          .sort((a, b) => Number(zugewiesen.has(b.id)) - Number(zugewiesen.has(a.id)))
          .map((k) => {
            const sr = srMap[k.id];
            return (
              <Card
                key={k.id}
                testID={`konzept-${k.id}`}
                onPress={() => oeffneKonzept(k)}
                style={zugewiesen.has(k.id) ? { borderColor: c.gold, borderWidth: 2 } : undefined}
              >
                <View style={styles.row}>
                  <H2>{k.titel.de}</H2>
                  <View style={styles.pillRow}>
                    {zugewiesen.has(k.id) && <Pill label={t("learn.assignedByTeacher")} tone="gold" />}
                    {sr?.gemeistert ? <Pill label={t("learn.mastered")} tone="gold" /> : sr ? <Pill label={t("learn.box", { n: sr.leitner_box })} tone="good" /> : null}
                  </View>
                </View>
                <Muted>{k.ist_rechnerisch ? t("learn.calcType") : t("learn.understandType")}</Muted>
              </Card>
            );
          })}
      </ScrollView>
    );
  }

  if (phase === "erklaerung" && konzept) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Button title={t("discover.back")} variant="ghost" onPress={() => setPhase("liste")} testID="lp-back" />
        <H1>{konzept.titel.de}</H1>
        <Card>
          <Body>{konzept.erklaerungen[ALTERSBAND].de}</Body>
        </Card>
        <Button title={t("learn.understood")} onPress={starteStufen} testID="lp-start" />
      </ScrollView>
    );
  }

  if (phase === "frage" && instanz && konzept) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Muted>
          {t("learn.stageLine", { title: konzept.titel.de, n: stufeIdx + 1, stufe: t(STUFE_KEY[instanz.stufe]) })}
        </Muted>
        <H2>{instanz.frage}</H2>
        {instanz.optionen.map((o, i) => (
          <Pressable key={i} testID={`lp-opt${i}`} onPress={() => antworten(i)} style={styles.option}>
            <Text style={styles.optionText}>{o.text}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  if (phase === "feedback" && instanz && konzept && gewaehlt !== null) {
    const korrekt = !!instanz.optionen[gewaehlt]?.korrekt;
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={{ borderColor: korrekt ? c.green : c.danger, borderWidth: 2 }}>
          <H2>{korrekt ? t("learn.correct") : t("learn.close")}</H2>
          {!korrekt && (
            <Body>{t("learn.correctWould", { text: instanz.optionen.find((o) => o.korrekt)?.text ?? "" })}</Body>
          )}
          {/* Fehler = Lernmoment: Erklärung (bei falscher Antwort Pflicht, sonst zur Vertiefung) */}
          {instanz.erklaerung_nach_antwort ? <Body>{instanz.erklaerung_nach_antwort}</Body> : null}
          {korrekt && <Pill label={`+${instanz.wissenspunkte} XP`} tone="good" />}
        </Card>
        <Button title={t("learn.next")} onPress={() => naechsteStufe(konzept, stufeIdx + 1)} testID="lp-weiter" />
      </ScrollView>
    );
  }

  if (phase === "konzept_fertig" && konzept) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={{ borderColor: c.green, borderWidth: 2 }}>
          <H1>{t("learn.conceptDone")}</H1>
          <Body>{t("learn.youCompleted", { title: konzept.titel.de })}</Body>
          {lernkapital > 0 ? (
            <>
              <Pill label={t("learn.capitalGained", { amount: formatEuros(lernkapital) })} tone="good" />
              <Body>{t("learn.capitalNote")}</Body>
            </>
          ) : (
            <Muted>{t("learn.alreadyDone")}</Muted>
          )}
        </Card>
        <Button title={t("learn.backToOverview")} onPress={() => { setPhase("liste"); ladeStatus(); }} testID="lp-konzept-fertig" />
      </ScrollView>
    );
  }

  if (phase === "wdh" && instanz && konzept) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Muted>
          {t("learn.reviewLine", { title: konzept.titel.de, n: wdhIdx + 1, total: wdhQueue.length })}
        </Muted>
        <H2>{instanz.frage}</H2>
        {instanz.optionen.map((o, i) => (
          <Pressable key={i} testID={`wdh-opt${i}`} onPress={() => antwortenWdh(i)} style={styles.option}>
            <Text style={styles.optionText}>{o.text}</Text>
          </Pressable>
        ))}
        <Button
          title={zeigeErklaerung ? t("learn.hideExplanation") : t("learn.explainAgain")}
          variant="ghost"
          onPress={() => setZeigeErklaerung((s) => !s)}
          testID="wdh-erklaer"
        />
        {zeigeErklaerung && (
          <Card>
            <Body>{konzept.erklaerungen[ALTERSBAND].de}</Body>
          </Card>
        )}
      </ScrollView>
    );
  }

  if (phase === "wdh_feedback" && instanz && konzept && gewaehlt !== null) {
    const korrekt = !!instanz.optionen[gewaehlt]?.korrekt;
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={{ borderColor: korrekt ? c.green : c.danger, borderWidth: 2 }}>
          <H2>{korrekt ? t("learn.correct") : t("learn.close")}</H2>
          {!korrekt && <Body>{t("learn.correctWould", { text: instanz.optionen.find((o) => o.korrekt)?.text ?? "" })}</Body>}
          {!korrekt && instanz.erklaerung_nach_antwort ? <Body>{instanz.erklaerung_nach_antwort}</Body> : null}
          {korrekt && <Pill label={letzteXp > 0 ? `+${letzteXp} XP` : t("learn.xpLimit")} tone="good" />}
        </Card>
        <Button title={t("learn.next")} onPress={() => naechsteWdh(wdhQueue, wdhIdx + 1)} testID="wdh-weiter" />
      </ScrollView>
    );
  }

  // fertig
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <H1>{t("learn.doneTodayTitle")}</H1>
        <Body>{t("learn.doneTodayBody")}</Body>
        <Button title={t("learn.backToOverview")} onPress={() => { setPhase("liste"); ladeStatus(); }} testID="lp-fertig" />
      </Card>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: space.lg, gap: space.md, backgroundColor: c.bg },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    pillRow: { flexDirection: "row", gap: space.xs, alignItems: "center", flexShrink: 0 },
    option: {
      padding: space.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    optionText: { fontSize: font.body, fontFamily: fonts.body, color: c.text },
  });
