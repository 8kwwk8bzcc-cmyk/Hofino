# CLAUDE.md – Projektregeln für Hofino

> Diese Datei wird von Claude Code bei jeder Sitzung gelesen. Sie ist verbindlich.
> Wenn eine Anweisung im Chat dieser Datei widerspricht, frage nach, bevor du sie umsetzt.

## 1. Was ist Hofino

Hofino ist eine **Finanzbildungs- und Investment-Trainings-App** für Kinder (10–15),
Familien, Erwachsene und Schulklassen.
Claim: *„Geld verstehen. Investieren üben."*

Die App **erklärt, trainiert und simuliert** mit virtuellem Geld. Es fließt zu keinem
Zeitpunkt echtes Geld, und es werden keine echten Wertpapiere gehandelt.

## 2. Was Hofino NICHT ist (harte Leitplanken)

Hofino ist **keine** Bank, **kein** Broker, **kein** Robo-Advisor, **keine**
Anlageberatung, **keine** Social-Media-Plattform und **keine** Daytrading-/Zocker-App.

Daraus folgen unverhandelbare Regeln:

- **Keine Anlageempfehlungen.** Kein Feature, kein Text, kein KI-Output sagt „kaufe/verkaufe X".
- **Keine echten Käufe.** Kinder können nichts mit echtem Geld auslösen. Keine Brokerlinks im Kinder- oder Klassenmodus.
- **Keine Daytrading-Optik.** Fokus auf langfristiges Verstehen, nicht auf Hektik.
- **Keine Werbung** im Kindermodus.

## 3. Kinderschutz (Priorität über alle Features)

- Keine Klarnamenpflicht für Kinder. Anzeigename frei wählbar.
- Keine offenen Profile, **kein Chat, keine Direktnachrichten, keine Kommentare**.
- Freundes-/Gruppenkontakte nur über Einladung/Freigabe.
- **Lehrer sehen nur Aggregate** der Klasse (Lernfortschritt, Wissenspunkte, Quiz-Ergebnisse,
  Klassenrankings, grobe Depotkennzahlen) – **nicht** die vollständige Einzelorder-Historie
  und **keine** privaten Familieninformationen.
- **Eltern** sehen Lernfortschritt und Depotentwicklung ihres Kindes, können das Depot aber
  **nicht manipulieren**.
- Diese Regeln werden technisch über Row-Level Security (RLS) in der Datenbank erzwungen,
  nicht nur in der App. Siehe `DATA_MODEL.md`.

## 4. Tech-Stack (verbindlich)

- **Sprache:** TypeScript, durchgängig, `strict: true`.
- **Monorepo:** pnpm + Turborepo.
- **App (iOS + Android + Web):** **ein** Codebase mit Expo / React Native + react-native-web.
- **Backend:** Supabase (Postgres, Auth, Row-Level Security, Edge Functions, Scheduled Jobs/Cron).
- **Geldbeträge:** **immer als Integer in Cent** speichern und rechnen (`bigint`), nie als Float.
- **Tests:** Vitest für `packages/core`. Die Domänen-Logik muss vollständig unit-getestet sein.

## 5. Monorepo-Struktur

```
hofino/
├── apps/
│   └── app/              # Expo-App: iOS, Android, Web (react-native-web)
├── packages/
│   ├── core/             # Reine Domänen-Logik, KEINE UI, KEINE Netzwerkzugriffe
│   ├── content/          # 20 Lernmodule, ~200 Unternehmensprofile, 10 ETFs (redaktionell)
│   └── market-data/      # MarketDataProvider-Interface + Simulator
├── supabase/
│   ├── migrations/       # SQL-Schema + RLS-Policies
│   └── functions/        # Edge Functions (Kurs-Update-Cron, Ranking-Recompute)
├── CLAUDE.md
├── ARCHITECTURE.md
├── DATA_MODEL.md
└── BACKLOG.md
```

**`packages/core` ist das Herzstück.** Es enthält die Depot-Engine, Gebührenlogik,
Lernkapital-/Wissenspunkte-Regeln, Ranking-Berechnungen und das Haus-System – als reine,
testbare Funktionen ohne UI und ohne externe Aufrufe.

## 6. Eiserne Domänenregeln (1:1 aus dem Konzept)

### Musterdepot
- Startkapital: **5.000 €** virtuell (= `500000` Cent) pro Nutzer.
- Anlageuniversum: ~200 bekannte Unternehmen + ~10 echte ETFs.
- **Keine Bruchstücke** – nur ganze Aktien und ganze ETF-Anteile.
- Kurse stündlich aktualisiert. **Keine** Realtime-Mechanik.
- Order wird **sofort zum zuletzt verfügbaren Stundenkurs** ausgeführt.
- **Keine** Limit-Orders, Stop-Loss-Orders, Orderbuch oder komplexe Orderarten.
- Zu teure Werte → Wunschliste/Beobachtungsliste, kein Kauf.

