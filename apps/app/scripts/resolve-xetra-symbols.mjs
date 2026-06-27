// Löst die Xetra-Symbole der Instrumente über die Twelve-Data-Symbol-Suche auf
// (kein Raten) und setzt provider_symbol auf "<XetraSymbol>:XETR".
//
//   TWELVEDATA_API_KEY=... node apps/app/scripts/resolve-xetra-symbols.mjs          # Dry-Run (nur Vorschau)
//   TWELVEDATA_API_KEY=... node apps/app/scripts/resolve-xetra-symbols.mjs --apply  # DB + seed.sql schreiben
//   ... --all     # auch bereits gesetzte :XETR-Werte erneut prüfen
//
// Standard: nur Instrumente OHNE :XETR (die ausländischen) werden aufgelöst; die
// deutschen/EU-Werte tragen bereits korrekte Xetra-Kürzel. Free-Tier ist
// credit-limitiert → es wird gedrosselt (REQ_INTERVAL_MS).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const API_KEY = process.env.TWELVEDATA_API_KEY;
const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--all");
const REQ_INTERVAL_MS = Number(process.env.TD_INTERVAL_MS ?? 8000); // ~8 Calls/min (Free-Tier)

if (!API_KEY) {
  console.error("Fehlt: TWELVEDATA_API_KEY. Beispiel:\n  TWELVEDATA_API_KEY=dein_key node apps/app/scripts/resolve-xetra-symbols.mjs");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = join(here, "../../../supabase/seed.sql");
const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sucht das Xetra-Listing (MIC XETR, EUR) zu einem Suchbegriff (Ticker oder Name).
async function searchXetra(query) {
  const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&outputsize=30&apikey=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const rows = Array.isArray(json?.data) ? json.data : [];
  const hit = rows.find(
    (r) => (r.mic_code === "XETR" || /xetra/i.test(r.exchange ?? "")) && (r.currency ?? "EUR") === "EUR",
  );
  return hit?.symbol ?? null;
}

async function resolveOne(inst) {
  for (const q of [inst.ticker, inst.name].filter(Boolean)) {
    try {
      const sym = await searchXetra(q);
      if (sym) return sym;
    } catch (e) {
      console.warn(`  ! Suche "${q}" fehlgeschlagen: ${e.message}`);
    }
    await sleep(REQ_INTERVAL_MS);
  }
  return null;
}

function patchSeed(mapping) {
  let sql = readFileSync(seedPath, "utf8");
  let patched = 0;
  for (const { ticker, provider } of mapping) {
    const esc = ticker.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
    const lineRe = new RegExp(`^(\\s*\\('(?:stock|etf)',[^\\n]*'${esc}',[^\\n]*)$`, "m");
    sql = sql.replace(lineRe, (line) => {
      patched++;
      // letztes '...' (provider_symbol) der Zeile ersetzen
      return line.replace(/'([^']*)'(\s*\),?)\s*$/, `'${provider}'$2`);
    });
  }
  writeFileSync(seedPath, sql);
  return patched;
}

const { data: instruments, error } = await admin
  .from("instruments")
  .select("id, name, ticker, provider_symbol")
  .eq("is_active", true)
  .order("ticker");
if (error) {
  console.error("DB-Fehler:", error.message);
  process.exit(1);
}

const todo = (instruments ?? []).filter((i) => ALL || !String(i.provider_symbol ?? "").includes(":XETR"));
console.log(`${todo.length} Instrumente werden aufgelöst (von ${instruments.length}). Modus: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

const mapping = [];
const misses = [];
for (const inst of todo) {
  const sym = await resolveOne(inst);
  if (sym) {
    const provider = `${sym}:XETR`;
    mapping.push({ id: inst.id, ticker: inst.ticker, provider });
    console.log(`  ✓ ${inst.ticker.padEnd(7)} ${String(inst.provider_symbol).padEnd(10)} → ${provider}`);
  } else {
    misses.push(inst.ticker);
    console.log(`  – ${inst.ticker.padEnd(7)} keine Xetra-Notierung gefunden (bleibt: ${inst.provider_symbol})`);
  }
  await sleep(REQ_INTERVAL_MS);
}

console.log(`\n${mapping.length} aufgelöst, ${misses.length} ohne Xetra-Treffer${misses.length ? ` (${misses.join(", ")})` : ""}.`);

if (APPLY && mapping.length) {
  for (const m of mapping) {
    const { error: upErr } = await admin.from("instruments").update({ provider_symbol: m.provider }).eq("id", m.id);
    if (upErr) console.warn(`  ! DB-Update ${m.ticker}: ${upErr.message}`);
  }
  const patched = patchSeed(mapping);
  console.log(`DB aktualisiert; seed.sql gepatcht (${patched} Zeilen).`);
} else if (!APPLY) {
  console.log("Dry-Run – nichts geschrieben. Mit --apply ausführen, um DB + seed.sql zu aktualisieren.");
}
