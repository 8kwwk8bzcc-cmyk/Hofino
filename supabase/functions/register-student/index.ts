// Edge Function `register-student` (AUTH.md Paket E): Schüler-Registrierung
// über den Schulweg — Spitzname + Passwort + Klassencode, KEINE E-Mail.
// Die Einwilligung verantwortet die Schule: die Klasse muss von der Lehrkraft
// mit bestätigten Eltern-Einwilligungen angelegt worden sein
// (classes.consent_confirmed_at). Läuft mit service_role, weil Client-Inserts
// von Schüler-Profilen serverseitig abgelehnt werden (Trigger).
// Anonym aufrufbar (Registrierung) — verify_jwt=false, eigene Validierung.
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const KIDS_ALIAS_DOMAIN = "kids.hofino.invalid";
const CONSENT_TEXT_VERSION = "v1-2026-07";

function kidsAlias(nickname: string): string | null {
  const slug = nickname
    .trim()
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length >= 2 ? `${slug}@${KIDS_ALIAS_DOMAIN}` : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body: { nickname?: string; password?: string; classCode?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const nickname = (body.nickname ?? "").trim();
  const password = body.password ?? "";
  const classCode = (body.classCode ?? "").trim().toUpperCase();
  const alias = nickname ? kidsAlias(nickname) : null;
  if (!alias) return json({ error: "bad_nickname" }, 400);
  if (password.length < 6) return json({ error: "weak_password" }, 400);
  if (classCode.length < 6) return json({ error: "bad_class_code" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Klasse prüfen: existiert + Lehrkraft hat die Einwilligungen bestätigt.
  const { data: klass } = await admin
    .from("classes")
    .select("id, consent_confirmed_at")
    .eq("class_code", classCode)
    .maybeSingle();
  if (!klass) return json({ error: "class_not_found" }, 404);
  if (!klass.consent_confirmed_at) return json({ error: "class_without_consent" }, 403);

  const created = await admin.auth.admin.createUser({ email: alias, password, email_confirm: true });
  if (created.error) {
    const taken = /already|exists/i.test(created.error.message);
    return json({ error: taken ? "nickname_taken" : created.error.message }, taken ? 409 : 500);
  }
  const authUserId = created.data.user.id;

  const ins = await admin
    .from("profiles")
    .insert({
      auth_user_id: authUserId,
      role: "student",
      display_name: nickname,
      consent_status: "approved",
      consent_source: "school",
      consent_confirmed_at: new Date().toISOString(),
      consent_text_version: CONSENT_TEXT_VERSION,
    })
    .select("id")
    .single();
  if (ins.error) {
    await admin.auth.admin.deleteUser(authUserId);
    return json({ error: ins.error.message }, 500);
  }

  const member = await admin.from("class_members").insert({ class_id: klass.id, child_profile_id: ins.data.id });
  if (member.error) {
    await admin.auth.admin.deleteUser(authUserId);
    return json({ error: member.error.message }, 500);
  }

  return json({ ok: true });
});