### Gebühren
- **5 €** (= `500` Cent) **pro Order** (Kauf oder Verkauf), **nicht pro Aktie**.
- Gebühr wird vollständig in Gewinn/Verlust eingerechnet.
- Beispiel: 4 Aktien à 120 € = 480 € + 5 € Gebühr = **485 €** Abzug vom Verrechnungskonto.

### Lernkapital (virtuell, je Nutzer nur EINMAL pro Ereignis)
| Ereignis | Lernkapital |
|---|---|
| Lernmodul abgeschlossen | +500 € |
| Quiz perfekt beantwortet | +500 € |
| Themenblock abgeschlossen | +1.000 € |
| Großer Meilenstein | +2.000 € |

Wiederholen ist erlaubt, bringt aber **kein** zusätzliches Kapital. Lernkapital und
Investment-Performance werden **getrennt** ausgewertet.

### Wissenspunkte
| Ereignis | Punkte |
|---|---|
| Lernmodul abgeschlossen | +100 |
| Quiz bestanden | +50 |
| Quiz perfekt (Zusatz) | +100 |
| Themenblock abgeschlossen | +300 |
| Großer Meilenstein | +500 |

### Rankings (jeweils Top 10 erhalten Auszeichnungen)
- **Performance-Ranking:** prozentualer Gewinn/Verlust auf (Startkapital + Lernkapital), nach Gebühren.
- **Gesamtkapital-Ranking:** höchster Depotwert = Cash + Aktien-/ETF-Wert nach Gebühren.
- **Wissensliga:** Summe der Wissenspunkte.

### Haus-System (nur Kindermodus)
> **Status (Mission-Board-Pivot):** UI **ausgeblendet** über `house_enabled=false`
> (`apps/app/src/config/flags.ts`). Logik/Daten bleiben erhalten; die Regeln unten gelten
> weiterhin, sobald das Feature-Flag wieder aktiviert wird. Siehe §11.

Stufen: `Grundstück` (Start) → `Fundament` (erstes Investment) → `Wände` (erste Lernmodule)
→ `Dach` (Risiko & Diversifikation verstanden) → `Erstes Haus` (erster Themenblock)
→ `Ausbauten` (weitere Meilensteine).
- Schlechte Depotentwicklung lässt das Haus **nicht** einstürzen.
- Freigeschaltete Lernfortschritte gehen **nie** verloren.
- **Verlustschutzschild ist NICHT im MVP.**

## 7. Modi / Rollen

**Vier Modi, alle im MVP** (`profiles.role` steuert Modus + Rechte):

| Modus | Zielgruppe | Rolle im MVP |
|---|---|---|
| Hofino Kids | Kinder 10–15 (`child`) | Hauptmodus: Haus-System, verspielte Anmutung |
| Hofino Family | Eltern (`parent`) | Begleit-/Kontrollmodus, verknüpft mit Kind |
| Hofino Adult | Erwachsene (`adult`) | Eigenes Depot, sachlicheres Design, **kein** Haus-System |
| Hofino Classroom | Lehrer (`teacher`) + Schüler (`student`) | Eigener Modus, Klassen-Code |

Geteilte Basis: Depot, Lernen, Rankings, Inhalte aus `packages/core`/`content` sind für alle Modi
gleich. Ein Modus = Rolle + UI-Variante (Theme/Navigation) + RLS-Rechte, **kein** eigener Codebase.
Adult-Nutzer können zusätzlich Elternfunktion (Kind verknüpfen) übernehmen.

## 8. Inhalte / KI im Kindermodus

- Unternehmens- und ETF-Profile sind **redaktionell vorbereitet** (`packages/content`).
- **Im Kindermodus werden KEINE frei generierten KI-Texte ausgespielt** und keine
  tagesaktuellen Nachrichten integriert.
- ETFs werden als reale Produkte mit Name/ISIN/WKN als **neutrale Lernbeispiele** dargestellt –
  niemals als Kaufempfehlung.
- 20 Grundlagen-Lernmodule (Liste siehe `packages/content`). Im MVP nur Textkarten + Quiz;
  Audio/Video erst in Version 2.

## 9. Premium (sichtbar, aber gesperrt im MVP)

Sichtbare, nicht buchbare Kacheln: **KI-Coach, mehrere Depots, ETF-Werkstatt, erweiterte Analyse**.
Keine aktive Bezahlung im MVP. Der spätere KI-Coach ist Sparringspartner, **nie** Anlageberater.

