// Importiert die Lern-Inhalte (Curriculum v2) in die DB-Inhaltstabellen. Idempotent (upsert).
// Quelle: packages/learning/src/content/v2/*.json (Blockdateien). Die Mapping-Logik spiegelt
// packages/learning/src/bridge.ts (v2 → Legacy-Tabellenform). Ausführen:
//   node apps/app/scripts/seed-learning.mjs
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const here = dirname(fileURLToPath(import.meta.url));
const v2Dir = join(here, "../../../packages/learning/src/content/v2");

const LEVEL_TO_STUFE = {
  explain: "erklaeren",
  recognize: "erkennen",
  understand: "verstehen",
  apply: "anwenden",
  master: "meistern",
};
const STUFEN = ["erklaeren", "erkennen", "verstehen", "anwenden", "meistern"];

// v2-Blockdateien lesen (block-gewrappt) und Module mit blockId einsammeln.
const blockFiles = readdirSync(v2Dir)
  .filter((n) => /^\d\d_tb_.*\.json$/.test(n))
  .sort();
const blocks = [];
const modules = [];
for (const f of blockFiles) {
  const b = JSON.parse(readFileSync(join(v2Dir, f), "utf8")).block;
  blocks.push({ id: b.id, titel: { de: b.title } });
  for (const m of b.modules) modules.push({ ...m, blockId: b.id });
}

const seed = {
  themenbloecke: blocks,
  konzepte: modules.map((m, i) => ({
    id: m.id,
    modul_nr: i + 1,
    themenblock_id: m.blockId,
    titel: { de: m.title },
    ist_rechnerisch: (m.calculationTemplates?.length ?? 0) > 0,
    voraussetzungen: m.prerequisites ?? [],
    freischalt_level: m.unlockLevel,
    erklaerungen: m.explanations,
    stufen: STUFEN.filter((s) => m.questions.some((q) => LEVEL_TO_STUFE[q.level] === s)),
    type: m.type,
    pedagogy: m.pedagogy,
    glossary_terms: m.glossaryTerms ?? [],
    teacher_support: m.teacherSupport ?? null,
    parent_support: m.parentSupport ?? null,
  })),
  fragen: modules.flatMap((m) =>
    m.questions.map((q) => ({
      id: q.id,
      konzept_id: m.id,
      stufe: LEVEL_TO_STUFE[q.level],
      typ: "multiple_choice",
      frage: { de: q.question },
      korrekte_antwort: { de: q.correctAnswer },
      distraktor_pool: q.distractors.map((d) => ({ text: { de: d.text }, naehe: d.closeness })),
      anzahl_distraktoren_angezeigt: q.displayedDistractors ?? 3,
      erklaerung_nach_antwort: { de: q.explanationAfterAnswer },
      wissenspunkte: q.points,
    }))
  ),
  vorlagen: modules.flatMap((m) =>
    (m.calculationTemplates ?? []).map((c) => ({
      id: c.id,
      konzept_id: m.id,
      stufe: c.level === "master" ? "meistern" : "anwenden",
      parameter: Object.fromEntries(
        Object.entries(c.parameters).map(([k, p]) => [k, { typ: "int", min: p.min, max: p.max }])
      ),
      frage_vorlage: { de: c.questionTemplate },
      loesung_formel: c.solutionFormula,
      distraktor_formeln: c.distractorFormulas,
      einheit: c.unit ?? "",
      // Rundungssemantik aus der Quelle (wie bridge.ts): integer→ganzzahl, decimal1/2→dezimal1/2.
      rundung:
        c.rounding === "decimal1" ? "dezimal1" : c.rounding === "decimal2" ? "dezimal2" : "ganzzahl",
      erklaerung_nach_antwort: { de: c.explanationTemplate },
      wissenspunkte: c.points,
    }))
  ),
};

async function up(table, rows, onConflict) {
  if (!rows?.length) return;
  const { error } = await admin.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function main() {
  await up("themenbloecke", seed.themenbloecke, "id");
  await up("konzepte", seed.konzepte, "id");
  await up("fragen", seed.fragen, "id");
  await up("vorlagen", seed.vorlagen, "id");

  // Lernen ↔ Werte: Konzepte mit passenden Markt-Labor-Werten verknüpfen (über Ticker auflösen).
  // v2-IDs (z. B. konzept_etf_vs_einzelaktie statt des alten konzept_aktie_vs_etf).
  const LINKS = {
    konzept_unternehmen: "AAPL", konzept_aktie: "AAPL", konzept_umsatz: "AAPL",
    konzept_gewinn: "MSFT", konzept_kurse: "NVDA", konzept_dividende: "ALV",
    konzept_risiko: "TSLA", konzept_diversifikation: "IWDA", konzept_etf: "IWDA",
    konzept_etf_vs_einzelaktie: "IWDA", konzept_langfristig: "CSPX", konzept_sparplan: "CSPX",
  };
  const { data: instruments } = await admin.from("instruments").select("id, ticker");
  const idByTicker = new Map((instruments ?? []).map((i) => [i.ticker, i.id]));
  const konzeptIds = new Set(seed.konzepte.map((k) => k.id));
  const links = Object.entries(LINKS)
    .filter(([k, t]) => konzeptIds.has(k) && idByTicker.has(t))
    .map(([k, t]) => ({ learning_module_id: k, asset_id: idByTicker.get(t) }));
  await up("learning_module_asset_links", links, "learning_module_id,asset_id");

  console.log(
    `✓ Lern-Inhalte (v2) importiert: ${seed.themenbloecke.length} Themenblöcke, ${seed.konzepte.length} Konzepte, ${seed.fragen.length} Fragen, ${seed.vorlagen.length} Vorlagen, ${links.length} Wert-Verknüpfungen`
  );
}

main().catch((e) => {
  console.error("Seed-Learning fehlgeschlagen:", e.message);
  process.exit(1);
});
