// Frage-Engine: Distraktor-Auswahl (nach Nähe), parametrische Instanziierung (mit
// Kollisions-Validierung) und Leitner-Spaced-Repetition. Reine Funktionen, RNG injizierbar.
import { evalFormel, evalFormelValue } from "./formel.js";
import {
  DEFAULT_TUNING,
  type Frage,
  type FrageInstanz,
  type LeitnerBox,
  type SRZustand,
  type Stufe,
  type TuningConfig,
  type Vorlage,
} from "./types.js";

/** Deterministischer RNG (mulberry32) für reproduzierbare Tests. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// Gewünschte Distraktor-Nähe je Stufe: höhere Stufe → nähere (schwerer abgrenzbare) Distraktoren.
const ZIEL_NAEHE: Record<Stufe, number> = {
  erklaeren: 1,
  erkennen: 1,
  verstehen: 2,
  anwenden: 3,
  meistern: 3,
};

/** Wählt stufengerecht Distraktoren aus dem Pool (bevorzugt passende Nähe), Reihenfolge gemischt. */
export function waehleDistraktoren(
  pool: { text: { de: string }; naehe: number }[],
  stufe: Stufe,
  anzahl: number,
  rng: () => number
): string[] {
  const ziel = ZIEL_NAEHE[stufe];
  const sortiert = pool
    .map((d) => ({ d, dist: Math.abs(d.naehe - ziel), r: rng() }))
    .sort((a, b) => a.dist - b.dist || a.r - b.r)
    .map((x) => x.d.text.de);
  return sortiert.slice(0, Math.min(anzahl, sortiert.length));
}

/** Baut aus einer kuratierten Frage eine spielfertige, gemischte Instanz. */
export function instanziiereFrage(
  frage: Frage,
  rng: () => number,
  tuning: TuningConfig = DEFAULT_TUNING
): FrageInstanz {
  const anzahl = frage.anzahl_distraktoren_angezeigt || tuning.angezeigte_distraktoren;
  const distraktoren = waehleDistraktoren(frage.distraktor_pool, frage.stufe, anzahl, rng);
  const optionen = shuffle(
    [{ text: frage.korrekte_antwort.de, korrekt: true }, ...distraktoren.map((t) => ({ text: t, korrekt: false }))],
    rng
  );
  return {
    frage_id: frage.id,
    konzept_id: frage.konzept_id,
    stufe: frage.stufe,
    frage: frage.frage.de,
    optionen,
    erklaerung_nach_antwort: frage.erklaerung_nach_antwort.de,
    wissenspunkte: frage.wissenspunkte,
  };
}

