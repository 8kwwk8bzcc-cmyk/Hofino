// Seed für die lokale Test-Umgebung / das Cockpit.
// Legt feste Test-Nutzer mit bekanntem Passwort an (für Dev-Auto-Login) und etwas Aktivität.
// Ausführen:  node scripts/seed-test-users.mjs   (lokaler Supabase-Stack muss laufen)
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
// Lokale Standard-Keys der Supabase-CLI (kein Geheimnis, nur lokal gültig).
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const PASSWORD = "hofino-dev-123";

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const USERS = [
  { key: "mia", email: "mia@hofino.test", name: "Mia", role: "child" },
  { key: "tom", email: "tom@hofino.test", name: "Tom", role: "child" },
  { key: "alex", email: "alex@hofino.test", name: "Alex", role: "adult" },
  { key: "papa", email: "papa@hofino.test", name: "Papa", role: "parent" },
  { key: "lehrer", email: "lehrer@hofino.test", name: "Frau Klein", role: "teacher" },
];

async function deleteByEmail(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users) {
    if (u.email === email) await admin.auth.admin.deleteUser(u.id, false); // hard delete; cascadet
  }
}

async function deleteExisting() {
  for (const u of USERS) await deleteByEmail(u.email);
}

async function createUsers() {
  const created = {};
  for (const u of USERS) {
    let { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error && /registered/i.test(error.message)) {
      await deleteByEmail(u.email);
      ({ data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
      }));
    }
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
    const { data: prof, error: pErr } = await admin
      .from("profiles")
      .insert({ auth_user_id: data.user.id, role: u.role, display_name: u.name })
      .select("id")
      .single();
    if (pErr) throw new Error(`profile ${u.email}: ${pErr.message}`);
    created[u.key] = { ...u, authId: data.user.id, profileId: prof.id };
  }
  return created;
}

async function linkFamily(c) {
  const { error } = await admin.from("parent_child_links").insert([
    { parent_profile_id: c.papa.profileId, child_profile_id: c.mia.profileId, status: "approved" },
    { parent_profile_id: c.papa.profileId, child_profile_id: c.tom.profileId, status: "approved" },
  ]);
  if (error) throw new Error(`links: ${error.message}`);
}

async function setupClass(c) {
  const { data: cls, error } = await admin
    .from("classes")
    .insert({ teacher_profile_id: c.lehrer.profileId, name: "Klasse 6b", class_code: "TEST6B" })
    .select("id")
    .single();
  if (error) throw new Error(`class: ${error.message}`);
  const { error: mErr } = await admin.from("class_members").insert([
    { class_id: cls.id, child_profile_id: c.mia.profileId },
    { class_id: cls.id, child_profile_id: c.tom.profileId },
  ]);
  if (mErr) throw new Error(`members: ${mErr.message}`);
}

// Aktivität über die echten RPCs (eigene Session je Kind) – damit Dashboards Daten zeigen.
async function seedActivity(email, { modules, buyTicker, buyQty }) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: sErr } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (sErr) throw new Error(`signin ${email}: ${sErr.message}`);
  for (const m of modules) await c.rpc("complete_module", { p_module: m, p_correct: 3, p_total: 3 });
  if (buyTicker) {
    const { data: inst } = await c.from("instruments").select("id").eq("ticker", buyTicker).single();
    if (inst) await c.rpc("place_order", { p_instrument: inst.id, p_side: "buy", p_qty: buyQty });
  }
}

async function main() {
  await deleteExisting();
  const c = await createUsers();
  await linkFamily(c);
  await setupClass(c);
  await seedActivity("mia@hofino.test", { modules: ["m01", "m02"], buyTicker: "AAPL", buyQty: 3 });
  await seedActivity("tom@hofino.test", { modules: ["m01"], buyTicker: "SAP", buyQty: 2 });

  console.log("✓ Test-Nutzer geseedet (Passwort: " + PASSWORD + "):");
  for (const u of USERS) console.log(`  - ${u.email}  [${u.role}]  ${u.name}`);
  console.log("  Klasse: Klasse 6b (Code TEST6B), Mitglieder: Mia, Tom");
  console.log("  Eltern Papa verknüpft mit Mia & Tom (freigegeben)");
}

main().catch((e) => {
  console.error("Seed fehlgeschlagen:", e.message);
  process.exit(1);
});
