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

## 7. Umsetzungspakete (Reihenfolge)
1. **A – Erwachsenen-/Eltern-/Lehrer-Registrierung** wieder aktivieren (E-Mail-Flow existiert), Dev-Login hinter Build-Flag (`EXPO_PUBLIC_DEV_LOGIN`), im Pages-Deploy vorerst AN.
2. **B – Kind-Selbstregistrierung**: Spitzname-Alias, Probefrist-Felder, sofortige Nutzbarkeit.
3. **C – Eltern-Bestätigungsflow**: Mail, Bestätigungsseite, Family-Auto-Link, Erinnerung/Sperre/Löschung (Cron).
4. **D – Eltern legt Kind an** + Passwort-Reset durch Eltern/Lehrkraft.
5. **E – Schul-Checkbox + PDF-Vorlage** beim Klassen-Anlegen.
6. **F – Konto-Löschung in-App** (alle Rollen).
7. **G – Doku/Store-Vorbereitung**: 12+-Texte, Datenschutzerklärung (extern), `/security-review` über die gesamte Auth-Strecke.