function fuelle(text: string, vars: Record<string, number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

function runde(wert: number, rundung: string): number {
  return rundung === "ganzzahl" ? Math.round(wert) : wert;
}

/**
 * Instanziiert eine parametrische Vorlage: zieht Parameter, berechnet Lösung + Distraktoren.
 * Numerische Vorlagen verlangen paarweise verschiedene Antworten (Neu-Ziehen bei Kollision).
 * Kategoriale Vorlagen (z. B. „günstiger? → 'A'/'B'/'gleich'") haben einen kleinen Wertebereich;
 * dort werden doppelte Distraktoren entfernt und die beste (distraktorreichste) Ziehung genommen.
 */
export function instanziiereVorlage(
  vorlage: Vorlage,
  rng: () => number,
  maxVersuche = 50
): FrageInstanz {
  const gewuenschteDistraktoren = vorlage.distraktor_formeln.length;
  let beste: { vars: Record<string, number>; loesung: string; distraktoren: string[] } | null = null;

  for (let versuch = 0; versuch < maxVersuche; versuch++) {
    const vars: Record<string, number> = {};
    for (const [name, spec] of Object.entries(vorlage.parameter)) {
      vars[name] = randInt(spec.min, spec.max, rng);
    }
    const fmt = (v: number | string) =>
      typeof v === "string"
        ? v
        : vorlage.einheit
          ? `${runde(v, vorlage.rundung)} ${vorlage.einheit}`
          : `${runde(v, vorlage.rundung)}`;
    const loesungTxt = fmt(evalFormelValue(vorlage.loesung_formel, vars));
    const distraktorTxt = vorlage.distraktor_formeln.map((f) => fmt(evalFormelValue(f, vars)));

    // Eindeutige Distraktoren ≠ Lösung (Reihenfolge erhalten).
    const eindeutig = [...new Set(distraktorTxt)].filter((d) => d !== loesungTxt);

    if (eindeutig.length === gewuenschteDistraktoren) {
      // Volle Qualität → sofort verwenden.
      return baueInstanzAusVorlage(vorlage, vars, loesungTxt, eindeutig, rng);
    }
    if (!beste || eindeutig.length > beste.distraktoren.length) {
      beste = { vars, loesung: loesungTxt, distraktoren: eindeutig };
    }
  }

  // Fallback (kategoriale Vorlagen): beste Ziehung mit ≥1 eindeutigem Distraktor.
  if (beste && beste.distraktoren.length >= 1) {
    return baueInstanzAusVorlage(vorlage, beste.vars, beste.loesung, beste.distraktoren, rng);
  }
  throw new Error(`Konnte für ${vorlage.id} keine kollisionsfreie Instanz erzeugen`);
}

function baueInstanzAusVorlage(
  vorlage: Vorlage,
  vars: Record<string, number>,
  loesungTxt: string,
  distraktorTxt: string[],
  rng: () => number
): FrageInstanz {
  const optionen = shuffle(
    [{ text: loesungTxt, korrekt: true }, ...distraktorTxt.map((d) => ({ text: d, korrekt: false }))],
    rng
  );
  return {
    vorlage_id: vorlage.id,
    konzept_id: vorlage.konzept_id,
    stufe: vorlage.stufe,
    frage: fuelle(vorlage.frage_vorlage.de, vars),
    optionen,
    erklaerung_nach_antwort: vorlage.erklaerung_nach_antwort ? fuelle(vorlage.erklaerung_nach_antwort.de, vars) : "",
    wissenspunkte: vorlage.wissenspunkte,
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Leitner-Übergang nach einer Antwort. Richtig → Box +1; falsch → Box 1.
 * Gemeistert = Mastery-Schwelle (3) richtig in Folge; einmal gemeistert bleibt gemeistert (nie bestrafen).
 */
export function naechsterLeitner(
  zustand: SRZustand,
  korrekt: boolean,
  heute: string,
  tuning: TuningConfig = DEFAULT_TUNING
): SRZustand {
  const box: LeitnerBox = korrekt
    ? (Math.min(5, zustand.leitner_box + 1) as LeitnerBox)
    : 1;
  const richtig_in_folge = korrekt ? zustand.richtig_in_folge + 1 : 0;
  const gemeistert = zustand.gemeistert || richtig_in_folge >= tuning.mastery_schwelle;
  const intervall = tuning.leitner_intervalle_tage[box - 1] ?? 1;
  return {
    konzept_id: zustand.konzept_id,
    leitner_box: box,
    richtig_in_folge,
    gemeistert,
    naechste_faelligkeit: addDays(heute, intervall),
    letzte_antwort_korrekt: korrekt,
  };
}

/** Startzustand für ein neu begonnenes Konzept. */
export function initLeitner(konzept_id: string, heute: string): SRZustand {
  return {
    konzept_id,
    leitner_box: 1,
    richtig_in_folge: 0,
    gemeistert: false,
    naechste_faelligkeit: heute,
    letzte_antwort_korrekt: null,
  };
}

/** Einstiegsstufe nach Altersband (§13). */
export function einstiegsStufe(alter: number): Stufe {
  if (alter <= 10) return "erklaeren";
  if (alter <= 12) return "erkennen";
  return "verstehen";
}
