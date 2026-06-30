// Curriculum v2 – die ZIELSTRUKTUR (10 Themenblöcke, geplante Modul-IDs, Freischaltlevel)
// plus das Legacy→v2-Mapping aus der Übergabe. Reine Daten + Integritäts-/Coverage-Helfer.
//
// WICHTIG: Diese Datei beschreibt den Plan, sie importiert KEINE Inhalte. Solange die
// ausgearbeiteten Modultexte/Fragen/Vorlagen nicht vorliegen, bleiben die Module „new"
// (siehe curriculumCoverage). Es werden keine Legacy-Seeds überschrieben oder gelöscht.

import type { Audience, Difficulty } from "./types.js";

export interface CurriculumBlock {
  id: string;
  title: string;
  /** Inklusive Freischalt-Level-Spanne (Empfehlung, technisch anpassbar). */
  levelRange: [number, number];
  /** Geordnete Ziel-Modul-IDs dieses Blocks. */
  modules: string[];
  difficulty?: Difficulty;
  primaryAudience?: Audience[];
}

/** Reihenfolge der 10 Blöcke = inhaltlicher Lernpfad (Abschnitt 6, 21). */
export const CURRICULUM_BLOCKS: CurriculumBlock[] = [
  {
    id: "tb_geld_wert_entscheidungen",
    title: "Geld, Wert und Entscheidungen",
    levelRange: [1, 2],
    modules: [
      "konzept_geld",
      "konzept_tauschen",
      "konzept_bezahlen_vergleichen",
      "konzept_beduerfnisse_wuensche",
      "konzept_sparen",
      "konzept_budget",
      "konzept_geld_auf_konto",
      "konzept_konten",
      "konzept_notgroschen",
    ],
  },
  {
    id: "tb_sparen_zinsen_inflation",
    title: "Sparen, Zinsen, Inflation und Kaufkraft",
    levelRange: [3, 5],
    modules: [
      "konzept_zinsen",
      "konzept_zinsen_bekommen_zahlen",
      "konzept_zinsen_berechnen",
      "konzept_zinseszins",
      "konzept_inflation",
      "konzept_kaufkraft",
      "konzept_nominal_real",
      "konzept_sparen_reicht_nicht",
    ],
  },
  {
    id: "tb_unternehmen_verstehen",
    title: "Unternehmen verstehen",
    levelRange: [6, 10],
    modules: [
      "konzept_unternehmen",
      "konzept_problem_loesen",
      "konzept_produkt_dienstleistung_kunde",
      "konzept_geschaeftsmodell",
      "konzept_umsatz",
      "konzept_unternehmenskosten",
      "konzept_gewinn",
      "konzept_marge",
      "konzept_cashflow",
      "konzept_vermoegen_schulden_eigenkapital",
      "konzept_wettbewerb",
      "konzept_unternehmen_scheitern",
    ],
  },
  {
    id: "tb_aktien_eigentum",
    title: "Aktien und Eigentum",
    levelRange: [11, 14],
    modules: [
      "konzept_aktie",
      "konzept_eigentum_am_unternehmen",
      "konzept_warum_aktien_ausgeben",
      "konzept_aktionaer_sein",
      "konzept_chancen_risiken_aktie",
      "konzept_dividende",
      "konzept_kursgewinn",
      "konzept_gesamtrendite",
    ],
  },
  {
    id: "tb_boerse_verstehen",
    title: "Börse verstehen",
    levelRange: [15, 19],
    modules: [
      "konzept_boerse",
      "konzept_boerse_als_marktplatz",
      "konzept_angebot_nachfrage",
      "konzept_kurse",
      "konzept_erwartungen_nachrichten",
      "konzept_gute_firma_fallender_kurs",
      "konzept_schlechte_firma_steigender_kurs",
      "konzept_geldkurs_briefkurs",
      "konzept_spread",
      "konzept_liquiditaet",
      "konzept_index",
      "konzept_marktkapitalisierung",
    ],
  },
  {
    id: "tb_risiko_streuung_verhalten",
    title: "Risiko, Streuung und Verhalten",
    levelRange: [20, 26],
    modules: [
      "konzept_risiko",
      "konzept_schwankung_vs_verlust",
      "konzept_chance_risiko",
      "konzept_einzelrisiko",
      "konzept_marktrisiko",
      "konzept_diversifikation",
      "konzept_streuung_grenzen",
      "konzept_gier",
      "konzept_panik",
      "konzept_fomo",
      "konzept_heisse_tipps",
      "konzept_finfluencer",
      "konzept_betrug_erkennen",
    ],
  },
  {
    id: "tb_etf_langfristig",
    title: "ETF und langfristiges Investieren",
    levelRange: [27, 32],
    modules: [
      "konzept_fonds",
      "konzept_etf",
      "konzept_index_etf_zusammenhang",
      "konzept_etf_vs_einzelaktie",
      "konzept_welt_etf",
      "konzept_laender_etf",
      "konzept_branchen_etf",
      "konzept_etf_kosten",
      "konzept_ausschuettend_thesaurierend",
      "konzept_rebalancing",
      "konzept_etf_grenzen",
      "konzept_langfristig",
    ],
  },
  {
    id: "tb_depot_kosten_umsetzung",
    title: "Depot, Kosten und Umsetzung",
    levelRange: [33, 37],
    modules: [
      "konzept_depot",
      "konzept_verrechnungskonto",
      "konzept_kaufen_verkaufen",
      "konzept_orderarten",
      "konzept_ordergebuehren",
      "konzept_spread_kostenfaktor",
      "konzept_sparplan",
      "konzept_einmalanlage_vs_sparplan",
      "konzept_gebuehren_nettorendite",
      "konzept_entscheidungen_dokumentieren",
    ],
  },
  {
    id: "tb_kennzahlen_bewertung",
    title: "Kennzahlen und Bewertung",
    levelRange: [38, 42],
    difficulty: "advanced",
    primaryAudience: ["young_adults", "parents_teachers"],
    modules: [
      "konzept_preis_vs_wert",
      "konzept_gewinn_je_aktie",
      "konzept_kgv",
      "konzept_kuv",
      "konzept_dividendenrendite",
      "konzept_marge_kennzahl",
      "konzept_umsatzwachstum",
      "konzept_gewinnwachstum",
      "konzept_schulden_bewertung",
      "konzept_kennzahlen_grenzen",
    ],
  },
  {
    id: "tb_schutz_betrug_finanzverhalten",
    title: "Schutz, Betrug und Finanzverhalten",
    levelRange: [43, 48],
    modules: [
      "konzept_schnelle_gewinne",
      "konzept_garantierte_rendite",
      "konzept_werbung_vs_information",
      "konzept_interessenkonflikte",
      "konzept_phishing_kontosicherheit",
      "konzept_schuldenfallen",
      "konzept_dispo_konsumkredit",
      "konzept_eigene_finanzregeln",
      "konzept_investieren_vs_zocken",
      "konzept_finanzentscheidung_pruefen",
    ],
  },
];

