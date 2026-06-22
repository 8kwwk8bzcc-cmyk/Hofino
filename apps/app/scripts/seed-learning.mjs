// Importiert die Lern-Inhalte (Seed-JSON) in die DB-Inhaltstabellen. Idempotent (upsert).
// Ausführen:  node apps/app/scripts/seed-learning.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(here, "../../../packages/learning/src/seed.json"), "utf8"));

async function up(table, rows, onConflict) {
  if (!rows?.length) return;
  const { error } = await admin.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function main() {
  await up("themenbloecke", seed.themenbloecke, "id");
  await up(
    "konzepte",
    seed.konzepte.map((k) => ({
      id: k.id,
      modul_nr: k.modul_nr,
      themenblock_id: k.themenblock_id,
      titel: k.titel,
      ist_rechnerisch: k.ist_rechnerisch,
      voraussetzungen: k.voraussetzungen,
      freischalt_level: k.freischalt_level,
      erklaerungen: k.erklaerungen,
      stufen: k.stufen,
    })),
    "id"
  );
  await up("fragen", seed.fragen, "id");
  await up("vorlagen", seed.vorlagen, "id");

  console.log(
    `✓ Lern-Inhalte importiert: ${seed.themenbloecke.length} Themenblöcke, ${seed.konzepte.length} Konzepte, ${seed.fragen.length} Fragen, ${seed.vorlagen.length} Vorlagen`
  );
}

main().catch((e) => {
  console.error("Seed-Learning fehlgeschlagen:", e.message);
  process.exit(1);
});
