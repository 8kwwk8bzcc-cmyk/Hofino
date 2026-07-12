// Edge Function `consent-sweep` (Cron, stündlich): Eltern-Einwilligungen für
// Kinderkonten (AUTH.md Paket C). Drei Aufgaben:
//   1. Eltern-Mails senden: Erst-Mail nach der Kind-Registrierung, Erinnerung
//      2 Tage vor Fristablauf. Versand über GoTrue (Invite für neue Eltern,
//      Magic-Link für bestehende Konten) — kein externer Mail-Dienst nötig.
//   2. Frist abgelaufen → consent_status='blocked' (Sperrbildschirm in der App,
//      Schreib-Trigger lehnen serverseitig ab).
//   3. 30 Tage nach der Sperre → Konto + Daten löschen (DSGVO; Cascade über
//      auth.users → profiles → alle Nutzerdaten).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireCronSecret } from "../_shared/cron-auth.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const DAY_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  const authError = requireCronSecret(req);
  if (authError) return authError;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // Ziel-URL der Mails: die öffentliche App (muss in der Auth-Allowlist stehen).
  const appUrl = Deno.env.get("APP_URL") ?? "";
  const now = new Date();
  const stats = { mailed: 0, reminded: 0, blocked: 0, deleted: 0, errors: [] as string[] };

  // ── 1) Mails (Erst-Mail + Erinnerung ≤2 Tage vor Frist) ──────────────────
  const { data: pending, error } = await sb
    .from("profiles")
    .select("id, display_name, consent_parent_email, consent_deadline, consent_mail_sent_at, consent_reminded_at")
    .eq("role", "child")
    .eq("consent_status", "pending");
  if (error) return json({ ok: false, error: error.message }, 500);

  // Mail-Drossel je Zieladresse (Review-Fund "Mail-Bombing"): pro Sweep-Lauf
  // höchstens EINE Mail je Adresse, und keine, wenn dieselbe Adresse in den
  // letzten 24 h schon eine bekommen hat (egal über welches Kind-Konto).
  const lastMailByAddress = new Map<string, number>();
  for (const p of pending ?? []) {
    const addr = (p.consent_parent_email ?? "").trim().toLowerCase();
    if (!addr) continue;
    const ts = Math.max(
      p.consent_mail_sent_at ? new Date(p.consent_mail_sent_at).getTime() : 0,
      p.consent_reminded_at ? new Date(p.consent_reminded_at).getTime() : 0,
    );
    lastMailByAddress.set(addr, Math.max(lastMailByAddress.get(addr) ?? 0, ts));
  }
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  for (const p of pending ?? []) {
    const email = (p.consent_parent_email ?? "").trim();
    const addr = email.toLowerCase();
    if (!email || !EMAIL_RE.test(email)) continue;
    const needFirst = !p.consent_mail_sent_at;
    const deadlineSoon =
      p.consent_deadline !== null && new Date(p.consent_deadline).getTime() - now.getTime() <= 2 * DAY_MS;
    const needReminder = !needFirst && !p.consent_reminded_at && deadlineSoon;
    if (!needFirst && !needReminder) continue;
    if (now.getTime() - (lastMailByAddress.get(addr) ?? 0) < DAY_MS) continue;
    lastMailByAddress.set(addr, now.getTime());

    const sent = await sendParentMail(sb, email, appUrl);
    if (!sent.ok) {
      stats.errors.push(`${p.id}: ${sent.message}`);
      continue;
    }
    const patch = needFirst
      ? { consent_mail_sent_at: now.toISOString() }
      : { consent_reminded_at: now.toISOString() };
    await sb.from("profiles").update(patch).eq("id", p.id);
    if (needFirst) stats.mailed++;
    else stats.reminded++;
  }

  // ── 2) Frist abgelaufen → sperren ─────────────────────────────────────────
  const { data: blockedRows } = await sb
    .from("profiles")
    .update({ consent_status: "blocked", consent_blocked_at: now.toISOString() })
    .eq("role", "child")
    .eq("consent_status", "pending")
    .lt("consent_deadline", now.toISOString())
    .select("id");
  stats.blocked = blockedRows?.length ?? 0;

  // ── 3) 30 Tage nach Sperre → löschen (Cascade wischt alle Daten) ──────────
  const deleteBefore = new Date(now.getTime() - 30 * DAY_MS).toISOString();
  const { data: expired } = await sb
    .from("profiles")
    .select("id, auth_user_id")
    .eq("role", "child")
    .eq("consent_status", "blocked")
    .lt("consent_blocked_at", deleteBefore);
  for (const p of expired ?? []) {
    const del = await sb.auth.admin.deleteUser(p.auth_user_id);
    if (del.error) stats.errors.push(`delete ${p.id}: ${del.error.message}`);
    else stats.deleted++;
  }

  return json({ ok: true, ...stats });
});

/** Schickt der/dem Erziehungsberechtigten eine Anmelde-Mail: Invite (neues Konto)
 *  oder Magic-Link (Konto existiert). Beide landen eingeloggt in der App, wo die
 *  offene Einwilligung angezeigt wird. */
async function sendParentMail(
  sb: ReturnType<typeof createClient>,
  email: string,
  appUrl: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const redirectTo = appUrl || undefined;
  const invited = await sb.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (!invited.error) return { ok: true };
  // Bereits registriert → Magic-Link statt Invite.
  const otp = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
  if (!otp.error) return { ok: true };
  return { ok: false, message: `invite: ${invited.error.message}; otp: ${otp.error.message}` };
}
