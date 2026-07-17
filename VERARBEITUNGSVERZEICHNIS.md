# Verzeichnis von Verarbeitungstätigkeiten (Art. 30 Abs. 1 DSGVO) — Hofino

> Internes Dokument, wird nicht veröffentlicht. Auf Anfrage der Aufsichtsbehörde
> vorzulegen. Stand: 17.07.2026. Bei neuen Features/Diensten aktualisieren.

**Verantwortlicher:** Josef Hofstetter, Moorbadstraße 46a, 83093 Bad Endorf,
E-Mail hofstetter@agendaro.de. Kein Datenschutzbeauftragter bestellt (keine
Benennungspflicht: keine 20 Personen mit ständiger Verarbeitung, keine
umfangreiche Verarbeitung besonderer Kategorien, kein Kerngeschäft Überwachung).

**Technische und organisatorische Maßnahmen (Art. 32), Übersicht:** TLS für alle
Verbindungen; Passwörter nur als Hash (Supabase GoTrue/bcrypt); Row-Level Security
auf allen Tabellen (Rollen Kind/Eltern/Lehrkraft/Erwachsene, Lehrkräfte sehen nur
Aggregate); serverseitige Trigger-Härtung (gesperrte Konten, Rollenzwang);
Rate-Limits (Mail-Versand, Klassengröße); Secrets nur in Supabase Vault/Function-
Secrets, nicht im Repo; Details in `SECURITY.md` und `AUTH.md`.

---

## VT-01 Konto- und Anmeldeverwaltung
- **Zweck:** Registrierung, Login, Passwort-Reset, Sitzungsverwaltung
- **Betroffene:** Kinder/Jugendliche (12–15), Schüler:innen, Eltern, Lehrkräfte, Erwachsene
- **Daten:** E-Mail (Erwachsene/Eltern/Lehrkräfte; bei Kindern nur Eltern-Mail bzw.
  interner Spitznamen-Alias ohne echte Mail), Spitzname/Anzeigename, Passwort-Hash,
  Rolle, Sitzungs-Token
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b; bei Kindern Art. 6 Abs. 1 lit. a i. V. m. Art. 8
- **Empfänger:** Supabase (AVV, EU/Irland)
- **Löschfrist:** mit Kontolöschung (in-App, sofort und endgültig)

## VT-02 Einwilligungsverwaltung Kinderkonten
- **Zweck:** Einholung/Nachweis der elterlichen Einwilligung (Art. 8 DSGVO),
  Erinnerung, Sperre, Löschung
- **Betroffene:** Kinder, Eltern
- **Daten:** Eltern-E-Mail, Einwilligungsstatus + Zeitpunkte, Sperr-/Löschdaten
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. c i. V. m. Art. 8 (Nachweis), lit. f (Missbrauchsschutz)
- **Empfänger:** Supabase (AVV), Brevo (Mail-Versand, AVV, EU)
- **Löschfrist:** unbestätigte Konten automatisch 30 Tage nach Sperre
  (Edge Function `consent-sweep`); Einwilligungsnachweis solange das Konto besteht

## VT-03 Lernfortschritt und virtuelles Übungsdepot
- **Zweck:** Kernfunktion der App (Lernstand, Wissenspunkte, virtuelle Orders,
  Rankings, Auszeichnungen, Familien-/Klassen-Challenges)
- **Betroffene:** alle Nutzerrollen
- **Daten:** Quiz-Antworten, Punkte, virtuelle Transaktionen/Bestände, optionale
  Freitexte (Lern-Erkenntnisse, Entscheidungs-Begründungen)
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b
- **Empfänger:** Supabase (AVV); Lehrkräfte sehen nur Aggregate (RLS), Eltern nur
  verknüpfte Kinder (lesend)
- **Löschfrist:** mit Kontolöschung

## VT-04 System-E-Mail-Versand
- **Zweck:** Bestätigungs-, Einladungs-, Passwort-Reset- und Einwilligungs-Mails
- **Betroffene:** Eltern, Lehrkräfte, Erwachsene
- **Daten:** E-Mail-Adresse, Mail-Inhalt (Link/Token), Versandzeitpunkt
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b bzw. lit. c (Art.-8-Nachweis)
- **Empfänger:** Brevo (AVV, EU-Server)
- **Löschfrist:** Versand-Logs gemäß Brevo-Aufbewahrung (kurzfristig); keine
  Marketing-Nutzung, keine Öffnungs-/Klick-Messung aktivieren

## VT-05 Hosting-/Zugriffsprotokolle
- **Zweck:** Betriebssicherheit, Fehlerdiagnose
- **Betroffene:** alle Besucher der Web-App
- **Daten:** IP-Adresse, Zeitpunkt, abgerufene Ressource (Logs bei GitHub Pages
  und Supabase)
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f
- **Empfänger:** GitHub (EU-US Data Privacy Framework), Supabase (EU)
- **Löschfrist:** gemäß Log-Rotation der Anbieter; kein eigener Zugriff auf
  personenbezogene Rohlogs, keine eigene Auswertung

## VT-06 Feedback (Testphase)
- **Zweck:** Fehlermeldungen/Anregungen der Testfamilien und -klassen
- **Betroffene:** Nutzer, die freiwillig Feedback senden
- **Daten:** Absender-Mail, Freitext, Rolle/Anzeigename (vorbefüllt, editierbar)
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f (Produktverbesserung); Versand erfolgt
  aktiv durch die Nutzer über deren eigenes Mail-Programm
- **Empfänger:** Postfach des Verantwortlichen
- **Löschfrist:** nach Bearbeitung, spätestens 12 Monate

---

**Keine** Verarbeitung besonderer Kategorien (Art. 9), **kein** Profiling, **keine**
automatisierte Einzelentscheidung, **keine** Übermittlung in Drittländer außer der
o. g. DPF-gestützten Hosting-Auslieferung (GitHub), **keine** Werbe-/Analysedienste.
