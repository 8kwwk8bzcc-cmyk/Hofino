# Datenschutzerklärung Hofino

> **Status: finalisiert (2026-07-17), Betreiber-Review durch J. Hofstetter (IHK-DSB) offen.**
> Öffentliche Fassung: `apps/app/public/datenschutz/index.html` → wird mit dem
> Web-Deploy unter `https://8kwwk8bzcc-cmyk.github.io/Hofino/datenschutz/` ausgeliefert
> und ist in der App (Login-Screen + Startseiten) sowie später im App-Store-Eintrag verlinkt.
> Bei inhaltlichen Änderungen IMMER beide Fassungen (diese Datei + HTML) anpassen.
>
> **Offene Häkchen vor Launch (nicht Teil des öffentlichen Texts):**
> - [ ] Supabase-AVV akzeptieren (Dashboard → Organization → Legal Documents → DPA)
> - [ ] Brevo-Konto anlegen + AVV (in Brevo-AGB enthalten, DPA herunterladen), SMTP in Supabase hinterlegen
> - [ ] Telefonnummer für DSA-Händlerstatus festlegen (wird im App Store öffentlich; s. `APPSTORE.md`)

## 1. Verantwortlicher
Josef Hofstetter, Moorbadstraße 46a, 83093 Bad Endorf, Deutschland
E-Mail: hofstetter@agendaro.de

## 2. Was Hofino ist — und was nicht
Hofino ist eine Finanzbildungs-App (ab 12 Jahren) zum Üben mit **ausschließlich
virtuellem Geld**. Es fließt kein echtes Geld, es werden keine echten Wertpapiere
gehandelt. Es gibt **keine Werbung, kein Tracking zu Werbezwecken, keine
Analyse-Dienste Dritter, keine Chat- oder Kommentarfunktionen**.

## 3. Welche Daten wir verarbeiten
**Kinder/Jugendliche und Schüler:innen (12–15):**
- Frei gewählter Spitzname (kein echter Name nötig — wir fordern ausdrücklich dazu
  auf, keinen echten Namen zu verwenden), Passwort (verschlüsselt gespeichert)
- Bei privater Registrierung: die E-Mail-Adresse **eines Elternteils** (nur zur
  Einholung der Einwilligung); Schüler:innen registrieren sich ohne jede E-Mail
  über einen Klassencode
- Lernfortschritt (beantwortete Quizfragen, Wissenspunkte, Auszeichnungen)
- Virtuelles Übungsdepot (Übungskäufe/-verkäufe, virtueller Kontostand)
- Optionale Freitexte: Lern-Erkenntnisse (nur für die eigene Lehrkraft sichtbar),
  Begründungen von Übungsentscheidungen

**Erwachsene / Eltern / Lehrkräfte:** E-Mail-Adresse, Passwort (verschlüsselt),
Anzeigename, bei Eltern die Verknüpfung zum Kind, bei Lehrkräften Klassenname und
-code sowie der Zeitpunkt der Einwilligungsbestätigung für die Klasse.

**Technisch:** Sitzungs-Token im lokalen Speicher des Geräts (kein Werbe-Cookie),
Server-Protokolle des Hosting-Anbieters (IP-Adresse, Zeitpunkt) zur Betriebssicherheit.

## 4. Zwecke und Rechtsgrundlagen
- Bereitstellung der App, Konto- und Lernfunktionen: Vertragserfüllung
  (Art. 6 Abs. 1 lit. b DSGVO)
- Kinderkonten: **Einwilligung der Erziehungsberechtigten** (Art. 6 Abs. 1 lit. a
  i. V. m. Art. 8 DSGVO). Ablauf: Das Kind kann sofort starten; die Eltern erhalten
  eine E-Mail und bestätigen binnen **7 Tagen**. Ohne Bestätigung wird das Konto
  pausiert und **30 Tage später automatisch samt aller Daten gelöscht.**
- Schulklassen: Einwilligung der Erziehungsberechtigten, eingeholt über die
  Lehrkraft (schriftliche Vorlage in der App).
- Sicherheit und Missbrauchsvermeidung (z. B. serverseitige Zugriffsregeln,
  Mengenbegrenzungen): berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).

## 5. Empfänger und Auftragsverarbeiter
- **Supabase Inc.** (Datenbank und Anmeldung) — Serverstandort **EU (Irland)**,
  Verarbeitung auf Grundlage eines Auftragsverarbeitungsvertrags (Art. 28 DSGVO).
- **Brevo** (Sendinblue GmbH, Köpenicker Straße 126, 10179 Berlin) — Versand der
  System-E-Mails (z. B. Bestätigungs- und Einwilligungs-Mails), Serverstandort EU,
  Auftragsverarbeitungsvertrag (Art. 28 DSGVO).
- **GitHub Inc.** (GitHub Pages: Auslieferung der Web-App; statische Dateien, dort
  werden keine Kontodaten gespeichert). Beim Abruf fallen Zugriffs-Logs (IP-Adresse)
  bei GitHub an; GitHub ist unter dem **EU-US Data Privacy Framework** zertifiziert
  (Art. 45 DSGVO).
- Keine Weitergabe an Dritte zu Werbe- oder Analysezwecken. Kein Verkauf von Daten.

## 6. Speicherdauer
- Kontodaten: bis zur Löschung des Kontos. **Jedes Konto kann jederzeit in der App
  selbst gelöscht werden** (Eltern können verknüpfte Kinderkonten löschen); die
  Löschung entfernt alle zugehörigen Daten unmittelbar und endgültig.
- Nicht bestätigte Kinderkonten: automatische Löschung 30 Tage nach der Pausierung
  (siehe oben).
- Die Einwilligung kann jederzeit widerrufen werden (in der App, per E-Mail oder
  gegenüber der Lehrkraft); der Widerruf führt zur Löschung des Kinderkontos.

## 7. Ihre Rechte
Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch
sowie Widerruf erteilter Einwilligungen — Kontakt: siehe Ziffer 1. Außerdem besteht
ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde; zuständig ist das
**Bayerische Landesamt für Datenschutzaufsicht (BayLDA)**, Promenade 18,
91522 Ansbach, www.lda.bayern.de.

## 8. Änderungen
Diese Erklärung wird bei Funktionsänderungen aktualisiert; die jeweils aktuelle
Fassung ist in der App bzw. unter
https://8kwwk8bzcc-cmyk.github.io/Hofino/datenschutz/ abrufbar.
Stand: 17. Juli 2026.
