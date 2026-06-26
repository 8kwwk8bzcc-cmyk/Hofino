# Handoff: Hofino — Neues Corporate Design „Grünanlage"

> **Status: VERBINDLICH.** Dies ist das neue, freigegebene Corporate Design von
> Hofino. Es ist **umzusetzen** und für **alle zukünftigen** Screens, Features
> und Plattformen (App + Web/Beamer) verbindlich. Bestehende Oberflächen werden
> schrittweise hierauf migriert. Bei neuen UI-Entscheidungen gelten die Tokens
> und Komponenten-Regeln aus diesem Paket als Quelle der Wahrheit.

---

## 1. Overview

Hofino ist eine Finanzbildungs- und Investment-Trainings-App („Geld verstehen.
Investieren üben.") mit **virtuellem** Geld — keine echten Wertpapiere, kein
echtes Geld. Vier Modi in einer Codebasis, gesteuert über die Rolle:

- **Kids (10–15)** — Hauptmodus, **Haus-System**, wärmer/motivierend.
- **Adult** — eigenes Depot + Lernen, **ruhiger/reduzierter**, kein Haus.
- **Family (Eltern)** — lesender Begleitblick, kein eigenes Depot.
- **Classroom (Lehrer)** — Klassencode, nur Aggregate, **Beamer-Großbild**.

Die Richtung **„Grünanlage"** veredelt die bestehende Marke (Navy/Grün/Gold):
ruhig, vertrauensvoll, freundlich, motivierend — **keine** Trading-/Zocker-Optik,
**keine** Bank-Steifheit, **kein** kindisches Clipart.

## 2. Über die Design-Dateien (bitte zuerst lesen)

Die HTML-Dateien in diesem Paket sind **Design-Referenzen** — interaktive
Prototypen, die *Aussehen und Verhalten* spezifizieren. Sie sind **nicht** dafür
gedacht, 1:1 als Produktivcode übernommen zu werden.

**Aufgabe:** Die gezeigten Designs in der **bestehenden Ziel-Umgebung
nachbauen** — laut Brief **React Native + react-native-web** (eine Codebasis) —
mit deren etablierten Patterns/Libraries. Falls noch keine Umgebung existiert,
das für RN passende Setup wählen. Styling **flach und performant** halten (kein
aufwändiges Backdrop-Blur, keine CSS-Grid-Tricks); Verläufe, Schatten, runde
Ecken und einfache SVG-/Vektor-Illustrationen sind ok.

**Token-Quelle:** `theme.ts` (RN, Light + Dark) und `tokens.css` (Web) enthalten
alle Werte maschinenlesbar. Diese in `theme.ts` der Codebasis übernehmen statt
Hex-Werte fest zu verdrahten.

## 3. Fidelity

**High-Fidelity (hifi).** Finale Farben, Typografie, Spacing, Radien, Schatten
und Zustände sind festgelegt und sollen **pixelnah** nachgebaut werden — mit den
Komponenten/Patterns der Codebasis. Die Illustrationen (Haus, Grundstücke) sind
als flache geometrische Vektorflächen spezifiziert; sie dürfen von einem
Illustrator nach gleichem Stilprinzip verfeinert werden (siehe §9).

## 4. Design-Dateien in diesem Paket

| Datei | Inhalt |
|---|---|
| `Hofino Design-System.dc.html` | **Hauptreferenz.** Foundations → Komponenten → alle 9 Screens + Beamer → Haus-System → Dark Mode. Im Browser öffnen (liegt `support.js` daneben). |
| `Hofino Richtungen.dc.html` | Kontext: die 3 ursprünglichen Richtungen; gewählt wurde „Grünanlage" (Richtung A). |
| `theme.ts` | Verbindliche Tokens für React Native (Light + Dark, Typo, Spacing, Radius, Shadow, Modus-Tonalität). |
| `tokens.css` | Gleiche Tokens als CSS-Variablen (Light + `[data-theme=dark]`). |
| `DESIGN_BRIEF.md` | Ursprünglicher Auftrag mit Leitplanken, Modi und „eisernen Fakten". |

> Öffnen: Beide `.dc.html` benötigen die danebenliegende `support.js`. Lokal per
> einfachem Static-Server öffnen (z. B. `npx serve .`), dann im Browser navigieren
> (ziehen = verschieben, scrollen/pinch = zoomen).

## 5. Design-Tokens (Quelle: theme.ts / tokens.css)

**Farben — Light**
`navy #0E2A47` · `navySoft #1C3D5C` · `green #1F9D6B` · `gold #E7BD57` ·
`bg #F2F6FA` · `surface #FFFFFF` · `softBlue #E8F0FA` · `mint #E4F4EC` ·
`goldSoft #FBF1D6` · `text #0E2A47` · `muted #5C7184` · `faint #9AA7B4` ·
`border #DCE6EE` · `danger #D96B6B` · `success-text #1F8A5B`

**Farben — Dark** (gleiche Token-Namen): `bg #0A1A2C` · `surface #12263C` ·
`surface-2 #173049` · `green #34B97E` (heller für AA) · `gold #E7BD57` ·
`text #EAF1F8` · `muted #8FA6BC` · `faint #6B829A` · `border #244763`.

**Typografie** — Display/Zahlen: **Space Grotesk**; Text/UI: **Hanken Grotesk**
(beide Google Fonts). Skala: H1 30/700 · H2 24/700 · H3 19/700 · BodyL 16/400 ·
Body 14.5/400 · Caption 12.5/500 · Overline 11/600 uppercase, letterSpacing 0.9.

**Spacing (4er):** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40.
**Radien:** sm 10 · button 14 · input 16 · card 22 · pill 999.
**Schatten:** sm `0 1px 3px rgba(20,40,60,.08)` · md `0 8px 24px rgba(20,40,60,.08)`
· lg `0 20px 48px rgba(20,40,60,.12)`.

## 6. Komponenten (Spec)

Alle Maße/Farben siehe Gruppe „02 · Components" in `Hofino Design-System.dc.html`.

- **Button** — Höhe ~48 (padding 14), radius 14, Label 15/700.
  - *Primär:* bg `navy`, Text weiß. *Akzent:* bg `green`, Text weiß (Lern-/Start-CTAs).
  - *Sekundär:* bg `surface`, border 1.5 `border`, Text `navy`.
  - *Ghost:* transparent, Text `green`, „ ›"-Affordance.
  - *Inaktiv:* bg `#C7D2DC`, Text weiß.
- **Pills/Badges** — radius pill, padding ~7×14, 13/600. Status:
  Gemeistert (mint/`#1F8A5B`), Box n (softBlue/`navySoft`), Vom Lehrer
  (goldSoft/`#9A7A1E`), Gesperrt (`#EDF1F5`/`muted`), virtuell (outline).
  XP-Badge: bg `gold`, Text `navy`. Trend ↑ mint/success, ↓ dangerBg/danger.
- **Progress-Bar** — Höhe 9–10, radius pill, Track `border`, Fill `green`
  (Haus-Fortschritt: Fill `gold`). Frage-Schritte: 5 Segmente, gefüllt = `green`.
- **Eingabefeld** — bg `surface`, border 1.5 `border`, radius 16, padding 14×16,
  Text 15. *Fokus:* border 2 `green` + Ring `rgba(31,157,107,.12)`. *Fehler:*
  border 1.5 `danger` + Hinweistext `danger` 12. Label = Overline.
- **Karte** — bg `surface`, border 1 `border`, radius 22, shadow-md, padding 18–26.
- **Listenzeile** — 40er Icon/Avatar (radius 12, bg `softBlue`), Titel 15/700,
  Sub 12.5 `faint`, rechts Wert (Space Grotesk 700) + %; Trenner 1px `#EEF2F6`.
- **Tab-Bar** — Höhe 74, bg `surface`, Top-Border `border`. 5 Tabs, Icon 24 +
  Label 10.5. Aktiv = `green`, Icon **gefüllt** (FILL 1); inaktiv `faint`, Icon
  Outline (FILL 0). Kids/Adult-Reihenfolge: Start · Lernen · Depot · Werte · Liga.
- **Belohnungs-Moment** — mint-Fläche radius 18, runder grüner Check-Kreis 56,
  Titel „Richtig!" (SG 19/700), Erklärtext, XP-Pill (`gold`).

## 7. Screens / Views (alle 9 + Beamer)

Alle Phone-Mockups sind **390×844** (mobile-first, Basisbreite 375–390).
Hit-Targets ≥ 44px, Kontrast ≥ WCAG AA. DE/EN umschaltbar (flexible Längen).

1. **Onboarding / Auth** — DE/EN-Switch oben rechts; Logo-Kachel („H", grün auf
   navy, radius 18); H1 „Willkommen bei Hofino"; Segmented „Neu hier/Anmelden";
   Rollen-Auswahl (Kind 10–15 / Erwachsene / Eltern / Lehrer, 4 Chips);
   **Grundstück wählen** (Kids: Wald/See/Stadt, ausgewählt = border 2 `green`);
   Inputs (Anzeigename, E-Mail, Passwort); goldSoft-Hinweis „5.000,00 € virtuell";
   Akzent-CTA „Los geht's". Kein Tab-Bar.
2. **Zuhause · Kids** — Begrüßung; **Haus-Karte** (208 hoch, Sky-Gradient,
   Hügel, flaches Vektor-Haus, Stufen-Pill „Stufe 3 · Wände"); Haus-Progress
   (3/6, Fill `green`); 2 Kennzahl-Karten (Depotwert + %, Wissen „1/20 Module");
   navy „Nächste Mission"-Karte mit Akzent-CTA. Tab „Start" aktiv.
3. **Zuhause · Adult** — **kein Haus**, ruhiger: großer Depotwert-Block
   (Cash/Positionen/%), Lernfortschritt-Karte (XP-Bar), Liga-Teaser (eine Zeile),
   CTA „Weiterlernen". Tab-Icon „Start" = `monitoring`.
4. **Lernen · Übersicht** — H1 „Lernen"; Wissenslevel-Karte (XP-Bar + „250 XP"-
   Pill); Auszeichnungen (Icon + Name + n/m); **goldSoft-umrandete** „Tägliche
   Mini-Aufgabe" (CTA primär); Konzept-Liste mit Status-Badges. Tab „Lernen" aktiv.
5. **Lernen · Frage-Flow** — Back + Schritt-Progress (60%, „3/5"); Modul-Overline;
   Frage (H2); 4 Antwort-Optionen (richtige = mint + border `green` + check_circle);
   **Feedback-Banner** (mint, „Richtig!" + Erklärung + XP-Pill) + Primär „Weiter".
   Flow: Erklärseite → MC-Frage → Feedback → Abschluss-Belohnung.
6. **Depot** — Gesamtwert-Karte (+„virtuell"-Pill, Cash/Positionen); softBlue-
   Hinweis **„Übungsorder-Gebühr 5,00 € pro Kauf/Verkauf · keine Bruchstücke"**;
   Positionsliste (Apple: 3 Stück, Ø 210, Wert/%); Buttons „Ansehen" + „Verkaufen
   üben"; Entscheidungsjournal (leer). Tab „Depot" aktiv.
7. **Entdecken · Werte** — H1 + „17 Werte"; Suchfeld; Liste (Avatar, Name,
   Ticker · Aktie/ETF, Preis Space Grotesk). Tab „Werte" aktiv.
8. **Werte · Faktensheet** — Back; Header (Avatar 52, Name, Ticker · stündlich);
   großer Preis + %; „Was macht das Unternehmen?"; **Chancen** (mint) /
   **Risiken** (dangerBg) nebeneinander, neutral; softBlue-Hinweis **„keine
   Anlageempfehlung, kein echtes Geld"**; Primär „Kaufen üben" + Gebührhinweis.
9. **Liga / Rankings** — H1 + „Top 10 erhalten Auszeichnungen"; Segmented
   Performance/Kapital/Wissen; Ranking-Liste (Rang-Badge: 1=gold, 2=silber,
   3=bronze, sonst Nummer; „Du"-Zeile mint-hervorgehoben); Wochen-Challenge-Karte.
   Motivierend, nicht aggressiv-kompetitiv. Tab „Liga" aktiv.
10. **Family · Eltern** — „Verknüpft mit Mia" (nur lesend, kein eigenes Depot);
    Lernfortschritt; Depotentwicklung (einfaches Balken-Mini-Chart); Kinderschutz-
    Hinweis. Eigene Shell-Tabs: Übersicht (`visibility`) · Lernen · Depot · Konto.
11. **Classroom · Lehrer** — Klasse + navy **Klassencode-Karte** („TEST6B", teilen/
    neu generieren); Schülerliste **nur Aggregate** (Module · Punkte · ≈ Kapital);
    „Module zuweisen" (empfehlen, kein Zwang). Lehrer-Shell-Tabs: Klasse
    (`groups`) · Beamer (`cast`).
- **Beamer-Großbild (Web, ~1280×800)** — navy Kopf (Logo + Klasse + großer
  Beitritts-Code in `gold`); links Klassen-Challenge/Wissensliga (sehr große
  Schrift, nur Aggregate), rechts „Modul des Tages" + navy Klassen-Gesamt-Karte.
  Whiteboard-/Web-tauglich, große lesbare Größen.

## 8. Interaktionen, Zustände & State

- **Theme-Switch** Light/Dark: ein Token-Set (gleiche Namen), kein zweites UI.
  Empfehlung: System-Preference + manueller Toggle in Einstellungen.
- **Modus/Rolle** bestimmt Shell (Tabs), Tonalität und ob das Haus erscheint
  (`modeTone` in `theme.ts`). Eine gemeinsame Komponenten-Basis.
- **Tab-Bar:** aktiver Tab = `green` + gefülltes Icon; Wechsel ohne Animation-Spielerei.
- **Frage-Flow-State:** `currentStep`, `selectedAnswer`, `isAnswered`, `xpEarned`.
  Nach Auswahl → richtige Option mint+check, falsche dezent rot; Feedback-Banner
  einblenden; „Weiter" → nächster Schritt; am Ende Abschluss-Belohnung.
- **Depot/Order-Übung:** Gebühr 5,00 €/Order, keine Bruchstücke, Kurse stündlich
  (keine Realtime — **kein** blinkender Ticker). Entscheidungen ins Journal.
- **Eingabe-Validierung:** Passwort ≥ 6 Zeichen; Fehlerzustand wie in §6.
- **Form-/Längen-Flexibilität:** DE/EN unterschiedlich lang → Layouts flexibel,
  Buttons/Chips dürfen umbrechen.
- **Animationen:** sparsam, ruhig (Bildung first). Keine Sucht-/Hype-Mechaniken.

## 9. Haus-System (Kids · §6 des Briefs)

Emotionales Herz des Kids-Modus. **Flache Vektor-Illustration**, einfache
geometrische Flächen, gleiche Stil-Grammatik. **Stürzt nie ein** (auch bei
Depotverlust — positive, nie bestrafende Bildsprache).

- **6 Bau-Stufen:** Grundstück → Fundament → Wände → Dach → Erstes Haus → Ausbauten
  (im Mockup vollständig am Beispiel **Wald/Wiese**).
- **3 Grundstücks-Typen:** Wald/Wiese (grün), See (Wasserband + Insel), Stadt
  (graue Nachbargebäude). Im Mockup als repräsentative Beispiele angelegt — die
  restlichen Stufen×Grundstücke nach gleichem Prinzip ableiten.
- **Auszeichnungs-Objekte:** Medaillen Gold/Silber/Bronze (Stern), Wissens-Badge
  (`school`, grün), Liga-Pokal (`emoji_events`, navy/gold).

> Für die Produktion: gleiche flache Vektor-Sprache beibehalten; bei Bedarf von
> einem Illustrator je Stufe×Grundstück als SVG-Set ausarbeiten lassen.

## 10. Assets

- **Schriften:** Space Grotesk + Hanken Grotesk (Google Fonts; in RN als
  gebündelte Font-Dateien einbinden).
- **Icons:** **Material Symbols Rounded** (gefüllt = aktiv, FILL 1; Outline =
  inaktiv, FILL 0). Verwendete Ligaturen u. a.: `cottage`, `menu_book`, `work`,
  `explore`, `emoji_events`, `monitoring`, `visibility`, `settings`, `groups`,
  `cast`, `search`, `arrow_back`, `chevron_right`, `check`, `check_circle`,
  `verified`, `workspace_premium`, `school`, `star`, `link`, `add_circle`,
  `trending_up`, `trending_down`. In RN ein konsistentes Icon-Set wählen, das
  diese Glyphen abdeckt (z. B. Material Symbols als Font/SVG). **Keine Emojis.**
- **Logo (NEU):** grünes **H** auf Navy, abgerundetes Quadrat — **plus
  integrierter Börsenpfeil**: ein Gold-Strich (`#E7BD57`) steigt diagonal nach
  oben rechts und endet in einer Pfeilspitze (steigende Kurse / Wachstum). Der
  Pfeil liegt über dem H (z-index über der Glyphe), Winkel ca. **−30°**. Maße
  skalieren mit der Kachel: bei 42px-Kachel Strich ~23×3, Pfeilspitze ~6px; bei
  60px ~33×4 / 9px; großer Mark (96px) ~52×6 / 13px. Konzept „H + Wachstum"
  bleibt, nur ergänzt. **Kein** €/$-Zeichen, keine Münze als Leitsymbol.
  Referenz: Foundations-Karte „Logo" in `Hofino Design-System.dc.html` (große
  Marke + 42px hell/dunkel). Für Produktion als SVG-Mark nachbauen.
- **Illustrationen:** Haus/Grundstücke — derzeit als CSS-/Vektorflächen
  spezifiziert (keine externen Bilddateien).

## 11. Harte Leitplanken (gelten dauerhaft)

Keine Trading-/Zocker-Optik · keine blinkenden Kursticker · keine Bank-Steifheit ·
kein kindisches Clipart · Kinderschutz (keine Werbung, kein Chat, keine offenen
Profile, keine Brokerlinks im Kinder-/Klassenmodus; Anzeigenamen statt Klarnamen) ·
keine Anlageempfehlungen / keine „Kaufen-Druck"-Sprache · es fließt **nie** echtes
Geld. Wirkung: modern, vertrauensvoll, freundlich, motivierend — **Bildung first.**