/**
 * Legacy-Konzept-ID → Ziel-Modul-ID(s). `konzept_verdienen` wird in vier Module
 * gesplittet; einige IDs werden umbenannt (siehe ID-Konflikte unten). Quelle: Abschnitt 17.
 */
export const LEGACY_MODULE_MAPPING: Record<string, string | string[]> = {
  konzept_geld: "konzept_geld",
  konzept_sparen: "konzept_sparen",
  konzept_konten: "konzept_konten",
  konzept_inflation: "konzept_inflation",

  konzept_unternehmen: "konzept_unternehmen",
  konzept_verdienen: [
    "konzept_geschaeftsmodell",
    "konzept_umsatz",
    "konzept_unternehmenskosten",
    "konzept_gewinn",
  ],
  konzept_umsatz: "konzept_umsatz",
  konzept_gewinn: "konzept_gewinn",

  konzept_aktie: "konzept_aktie",
  konzept_kurse: "konzept_kurse",
  konzept_dividende: "konzept_dividende",

  konzept_risiko: "konzept_risiko",
  konzept_diversifikation: "konzept_diversifikation",

  konzept_etf: "konzept_etf",
  konzept_aktie_vs_etf: "konzept_etf_vs_einzelaktie",

  konzept_depot: "konzept_depot",
  konzept_kosten: "konzept_ordergebuehren",
  konzept_sparplan: "konzept_sparplan",

  konzept_langfristig: "konzept_langfristig",
  konzept_zocken: "konzept_investieren_vs_zocken",
};

