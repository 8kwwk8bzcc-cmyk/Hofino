// @hofino/learning – Datenmodell des Lern-/Festigungs-Kerns.
// Feldnamen bewusst Deutsch (1:1 aus der Seed-/Spec-Struktur), damit Inhalte datengetrieben bleiben.

/** Mehrsprachiger Text. MVP befüllt nur `de`; weitere Sprachen optional. */
export interface LangText {
  de: string;
  en?: string;
}

export type Stufe = "erklaeren" | "erkennen" | "verstehen" | "anwenden" | "meistern";
export const STUFEN: readonly Stufe[] = ["erklaeren", "erkennen", "verstehen", "anwenden", "meistern"];

export type Altersband = "kind_8_10" | "kind_11_14" | "eltern_lehrer";

/** Nähe eines Distraktors: 1 = klar falsch … 3 = nah dran (für Schwierigkeitssteigerung). */
export type Naehe = 1 | 2 | 3;

// ─────────────────────────────────────────────────────────────────────────────
// Inhalte (redaktionell / deterministisch) – §3–§5
// ─────────────────────────────────────────────────────────────────────────────
export interface Themenblock {
  id: string;
  titel: LangText;
}

export interface Konzept {
  id: string;
  modul_nr: number;
  themenblock_id: string;
  titel: LangText;
  /** true → Stufe 4–5 aus parametrischen Vorlagen; false → kuratierte MC mit näheren Distraktoren. */
  ist_rechnerisch: boolean;
  voraussetzungen: string[];
  freischalt_level: number;
  erklaerungen: Record<Altersband, LangText>;
  stufen: Stufe[];
}

export interface Distraktor {
  text: LangText;
  naehe: Naehe;
}

export interface Frage {
  id: string;
  konzept_id: string;
  stufe: Stufe;
  typ: "multiple_choice";
  frage: LangText;
  korrekte_antwort: LangText;
  distraktor_pool: Distraktor[];
  anzahl_distraktoren_angezeigt: number;
  erklaerung_nach_antwort: LangText;
  wissenspunkte: number;
}

export interface ParamSpec {
  typ: "int";
  min: number;
  max: number;
}

export interface Vorlage {
  id: string;
  konzept_id: string;
  stufe: Stufe;
  parameter: Record<string, ParamSpec>;
  frage_vorlage: LangText;
  loesung_formel: string;
  distraktor_formeln: string[];
  einheit: string;
  rundung: "ganzzahl";
  erklaerung_nach_antwort?: LangText;
  wissenspunkte: number;
}

/** Gesamter Seed-/Inhaltscontainer (so wie Hofino_Seed_Konzepte.json). */
export interface InhaltsSeed {
  themenbloecke: Themenblock[];
  konzepte: Konzept[];
  fragen: Frage[];
  vorlagen: Vorlage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine-Ausgabe: eine spielfertige, gemischte MC-Frage
// ─────────────────────────────────────────────────────────────────────────────
export interface AntwortOption {
  text: string;
  korrekt: boolean;
}

export interface FrageInstanz {
  /** Herkunft: genau eine von beiden gesetzt. */
  frage_id?: string;
  vorlage_id?: string;
  konzept_id: string;
  stufe: Stufe;
  frage: string;
  /** 2–4 Optionen, Reihenfolge gemischt. */
  optionen: AntwortOption[];
  erklaerung_nach_antwort: string;
  wissenspunkte: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spaced Repetition (Leitner) – §7
// ─────────────────────────────────────────────────────────────────────────────
export type LeitnerBox = 1 | 2 | 3 | 4 | 5;

export interface SRZustand {
  konzept_id: string;
  leitner_box: LeitnerBox;
  richtig_in_folge: number;
  gemeistert: boolean;
  /** ISO-Datum (YYYY-MM-DD). */
  naechste_faelligkeit: string;
  letzte_antwort_korrekt: boolean | null;
}

/** Linearer Erstlern-Fortschritt eines Konzepts (Erklärung + Stufenleiter). */
export interface KonzeptFortschritt {
  konzept_id: string;
  erklaerung_gesehen: boolean;
  hoechste_abgeschlossene_stufe: Stufe | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auszeichnungen – §9 (Datenmodell jetzt, UI später)
// ─────────────────────────────────────────────────────────────────────────────
export type AuszeichnungEbene = "rekord" | "meilenstein";
export type Rang = "bronze" | "silber" | "gold";

export interface AuszeichnungBedingung {
  metrik: string;
  konzept_id?: string;
  schwelle: number;
}

export interface AuszeichnungBelohnung {
  wissenspunkte: number;
  haus_objekt: string | null;
}

export interface AuszeichnungStufe {
  rang: Rang;
  bedingung: AuszeichnungBedingung;
  belohnung: AuszeichnungBelohnung;
}

export interface Auszeichnung {
  id: string;
  ebene: AuszeichnungEbene;
  kategorie?: string;
  titel: LangText;
  typ?: "gestuft";
  permanent: boolean;
  stufen?: AuszeichnungStufe[];
  // Rekorde:
  metrik?: string;
  anzeige?: "hoechstwert";
  // Saison (ab 1.2):
  saisonal: boolean;
  start: string | null;
  ende: string | null;
  sichtbarkeit?: "freunde_freigabe";
}

// ─────────────────────────────────────────────────────────────────────────────
// Tuning-Parameter (§13) – Startwerte, alle anpassbar
// ─────────────────────────────────────────────────────────────────────────────
export interface TuningConfig {
  angezeigte_distraktoren: number;
  tageslimit_neu: number;
  tageslimit_wiederholung: number;
  mastery_schwelle: number;
  leitner_intervalle_tage: readonly number[];
  tages_cap_wiederhol_xp: number;
}

export const DEFAULT_TUNING: TuningConfig = {
  angezeigte_distraktoren: 3,
  tageslimit_neu: 10,
  tageslimit_wiederholung: 10,
  mastery_schwelle: 3,
  leitner_intervalle_tage: [1, 3, 7, 16, 35],
  tages_cap_wiederhol_xp: 300,
};
