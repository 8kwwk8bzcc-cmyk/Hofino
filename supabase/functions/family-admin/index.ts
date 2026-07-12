// Edge Function `family-admin` (AUTH.md Paket D): Aktionen, die Admin-Rechte auf
// fremde Auth-Konten brauchen und deshalb nicht im Client laufen können.
//   - create_child:          Eltern legen ein Kinderkonto an (Einwilligung gilt
//                            damit als erteilt) + Family-Link.
//   - reset_child_password:  Eltern setzen das Passwort eines VERKNÜPFTEN Kindes
//                            neu; Lehrkräfte das eines Schülers der EIGENEN Klasse.
// Autorisierung: Das JWT des Aufrufers wird serverseitig geprüft (getUser) und
// die Beziehung (Family-Link bzw. Klassenzugehörigkeit) in der DB verifiziert.
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const KIDS_ALIAS_DOMAIN = "kids.hofino.invalid";
const CONSENT_TEXT_VERSION = "v1-2026-07";

/** Spitzname -> Alias (identisch zur App-Logik in store.tsx). */
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
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // ── Aufrufer aus dem JWT ermitteln ─────────────────────────────────────────
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userRes.user) return json({ error: "unauthorized" }, 401);
  let body: { action?: string; nickname?: string; password?: string; childProfileId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const { data: caller } = await admin
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", userRes.user.id)
    .maybeSingle();
  // Selbstlöschung geht auch ohne Profil (z. B. eingeladene Eltern vor dem Setup).
  if (body.action === "delete_self") {
    const del = await admin.auth.admin.deleteUser(userRes.user.id);
    if (del.error) return json({ error: del.error.message }, 500);
    return json({ ok: true });
  }
  if (!caller) return json({ error: "no_profile" }, 403);

  // ── Aktion: Kind anlegen (nur Eltern/Erwachsene) ───────────────────────────
  if (body.action === "create_child") {
    if (!["parent", "adult"].includes(caller.role)) return json({ error: "forbidden" }, 403);
    const nickname = (body.nickname ?? "").trim();
    const password = body.password ?? "";
    const alias = nickname ? kidsAlias(nickname) : null;
    if (!alias) return json({ error: "bad_nickname" }, 400);
    if (password.length < 6) return json({ error: "weak_password" }, 400);

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
        role: "child",
        display_name: nickname,
        consent_status: "approved",
        consent_source: "parent",
        consent_confirmed_at: new Date().toISOString(),
        consent_text_version: CONSENT_TEXT_VERSION,
      })
      .select("id")
      .single();
    if (ins.error) {
      // Kein halbes Konto zurücklassen
      await admin.auth.admin.deleteUser(authUserId);
      return json({ error: ins.error.message }, 500);
    }
    await admin
      .from("parent_child_links")
      .upsert({ parent_profile_id: caller.id, child_profile_id: ins.data.id, status: "approved" });
    return json({ ok: true, childProfileId: ins.data.id });
  }

  // ── Beziehungs-Check: ist der Aufrufer Erziehungsberechtigte:r (Family-Link)
  //    bzw. die Lehrkraft der Klasse des Kindes? ───────────────────────────────
  async function guardedChild(childProfileId: string) {
    const { data: child } = await admin
      .from("profiles")
      .select("id, auth_user_id, role")
      .eq("id", childProfileId)
      .maybeSingle();
    if (!child || !["child", "student"].includes(child.role)) return null;
    if (["parent", "adult"].includes(caller!.role)) {
      const { data: link } = await admin
        .from("parent_child_links")
        .select("status")
        .eq("parent_profile_id", caller!.id)
        .eq("child_profile_id", child.id)
        .eq("status", "approved")
        .maybeSingle();
      if (link) return child;
    } else if (caller!.role === "teacher") {
      const { data: member } = await admin
        .from("class_members")
        .select("class_id, classes!inner(teacher_profile_id)")
        .eq("child_profile_id", child.id)
        .eq("classes.teacher_profile_id", caller!.id)
        .limit(1);
      if ((member?.length ?? 0) > 0) return child;
    }
    return null;
  }

  // ── Aktion: Kind-/Schüler-Passwort zurücksetzen ────────────────────────────
  if (body.action === "reset_child_password") {
    const password = body.password ?? "";
    if (!body.childProfileId) return json({ error: "bad_request" }, 400);
    if (password.length < 6) return json({ error: "weak_password" }, 400);
    const child = await guardedChild(body.childProfileId);
    if (!child) return json({ error: "forbidden" }, 403);
    const upd = await admin.auth.admin.updateUserById(child.auth_user_id, { password });
    if (upd.error) return json({ error: upd.error.message }, 500);
    return json({ ok: true });
  }

  // ── Aktion: verknüpftes Kind / Schüler:in der eigenen Klasse löschen ───────
  if (body.action === "delete_child") {
    if (!body.childProfileId) return json({ error: "bad_request" }, 400);
    const child = await guardedChild(body.childProfileId);
    if (!child) return json({ error: "forbidden" }, 403);
    const del = await admin.auth.admin.deleteUser(child.auth_user_id);
    if (del.error) return json({ error: del.error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
});
