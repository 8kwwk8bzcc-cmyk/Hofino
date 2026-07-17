# APPSTORE.md — Vorlagen für die App-Store-Einreichung (Datenschutz-Teil)

> Copy-Paste-Vorlage für App Store Connect, vorbereitet 2026-07-17.
> Voraussetzung: Apple Developer Program (99 €/Jahr), Build via EAS.
> Google Play (später): braucht dieselben Angaben im „Data safety"-Formular.

## 1. Privacy Policy URL (Pflichtfeld)
`https://8kwwk8bzcc-cmyk.github.io/Hofino/datenschutz/`
(wird automatisch mit jedem Web-Deploy aktualisiert; Quelle `DATENSCHUTZ.md`)

## 2. App-Privacy-Labels („Nutrition Labels")
Grundsatz: **Data Used to Track You: NEIN** (kein Tracking, keine Werbe-IDs,
keine Analytics). Alle erhobenen Daten sind **mit dem Konto verknüpft (Linked to
You)**, Zweck ausschließlich **App Functionality**.

| Apple-Kategorie | Was konkret | Linked | Tracking |
|---|---|---|---|
| Contact Info → Email Address | E-Mail von Erwachsenen/Eltern/Lehrkräften; bei Kindern nur die Eltern-Mail | ja | nein |
| Contact Info → Name | frei gewählter Spitzname/Anzeigename (Pseudonym, kein Klarname gefordert) | ja | nein |
| User Content → Other User Content | Quiz-Antworten, virtuelle Orders, optionale Freitexte (Lern-Erkenntnisse, Begründungen) | ja | nein |
| Identifiers → User ID | interne Konto-ID (Supabase) | ja | nein |

**Nicht erhoben** (überall „No" ankreuzen): Standort, Kontakte, Fotos, Gesundheits-,
Finanz- (es gibt nur virtuelles Geld!), Browsing-/Search-History, Geräte-IDs zu
Werbezwecken, Diagnostics/Analytics (kein Crash-Reporting eingebaut), Purchases
(im MVP keine Käufe).

## 3. Altersfreigabe-Fragebogen
Alle Inhaltsfragen (Gewalt, Sex, Drogen, Horror …) → **Keine**.
- **Simuliertes Glücksspiel: NEIN.** Das Übungsdepot ist eine Bildungssimulation
  ohne echtes Geld, ohne Zufalls-Belohnungsmechanik.
- Uneingeschränkter Webzugriff: NEIN. Nutzergenerierte Inhalte öffentlich: NEIN
  (Freitexte sieht nur die eigene Lehrkraft).
- Ergebnis: niedrigste Stufe (4+/9+) → auch 12-Jährige können laden.
- **NICHT in die „Kids"-Kategorie einordnen** (die gilt für unter 12 und zieht
  Sonderregeln nach 5.1.4; Hofino richtet sich an 12–15).
- Kauf-Angaben: keine In-App-Käufe im MVP (Premium-Kacheln sind gesperrt, nicht
  buchbar). Sobald Premium buchbar wird: Labels + Altersangaben aktualisieren.

## 4. DSA-Händlerstatus (EU, Pflicht seit 2025)
Status: **Trader (gewerblich)** — Entscheidung 2026-07-17.
Öffentlich im Store-Eintrag erscheinen dann: Name, Anschrift (Moorbadstraße 46a,
83093 Bad Endorf), E-Mail und **Telefonnummer**.
- [ ] **OFFEN: Telefonnummer festlegen** (wird öffentlich — ggf. separate
  VoIP-/Zweitnummer). Ohne verifizierte Trader-Angaben lässt Apple keine
  EU-Einreichung zu.

## 5. Sonstige Review-Punkte (Guideline-Check)
- **5.1.1(v) Account deletion in-app: erfüllt** (`DeleteAccountSection`, Eltern
  können Kinderkonten löschen).
- **4.8 Sign in with Apple: nicht nötig** (nur eigener E-Mail/Spitznamen-Login,
  kein Drittanbieter-Login).
- **5.1.4 Kids/Minderjährige:** elterliche Einwilligung implementiert (Art. 8
  DSGVO, s. `AUTH.md`); keine Werbung, keine Dritt-Analytics, kein Chat.
- **3.1.1:** keine externen Kauf-/Brokerlinks im Kinder-/Klassenmodus (CLAUDE.md §2,
  durch Content-Guard-Tests abgesichert).
- Impressum/Support-URL: `https://8kwwk8bzcc-cmyk.github.io/Hofino/impressum/`
- **Finanz-Hinweis für die Review-Notes:** „Educational simulation only. No real
  money, no real trades, no brokerage links, no investment advice. Virtual
  starting capital of €5,000."
