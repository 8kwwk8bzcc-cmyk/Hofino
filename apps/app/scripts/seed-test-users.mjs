// Seed für die lokale Test-Umgebung / das Cockpit. Idempotent (mehrfach ausführbar).
// Legt feste Test-Nutzer mit bekanntem Passwort an (für Dev-Auto-Login) und etwas Aktivität.
// Ausführen:  node apps/app/scripts/seed-test-users.mjs   (lokaler Supabase-Stack muss laufen)
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

async function findUserByEmail(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email) ?? null;
}

// Auth-Nutzer finden oder anlegen; Passwort sicherstellen; Profil upserten.
async function ensureUser(u) {
  let authId;
  const existing = await findUserByEmail(u.email);
  if (existing) {
    authId = existing.id;
    await admin.auth.admin.updateUserById(authId, { password: PASSWORD, email_confirm: true });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
    authId = data.user.id;
  }
  const { data: prof, error: pErr } = await admin
    .from("profiles")
    .upsert({ auth_user_id: authId, role: u.role, display_name: u.name }, { onConflict: "auth_user_id" })
    .select("id")
    .single();
  if (pErr) throw new Error(`profile ${u.email}: ${pErr.message}`);
  return { ...u, authId, profileId: prof.id };
}

// Transaktionsdaten eines Spielers zurücksetzen (für reproduzierbare Aktivität).
async function resetPlayer(profileId) {
  const { data: pf } = await admin.from("portfolios").select("id").eq("owner_profile_id", profileId).maybeSingle();
  if (pf) {
    await admin.from("holdings").delete().eq("portfolio_id", pf.id);
    await admin.from("orders").delete().eq("portfolio_id", pf.id);
    await admin.from("portfolios").update({ cash_cents: 500000 }).eq("id", pf.id);
  }
  await admin.from("capital_grants").delete().eq("profile_id", profileId);
  await admin.from("lern_konzept_fortschritt").delete().eq("profile_id", profileId);
  await admin.from("lern_status").delete().eq("profile_id", profileId);
  await admin.from("lern_antworten").delete().eq("profile_id", profileId);
  await admin.from("lern_tageszaehler").delete().eq("profile_id", profileId);
  await admin.from("lern_sr_zustand").delete().eq("profile_id", profileId);
}

// Aktivität über die echten RPCs (eigene Session je Kind) – damit Dashboards Daten zeigen.
// Lernfortschritt läuft über den neuen Lern-Kern (lern_*): Konzept abschließen (Kapital +
// Stufe 'meistern') plus eine korrekte Antwort je Konzept für XP (lern_status.xp_gesamt).
async function seedActivity(email, { konzepte, buyTicker, buyQty }) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: sErr } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (sErr) throw new Error(`signin ${email}: ${sErr.message}`);
  const today = new Date().toISOString().slice(0, 10);
  for (const k of konzepte) {
    await c.rpc("lern_antwort_speichern", {
      p_konzept: k, p_stufe: "kennen", p_frage_id: "", p_vorlage_id: "",
      p_korrekt: true, p_ist_wiederholung: false, p_basis_xp: 10,
      p_box: 1, p_richtig_in_folge: 1, p_gemeistert: false, p_faellig: today,
    });
    await c.rpc("lern_konzept_abschliessen", { p_konzept: k });
  }
  if (buyTicker) {
    const { data: inst } = await c.from("instruments").select("id").eq("ticker", buyTicker).single();
    if (inst) await c.rpc("place_order", { p_instrument: inst.id, p_side: "buy", p_qty: buyQty });
  }
}

async function main() {
  const c = {};
  for (const u of USERS) c[u.key] = await ensureUser(u);

  // Family: Papa ↔ Mia, Tom (freigegeben) – idempotent neu setzen.
  await admin.from("parent_child_links").delete().eq("parent_profile_id", c.papa.profileId);
  await admin.from("parent_child_links").insert([
    { parent_profile_id: c.papa.profileId, child_profile_id: c.mia.profileId, status: "approved" },
    { parent_profile_id: c.papa.profileId, child_profile_id: c.tom.profileId, status: "approved" },
  ]);

  // Classroom: Klasse 6b (Code TEST6B) mit Mia + Tom – idempotent neu setzen.
  await admin.from("classes").delete().eq("teacher_profile_id", c.lehrer.profileId);
  const { data: cls, error: clsErr } = await admin
    .from("classes")
    .insert({ teacher_profile_id: c.lehrer.profileId, name: "Klasse 6b", class_code: "TEST6B" })
    .select("id")
    .single();
  if (clsErr) throw new Error(`class: ${clsErr.message}`);
  await admin.from("class_members").insert([
    { class_id: cls.id, child_profile_id: c.mia.profileId },
    { class_id: cls.id, child_profile_id: c.tom.profileId },
  ]);
  // Beispiel-Klassen-Challenges (messbares Ziel; Fortschritt client-seitig).
  await admin.from("challenges").insert([
    { scope: "class", class_id: cls.id, created_by: c.lehrer.profileId, goal_metric: "konzepte", goal_target: 3, title: "3 Konzepte meistern" },
    { scope: "class", class_id: cls.id, created_by: c.lehrer.profileId, goal_metric: "xp", goal_target: 10, title: "10 Wissenspunkte sammeln" },
    { scope: "class", class_id: cls.id, created_by: c.lehrer.profileId, goal_metric: "branchen", goal_target: 3, title: "Aus 3 Branchen investieren", starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 28 * 864e5).toISOString() },
    { scope: "class", class_id: cls.id, created_by: c.lehrer.profileId, goal_metric: "wenig_orders", goal_target: 5, title: "Mit höchstens 5 Orders investiert bleiben" },
    { scope: "class", class_id: cls.id, created_by: c.lehrer.profileId, goal_metric: "themenblock", goal_target: 4, goal_ref: "tb_geld_grundlagen", title: "Themenblock „Geld-Grundlagen“ abschließen" },
    { scope: "class", class_id: cls.id, created_by: c.lehrer.profileId, goal_metric: "xp_klasse", goal_target: 50, title: "Gemeinsam 50 Wissenspunkte sammeln" },
    { scope: "class", class_id: cls.id, created_by: c.lehrer.profileId, goal_metric: "begruendungen", goal_target: 3, title: "3 Entscheidungen begründen" },
  ]);

  // Aktivität zurücksetzen + neu erzeugen (reproduzierbar).
  await resetPlayer(c.mia.profileId);
  await resetPlayer(c.tom.profileId);
  await seedActivity("mia@hofino.test", { konzepte: ["konzept_geld", "konzept_sparen"], buyTicker: "AAPL", buyQty: 3 });
  await seedActivity("tom@hofino.test", { konzepte: ["konzept_geld"], buyTicker: "SAP", buyQty: 2 });

  console.log("✓ Test-Nutzer geseedet (Passwort: " + PASSWORD + "):");
  for (const u of USERS) console.log(`  - ${u.email}  [${u.role}]  ${u.name}`);
  console.log("  Klasse: Klasse 6b (Code TEST6B), Mitglieder: Mia, Tom");
  console.log("  Eltern Papa verknüpft mit Mia & Tom (freigegeben)");
}

main().catch((e) => {
  console.error("Seed fehlgeschlagen:", e.message);
  process.exit(1);
});