/**
 * IDs, die im neuen Curriculum NICHT als Ziel-Modul-ID auftauchen dürfen (Konflikt-Guards,
 * Abschnitt 18). `konzept_kosten` ist nur Legacy-Quelle → wird zu `konzept_ordergebuehren`.
 */
export const FORBIDDEN_TARGET_IDS: readonly string[] = ["konzept_kosten"];

// ── Helfer ────────────────────────────────────────────────────────────────────

export function alleZielModule(): string[] {
  return CURRICULUM_BLOCKS.flatMap((b) => b.modules);
}

export function blockFuerModul(moduleId: string): CurriculumBlock | undefined {
  return CURRICULUM_BLOCKS.find((b) => b.modules.includes(moduleId));
}

/** Ziel-Modul-IDs für eine Legacy-ID (immer als Array). */
export function targetsFor(legacyId: string): string[] {
  const t = LEGACY_MODULE_MAPPING[legacyId];
  return t === undefined ? [] : Array.isArray(t) ? t : [t];
}

/** Legacy-Quell-IDs, deren Inhalt ein Ziel-Modul speist (kann mehrere sein). */
export function legacySourcesFor(targetId: string): string[] {
  return Object.entries(LEGACY_MODULE_MAPPING)
    .filter(([, v]) => (Array.isArray(v) ? v.includes(targetId) : v === targetId))
    .map(([k]) => k);
}

export type ModuleStatus = "migrate" | "new";

export interface ModulePlanEntry {
  blockId: string;
  moduleId: string;
  status: ModuleStatus;
  legacySources: string[];
}

/** Plan aller Ziel-Module mit Status (migrate = Legacy-Inhalt vorhanden, new = zu schreiben). */
export function curriculumPlan(): ModulePlanEntry[] {
  const out: ModulePlanEntry[] = [];
  for (const b of CURRICULUM_BLOCKS) {
    for (const m of b.modules) {
      const sources = legacySourcesFor(m);
      out.push({ blockId: b.id, moduleId: m, status: sources.length ? "migrate" : "new", legacySources: sources });
    }
  }
  return out;
}

export interface CurriculumIntegrityIssue {
  kind: "duplicate_module" | "forbidden_id" | "mapping_target_missing";
  detail: string;
}

/** Strukturelle Integrität der ZIELSTRUKTUR (keine Inhalte nötig). Leer = ok. */
export function checkCurriculumIntegrity(): CurriculumIntegrityIssue[] {
  const issues: CurriculumIntegrityIssue[] = [];
  const all = alleZielModule();

  const seen = new Set<string>();
  for (const m of all) {
    if (seen.has(m)) issues.push({ kind: "duplicate_module", detail: `Modul-ID doppelt: ${m}` });
    seen.add(m);
  }
  for (const f of FORBIDDEN_TARGET_IDS) {
    if (seen.has(f)) issues.push({ kind: "forbidden_id", detail: `verbotene Ziel-ID verwendet: ${f}` });
  }
  // Jedes Mapping-Ziel muss in genau einem Block existieren.
  for (const legacyId of Object.keys(LEGACY_MODULE_MAPPING)) {
    for (const target of targetsFor(legacyId)) {
      if (!seen.has(target)) {
        issues.push({ kind: "mapping_target_missing", detail: `${legacyId} → ${target} fehlt in den Blöcken` });
      }
    }
  }
  return issues;
}

export interface CurriculumCoverage {
  totalModules: number;
  migrate: number;
  new: number;
  perBlock: { blockId: string; total: number; migrate: number; new: number }[];
}

/** Fortschrittsübersicht: wie viele Ziel-Module aus Legacy migrierbar vs. neu zu schreiben sind. */
export function curriculumCoverage(): CurriculumCoverage {
  const plan = curriculumPlan();
  const perBlock = CURRICULUM_BLOCKS.map((b) => {
    const rows = plan.filter((p) => p.blockId === b.id);
    return {
      blockId: b.id,
      total: rows.length,
      migrate: rows.filter((r) => r.status === "migrate").length,
      new: rows.filter((r) => r.status === "new").length,
    };
  });
  return {
    totalModules: plan.length,
    migrate: plan.filter((p) => p.status === "migrate").length,
    new: plan.filter((p) => p.status === "new").length,
    perBlock,
  };
}
