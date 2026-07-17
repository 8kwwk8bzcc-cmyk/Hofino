# AUTH.md – Anmelde- und Kinderkonten-Konzept

> Produktentscheidungen vom 2026-07-11 (verbindlich). Ersetzt den temporären
> Entwickler-Login (Persona-Auswahl) vor dem Launch. Rechtlicher Rahmen:
> DSGVO Art. 8 (Einwilligung der Eltern für unter 16-Jährige in DE).
> Dies ersetzt keine Rechtsberatung.

## 1. Entscheidungen im Überblick

| Frage | Entscheidung |
|---|---|
| Kinderkonto-Entstehung | **Kind startet selbst, Probefrist** – sofort voll nutzbar, Eltern-Bestätigung binnen **7 Tagen**, sonst Sperre; **30 Tage** nach Sperre automatische Löschung |
| Kind-Login | **Spitzname + Passwort** (global eindeutig, keine E-Mail, keine Klarnamen) |
| Schülerkonten (Classroom) | **Schule verantwortet die Einwilligung** – Lehrkraft bestätigt per Checkbox, PDF-Vorlage zum Austeilen; Beitritt weiter nur per Klassencode |
| App Store | **Eine App, Altersfreigabe 12+**, NICHT in Apples Kids-Kategorie (Mixed Audience) |
| Zielgruppe | Offiziell **12–15** (CLAUDE.md/BACKLOG angepasst); Lerninhalte richten sich nach 12+ |

## 2. Flows je Rolle

