import React, { useCallback, useEffect, useState } from "react";
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
  STUFEN,
  type FrageInstanz,
  type Konzept,
  type SRZustand,
  type Stufe,
} from "@hofino/learning";
import { formatEuros } from "@hofino/core";
import { supabase } from "../lib/supabase.js";
import { Body, Button, Card, H1, H2, Muted, Pill, ProgressBar } from "../ui/components.js";
import { colors, font, radius, space } from "../theme.js";

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
const STUFE_LABEL: Record<Stufe, string> = {
  erklaeren: "Erklären",
  erkennen: "Erkennen",
  verstehen: "Verstehen",
  anwenden: "Anwenden",
  meistern: "Meistern",
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
  const konzepte = alleKonzepte();
  const [phase, setPhase] = useState<Phase>("liste");
  const [konzept, setKonzept] = useState<Konzept | null>(null);
  const [stufeIdx, setStufeIdx] = useState(0);
  const [instanz, setInstanz] = useState<FrageInstanz | null>(null);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const [srMap, setSrMap] = useState<Record<string, SRZustand>>({});
  const [tages, setTages] = useState<{ neu: number; wieder: number; xp: number }>({ neu: 0, wieder: 0, xp: 0 });
  const [wdhQueue, setWdhQueue] = useState<string[]>([]);
  const [wdhIdx, setWdhIdx] = useState(0);
  const [zeigeErklaerung, setZeigeErklaerung] = useState(false);
  const [letzteXp, setLetzteXp] = useState(0);
  const [lernkapital, setLernkapital] = useState(0);

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
  }, []);

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
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <H1>Üben</H1>
        <Card>
          <Muted>Heute schon gelernt</Muted>
          <Body>
            {tages.neu}/10 neue Fragen · {tages.wieder}/10 Wiederholungen
          </Body>
          <ProgressBar value={tages.neu / 10} />
        </Card>
        {faellig.length > 0 && (
          <Card style={{ borderColor: colors.accent, borderWidth: 2 }}>
            <H2>Tägliche Mini-Aufgabe</H2>
            <Body>{faellig.length} Konzept(e) heute fällig zum Wiederholen.</Body>
            <Button
              title={tages.wieder >= 10 ? "Heute schon erledigt" : "Wiederholen starten"}
              onPress={starteWiederholung}
              disabled={tages.wieder >= 10}
              testID="wdh-start"
            />
          </Card>
        )}
        {konzepte.map((k) => {
          const sr = srMap[k.id];
          return (
            <Pressable key={k.id} testID={`konzept-${k.id}`} onPress={() => oeffneKonzept(k)}>
              <Card>
                <View style={styles.row}>
                  <H2>{k.titel.de}</H2>
                  {sr?.gemeistert ? <Pill label="🏆 gemeistert" tone="gold" /> : sr ? <Pill label={`Box ${sr.leitner_box}`} tone="good" /> : null}
                </View>
                <Muted>{k.ist_rechnerisch ? "Mit Rechenaufgaben" : "Verständnisfragen"}</Muted>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  if (phase === "erklaerung" && konzept) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Button title="‹ Zurück" variant="ghost" onPress={() => setPhase("liste")} testID="lp-back" />
        <H1>{konzept.titel.de}</H1>
        <Card>
          <Body>{konzept.erklaerungen[ALTERSBAND].de}</Body>
        </Card>
        <Button title="Verstanden – los geht's" onPress={starteStufen} testID="lp-start" />
      </ScrollView>
    );
  }

  if (phase === "frage" && instanz && konzept) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Muted>
          {konzept.titel.de} · Stufe {stufeIdx + 1}/5 · {STUFE_LABEL[instanz.stufe]}
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
        <Card style={{ borderColor: korrekt ? colors.secondary : colors.danger, borderWidth: 2 }}>
          <H2>{korrekt ? "Richtig! 🎉" : "Knapp daneben"}</H2>
          {!korrekt && (
            <Body>
              Richtig wäre: {instanz.optionen.find((o) => o.korrekt)?.text}
            </Body>
          )}
          {/* Fehler = Lernmoment: Erklärung (bei falscher Antwort Pflicht, sonst zur Vertiefung) */}
          {instanz.erklaerung_nach_antwort ? <Body>{instanz.erklaerung_nach_antwort}</Body> : null}
          {korrekt && <Pill label={`+${instanz.wissenspunkte} XP`} tone="good" />}
        </Card>
        <Button title="Weiter" onPress={() => naechsteStufe(konzept, stufeIdx + 1)} testID="lp-weiter" />
      </ScrollView>
    );
  }

  if (phase === "konzept_fertig" && konzept) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={{ borderColor: colors.secondary, borderWidth: 2 }}>
          <H1>Konzept geschafft! 🎉</H1>
          <Body>Du hast „{konzept.titel.de}" abgeschlossen.</Body>
          {lernkapital > 0 ? (
            <>
              <Pill label={`+${formatEuros(lernkapital)} Lernkapital`} tone="good" />
              <Body>Dein Lernkapital wandert in dein Musterdepot – du kannst es im „Depot" investieren.</Body>
            </>
          ) : (
            <Muted>Dieses Konzept hattest du schon abgeschlossen – kein neues Lernkapital.</Muted>
          )}
        </Card>
        <Button title="Zurück zur Übersicht" onPress={() => { setPhase("liste"); ladeStatus(); }} testID="lp-konzept-fertig" />
      </ScrollView>
    );
  }

  if (phase === "wdh" && instanz && konzept) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Muted>
          Wiederholung · {konzept.titel.de} · {wdhIdx + 1}/{wdhQueue.length}
        </Muted>
        <H2>{instanz.frage}</H2>
        {instanz.optionen.map((o, i) => (
          <Pressable key={i} testID={`wdh-opt${i}`} onPress={() => antwortenWdh(i)} style={styles.option}>
            <Text style={styles.optionText}>{o.text}</Text>
          </Pressable>
        ))}
        <Button
          title={zeigeErklaerung ? "Erklärung ausblenden" : "Nochmal erklären"}
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
        <Card style={{ borderColor: korrekt ? colors.secondary : colors.danger, borderWidth: 2 }}>
          <H2>{korrekt ? "Richtig! 🎉" : "Knapp daneben"}</H2>
          {!korrekt && <Body>Richtig wäre: {instanz.optionen.find((o) => o.korrekt)?.text}</Body>}
          {!korrekt && instanz.erklaerung_nach_antwort ? <Body>{instanz.erklaerung_nach_antwort}</Body> : null}
          {korrekt && <Pill label={letzteXp > 0 ? `+${letzteXp} XP` : "Tages-XP-Limit erreicht"} tone="good" />}
        </Card>
        <Button title="Weiter" onPress={() => naechsteWdh(wdhQueue, wdhIdx + 1)} testID="wdh-weiter" />
      </ScrollView>
    );
  }

  // fertig
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <H1>Fertig für heute 👏</H1>
        <Body>Stark gemacht! Du hast dein Tagesziel erreicht. Morgen geht's weiter.</Body>
        <Button title="Zurück zur Übersicht" onPress={() => { setPhase("liste"); ladeStatus(); }} testID="lp-fertig" />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md, backgroundColor: colors.background },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  option: {
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionText: { fontSize: font.body, color: colors.text },
});