## 10. Nicht im MVP

Audio/Video, aktive Bezahlung, Brokervermittlung, Krypto, Rohstoffe, Derivate, Chat,
Verlustschutzschild. (Der Erwachsenen-Modus ist jetzt im MVP enthalten.)

## 11. Design-Tokens (verbindlich) – Corporate Design „Grünanlage"

> **Verbindliches CD** (Claude-Design-Handoff, freigegeben). Quelle der Wahrheit ist
> `apps/app/src/theme.ts` (Light **und** Dark). Referenz-Handoff liegt unter `design/handoff/`.
> Runtime-Theming über `theme/ThemeProvider.tsx` (`useColors()` / `useThemedStyles()` /
> `ThemeToggle`). Neue UI **immer** über die Tokens + Hook bauen, **nie** Hex hart verdrahten.

| Token | Light | Dark | Bedeutung |
|---|---|---|---|
| `navy` | `#0E2A47` | `#34B97E` | primary · Vertrauen, Wissen (im Dark → Grün-hell) |
| `navySoft` | `#1C3D5C` | `#173049` | sekundäre Flächen/Icons |
| `green` | `#1F9D6B` | `#34B97E` | secondary · Wachstum, Lernen, **aktive Tabs** |
| `gold` | `#E7BD57` | `#E7BD57` | accent · XP, Erfolge (dezent) |
| `bg` | `#F2F6FA` | `#0A1A2C` | App-Hintergrund |
| `surface` | `#FFFFFF` | `#12263C` | Karten |
| `softBlue` | `#E8F0FA` | `#173049` | weiche Akzentfläche / Hinweis |
| `mint` | `#E4F4EC` | `rgba(52,185,126,.14)` | Erfolg/Highlight |
| `goldSoft` | `#FBF1D6` | `rgba(231,189,87,.16)` | weiche Gold-Fläche |
| `text` | `#0E2A47` | `#EAF1F8` | Primärtext |
| `muted` | `#5C7184` | `#8FA6BC` | Sekundärtext |
| `faint` | `#9AA7B4` | `#6B829A` | Tertiär/Labels/Placeholder |
| `border` | `#DCE6EE` | `#244763` | Rahmen/Trennlinien |
| `danger` | `#D96B6B` | `#E58A8A` | zurückhaltendes Negativ-Rot |
| `success` | `#1F8A5B` | `#34B97E` | kontraststarkes Text-Grün |

- Schriften: **Space Grotesk** (Display/Überschriften/Zahlen), **Hanken Grotesk** (Fließtext/UI).
  Skala: H1 30/700 · H2 24/700 · H3 19/700 · BodyL 16 · Body 14.5 · Caption 12.5 · Overline 11 (upper).
- Form: Radien sm 10 · button 14 · input 16 · card 22 · pill 999. Schatten sm/md/lg (md = Karte).
- Icons: konsistentes Outline-Set (`ui/icons.tsx`); **aktiv = gefüllt (FILL) + grün**, inaktiv Outline `faint`.
  **Keine Emojis** in der Tab-Bar.
- Logo: **freigegebenes PNG-Asset** (NICHT neu zeichnen / kein SVG/Canvas) — weißes „H" mit grünem steigendem Kursverlauf/Pfeil auf dunklem Navy. Assets unter `apps/app/assets/`: `logo.png` (rounded+transparent, In-App via `HLogo`-`Image`), `icon.png` (square, ohne Alpha → `expo.icon`/Splash/Android-Adaptive), `favicon.png` (rounded+transparent → `web.favicon`); verdrahtet in `app.json`. Quelle: `~/Downloads/hofino_logo_assets_corrected`. Keine €/$-Zeichen, keine Münze.
- Dark Mode: ein Token-Set (gleiche Namen), System-Preference + manueller `ThemeToggle` (persistiert).
- Anmutung: modern, vertrauensvoll, freundlich, lernorientiert. Nicht wie eine Bank, nicht wie eine
  Trading-App, nicht wie ein reines Kinderspiel. **Haus-System aktuell ausgeblendet** (Mission-Board-Pivot).

## 12. Code-Konventionen & Definition of Done

- Identifier/Code auf Englisch, Nutzer-sichtbare Texte und Doku auf Deutsch (i18n vorbereiten: de + en).
- Keine echten Kursdaten-Feeds direkt aufrufen. **Immer** über `packages/market-data`
  (MVP = Simulator). Siehe `ARCHITECTURE.md`.
- Neue Domänenregel = neuer Test in `packages/core`.
- Vor „fertig": `pnpm lint && pnpm typecheck && pnpm test` müssen grün sein.
- Arbeite die Aufgaben in der Reihenfolge aus `BACKLOG.md` ab.