### Kind (privat)
1. **Registrierung:** Spitzname (global eindeutig, Prüfung „bitte kein echter Name/keine E-Mail") + Passwort + **E-Mail eines Elternteils**. Technisch: Supabase-Auth verlangt eine E-Mail → intern wird ein Alias `spitzname@kids.hofino.invalid` angelegt (empfängt nie Mails); Eindeutigkeit des Spitznamens = Eindeutigkeit des Alias.
2. **Sofort voll nutzbar.** `profiles.consent_status='pending'`, `consent_deadline = now() + 7 Tage`.
3. **Eltern-Mail** geht sofort raus: Link öffnet die Web-App → Eltern registrieren sich (oder melden sich an) → sehen Kind-Spitznamen → **bestätigen die Einwilligung** (Zeitstempel + Textversion wird gespeichert). Dabei entsteht automatisch die Family-Verknüpfung (bestehender approved-Mechanismus).
4. **Tag 5:** Erinnerungs-Mail an die Eltern. **Tag 7 ohne Bestätigung:** `consent_status='blocked'` – Login zeigt Sperrbildschirm („Bitte deine Eltern…", Button „Mail erneut senden"). **Tag 37:** Konto + Daten werden automatisch gelöscht (Cron).

### Kind (von Eltern angelegt)
Eltern-Konto → „Kind hinzufügen" → Spitzname + Start-Passwort. Einwilligung gilt mit Anlage als erteilt (`consent_status='approved'`), Family-Verknüpfung entsteht direkt. Kind meldet sich mit Spitzname + Passwort an.

### Schüler (Classroom)
Wie bisher Beitritt per **Klassencode**; Konto = Spitzname + Passwort ohne E-Mail, `consent_source='school'`, kein Probefrist-Mechanismus. Die Lehrkraft bestätigt beim Anlegen der Klasse per **Checkbox**, dass die Eltern-Einwilligungen vorliegen; die App liefert eine **PDF-Vorlage** (Einwilligungserklärung zum Austeilen). Lehrkraft kann Schüler-Passwörter zurücksetzen.

### Erwachsene / Eltern / Lehrer
Klassisch **E-Mail + Passwort mit E-Mail-Bestätigung** (Registrierung ist bereits gehärtet, keine verwaisten Auth-Konten). Passwort-Reset per E-Mail.

## 3. Passwort vergessen (Kind)
Kein E-Mail-Reset möglich (keine echte E-Mail). Stattdessen: **Eltern setzen ein neues Start-Passwort** aus ihrem Konto (Family-Verknüpfung); Schüler: Lehrkraft. Kind ohne bestätigte Eltern und ohne Klasse: Konto neu anlegen (Probefrist-Konten sind jung, Verlust gering).

## 4. Konto löschen (alle Rollen)
In-App-Selbstlöschung ist Pflicht (DSGVO + **App-Store-Vorgabe von Apple**). Eltern können verknüpfte Kinderkonten löschen. Löschung = Auth-User + alle Zeilen via `on delete cascade` (prüfen, wo das fehlt).

## 5. App Store (12+)
- **Eine App** für alle vier Modi, Freigabe **12+** (Apple) / USK-äquivalent bei Google.
- **Nicht** Apples „Made for Kids"-Kategorie (dort passen Adult-/Lehrer-Modus und externe Auth-Mails nicht hinein); Kinderschutz gilt trotzdem uneingeschränkt in-App (kein Tracking, keine Werbung, kein Chat – siehe CLAUDE.md §2/§3).
- **Lerninhalte & Tonalität konsequent auf 12+** ausrichten (keine Verniedlichung für Jüngere).
- Vor Einreichung nötig: Datenschutzerklärung (URL), App-Privacy-Angaben, Konto-Löschung in-App (§4), Support-Kontakt.

## 6. Datenmodell-Skizze
`profiles` erweitert um: `consent_status` (`approved` | `pending` | `blocked`; Default `approved` für Erwachsenen-Rollen), `consent_deadline timestamptz`, `consent_source` (`parent` | `school` | `self_adult`), `consent_confirmed_at`, `consent_text_version`. Neuer Cron `hofino-consent-sweep` (täglich): `pending`-Fristablauf → `blocked`; `blocked` > 30 Tage → löschen. RLS bleibt unverändert; die Sperre erzwingt zusätzlich eine Server-Prüfung in den Schreib-RPCs (nicht nur UI).

## 7. Umsetzungspakete — Stand 2026-07-12: A–F UMGESETZT & verifiziert
1. **A – erledigt.** Echte Registrierung/Anmeldung + Passwort-Reset per Mail (`NewPassword`-Screen), Dev-Login hinter `EXPO_PUBLIC_DEV_LOGIN` mit Umschalter zur echten Anmeldung.
2. **B – erledigt.** Kind-Selbstregistrierung: Spitzname-Alias (`@kids.hofino.invalid`), Insert-Trigger erzwingt pending + 7-Tage-Frist, Login per Spitzname, UPDATE auf profiles für Clients gesperrt.
3. **C – erledigt.** Edge Function `consent-sweep` (Cron :10): Eltern-Mails via GoTrue (Invite/Magic-Link), Erinnerung, Sperre, Löschung nach 30 Tagen. RPCs für Eltern-Bestätigung + Family-Auto-Link; Sperrbildschirm + Pending-Banner; blocked serverseitig via Insert-Trigger.
4. **D – erledigt.** Edge Function `family-admin`: `create_child` (Einwilligung gilt als erteilt) + `reset_child_password` (Eltern: verknüpfte Kinder; Lehrkraft: eigene Klasse).
5. **E – erledigt.** `create_class` verlangt Einwilligungs-Checkbox (Zeitstempel als Nachweis), druckbare Vorlage (`ConsentTemplate`), Schüler-Registrierung per Klassencode ohne E-Mail (`register-student`), Rolle Schüler:in im Onboarding, Client-Inserts von Schüler-Profilen abgelehnt.
6. **F – erledigt.** `delete_self` (alle Rollen) + `delete_child` (Eltern/Lehrkraft) in `family-admin`; zweistufige Lösch-UI auf allen Haupt-Screens + je Kind im Familien-Dashboard; Cascade-Kette verifiziert.
7. **G – erledigt.** Security-Review durchgeführt und Funde behoben (§8). Offen extern: Datenschutzerklärungs-URL, App-Privacy-Angaben, Support-Kontakt (erst zur Store-Einreichung nötig; native App via EAS kommt später).

## 8. Security-Review (2026-07-12) — behoben & Restrisiken
Unabhängiger Review über die gesamte Strecke; behoben:
- **Selbst-Einwilligung:** `einwilligung_bestaetigen`/`offene_einwilligungen` verlangen jetzt eine **verifizierte** E-Mail (`auth.users.email_confirmed_at`). Greift automatisch scharf, sobald die E-Mail-Bestätigung aktiviert wird (§9) — vorher könnte ein Kind mit einem unbestätigten Zweitkonto die eigene Einwilligung erteilen.
- **Klassencode-Enumeration/Spam:** `register-student` antwortet generisch (kein 404/403-Unterschied) und deckelt Klassen auf 40 Mitglieder.
- **Mail-Bombing:** `consent-sweep` validiert die Eltern-Adresse und drosselt auf max. 1 Mail/24 h je Zieladresse (über alle Kind-Konten hinweg); `einwilligung_mail_anfordern` bleibt auf 1×/h limitiert.
- **Löschfrist:** neue Spalte `consent_blocked_at`; die 30 Tage messen ab tatsächlicher Sperre.
- `display_name` serverseitig auf 1–40 Zeichen begrenzt.

**Bewusste Restrisiken (dokumentiert, nicht technisch lösbar):**
- **Alters-Selbstauskunft:** Ein Kind kann sich als „Erwachsene" registrieren und so den Einwilligungsflow umgehen — wie bei praktisch allen Apps ohne Ausweisprüfung (Age Assurance wäre unverhältnismäßig für ein MVP ohne echtes Geld, ohne Chat, ohne Werbung). Die Inhalte sind für alle Rollen kindgeeignet (Guard-Tests).
- E-Mail-Besitz = Einwilligungsnachweis (Double-Opt-In-Standard, DSGVO Art. 8 „angemessene Anstrengungen").

## 9. Launch-Schalter (Cloud, nicht vergessen)
- **Dev-Login ist aus dem öffentlichen Deploy entfernt (2026-07-12).** Die Persona-Auswahl erscheint nur noch nach Anmeldung mit dem Betreiber-Konto (`hofstetter@agendaro.de`, Admin-Gate in `App.tsx`; „Als dieses Konto weiter" umgeht das Gate bei Bedarf). Lokal weiterhin über `EXPO_PUBLIC_DEV_LOGIN=1` (Cockpit/LAN-Test).
- `mailer_autoconfirm` ist in der Cloud derzeit **an** (nötig für das Persona-Bootstrapping und die sofortige Kind-Registrierung). Vor dem Launch **ausschalten** (E-Mail-Bestätigung Pflicht); dann Kind-Registrierung auf eine Edge Function umstellen (Alias-Konten können keine Mail bestätigen) und beachten, dass die Personas dann nicht mehr selbst-bootstrappen.
- Auth-URLs sind gesetzt: `site_url` + Allowlist zeigen auf `https://8kwwk8bzcc-cmyk.github.io/Hofino/` (2026-07-11).
- **SMTP (vor Tests mit mehreren Familien):** Der Supabase-Standard-Mailer ist auf ~2 Mails/Stunde begrenzt und erlaubt KEINE eigenen Templates. **Entschieden (2026-07-17): Brevo (EU)** — Konto anlegen, SMTP-Zugang hinterlegen (Dashboard → Authentication → Emails → SMTP), danach die vorbereiteten deutschen Templates setzen: `SUPABASE_ACCESS_TOKEN=… node supabase/templates/set-cloud-templates.mjs`. Lokal sind die deutschen Templates bereits aktiv (config.toml → `supabase/templates/*.html`).
- **Datenschutz/Recht (2026-07-17):** Datenschutzerklärung + Impressum liegen als statische Seiten unter `apps/app/public/{datenschutz,impressum}/` (Pages-URLs `…/Hofino/datenschutz/` bzw. `…/Hofino/impressum/`), verlinkt im Auth-Screen und auf den Startseiten (`LegalLinks.tsx`). Quelle: `DATENSCHUTZ.md` (beide Fassungen synchron halten!), Art.-30-Verzeichnis: `VERARBEITUNGSVERZEICHNIS.md`, Apple-Vorlagen: `APPSTORE.md`. Offen: Supabase-AVV klicken, Brevo-AVV, Telefonnummer für DSA-Händlerstatus.
