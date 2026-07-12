// Setzt die deutschen Mail-Templates in der Supabase-Cloud.
// VORAUSSETZUNG: eigener SMTP-Provider im Projekt konfiguriert (Dashboard →
// Authentication → Emails → SMTP) — mit dem Standard-Mailer lehnt die API ab.
// Aufruf:  SUPABASE_ACCESS_TOKEN=sbp_… node supabase/templates/set-cloud-templates.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ref = "iprjhnfrpefsmngvskeh";
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN fehlt.");
  process.exit(1);
}

const load = (f) => readFileSync(join(here, f), "utf8");
const payload = {
  mailer_subjects_invite: "Einwilligung für dein Kind bei Hofino",
  mailer_templates_invite_content: load("invite.html"),
  mailer_subjects_magic_link: "Dein Anmelde-Link für Hofino",
  mailer_templates_magic_link_content: load("magic_link.html"),
  mailer_subjects_recovery: "Hofino: Passwort zurücksetzen",
  mailer_templates_recovery_content: load("recovery.html"),
  mailer_subjects_confirmation: "Willkommen bei Hofino – bitte E-Mail bestätigen",
  mailer_templates_confirmation_content: load("confirmation.html"),
};

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
console.log(res.status, res.ok ? "Templates gesetzt." : await res.text());
