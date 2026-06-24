# Hofino – Design-Brief für ChatGPT (Mobile-First Redesign)

> **So benutzt du dieses Dokument:** Kopiere dieses gesamte Dokument in ChatGPT (GPT mit
> Bildverständnis/-generierung). Hänge die Screenshots aus dem Ordner `images/` an (zeigen den
> **aktuellen** Stand – das, was du überarbeitest). Dann folgt ChatGPT dem „Auftrag" unten.

---

## 0. Auftrag an dich (ChatGPT)

Du bist Senior Product- & UI-Designer für **Edu-Fintech-Apps**. Entwirf ein **modernes,
mobile-first** Design für die App **Hofino**.

**Vorgehen – in dieser Reihenfolge:**
1. **Stelle mir zuerst 3–5 gezielte Rückfragen**, falls etwas unklar ist (z. B. Reifegrad,
   gewünschter Verspieltheits-Grad, Dark Mode ja/nein). Sonst direkt weiter.
2. Liefere **3 deutlich unterschiedliche Design-Richtungen** (nicht Varianten derselben Idee).
   Pro Richtung:
   - **Name + 1-Satz-Idee** (das Gefühl, das sie erzeugt)
   - **Moodboard in Worten** (Anmutung, Vorbilder, Materialität)
   - **Farbsystem** als konkrete **Hex-Werte** (primär/sekundär/akzent/hintergrund/flächen/
     semantisch grün+rot, Light + optional Dark)
   - **Typografie**: konkrete Schriften (bevorzugt **Google Fonts**, weil frei + RN-tauglich),
     Schriftskala (H1/H2/Body/Caption in px)
   - **Icon- & Illustrationsstil** (v. a. für das **Haus-System** und Auszeichnungen, siehe §6)
   - **Komponenten-Look** (Karten, Buttons, Pills/Badges, Progress-Bars, Tab-Bar, Inputs)
   - **Mockups für 3 Schlüssel-Screens**: **(a) Kinder-Zuhause mit Haus**, **(b) Lernen**,
     **(c) Depot** – falls du Bilder generieren kannst, als **gerenderte iPhone-Mockups
     (390×844)**; sonst als sehr präzise, umsetzbare Layout-Beschreibung + ASCII/Wireframe.
   - **Begründung**: warum diese Richtung zu Zielgruppe + Leitplanken passt.
3. **Ich wähle dann eine Richtung aus.** Danach detaillierst du diese eine Richtung für **alle**
   Screens aus §5 und lieferst ein kleines „Design-System"-Kapitel (Tokens, Komponenten, Spacing).

**Wichtig:** Das Design muss in **React Native + react-native-web** umsetzbar sein → flache,
performante Layouts; keine exotischen CSS-Effekte, die RN nicht kann (kein aufwändiges
Backdrop-Blur, keine CSS-Grids-Tricks). Verläufe, Schatten, abgerundete Ecken, SVG-Illustrationen
sind ok.

---

## 1. Was ist Hofino

**Finanzbildungs- und Investment-Trainings-App.** Claim: **„Geld verstehen. Investieren üben."**
Sie **erklärt, trainiert und simuliert** mit **virtuellem** Geld. Nutzer bauen ein Musterdepot
(Start: 5.000 € virtuell), lernen in 20 Modulen über Geld/Unternehmen/Aktien/ETFs und festigen
das Wissen über Fragen. Kinder bauen parallel spielerisch ein **Haus** aus, das durch Lernen wächst.

**Es fließt nie echtes Geld; es werden keine echten Wertpapiere gehandelt.**

## 2. Zielgruppen & 4 Modi (alle in einer App, gesteuert über Rolle)

| Modus | Für wen | Besonderheit |
|---|---|---|
| **Kids** | Kinder **10–15** | Hauptmodus, **Haus-System**, verspielt-motivierend |
| **Family** | Eltern | Begleit-/Kontrollblick auf das Kind (nur lesend), kein eigenes Depot |
| **Adult** | Erwachsene | Eigenes Depot + Lernen, **sachlicheres** Design, **kein** Haus |
| **Classroom** | Lehrer + Schüler | Klassen-Code, Lehrer-Dashboard (nur Aggregate), Beamer-Ansicht |

Das Design braucht **eine gemeinsame Basis**, die sich pro Modus in Tonalität anpassen lässt
(Kids = wärmer/verspielter, Adult = ruhiger/nüchterner) – **ohne** komplett andere App zu wirken.

## 3. Harte Leitplanken (prägen das Design!)

- **Keine Trading-/Zocker-Optik.** Kein hektisches Blinken, keine grün-rot-Kursticker-Dramatik,
  keine Daytrading-Anmutung. Ruhe, Langfrist-Verständnis.
- **Keine Bank-Steifheit.** Nicht wie eine klassische Bank-/Broker-App.
- **Kein reines Kinderspiel-Clipart.** Glaubwürdig, nicht kindisch. Zielgruppe ist 10–15, nicht 5.
- **Kinderschutz:** keine Werbung, kein Chat, keine offenen Profile, keine Brokerlinks im
  Kinder-/Klassenmodus. Anzeigenamen statt Klarnamen.
- **Keine Anlageempfehlungen**, keine „Kaufen/Verkaufen"-Drucksprache.
- **Gewünschte Wirkung:** **modern, vertrauensvoll, freundlich, motivierend.** Bildung first.

**Referenz-Vibes als Anker** (nicht kopieren, nur Stoßrichtung): die *spielerische Motivation*
von Duolingo, die *aufgeräumte Klarheit* moderner Fintechs (Trade Republic / Revolut), die *ruhige
Freundlichkeit* von Headspace. Hofino lebt im Dreieck dazwischen.

## 4. Aktuelle Marke (Ausgangspunkt, darf behutsam weiterentwickelt werden)

**Design-Tokens (aktuell):**
| Token | Hex | Bedeutung |
|---|---|---|
| primary | `#0D2B45` | Dunkelblau/Petrol – Vertrauen, Wissen |
| secondary | `#22C55E` | Grün – Wachstum, Lernen |
| accent | `#F4C542` | Gold/Gelb – Erfolge, Abzeichen, Belohnungen |
| background | `#F5F7FA` | ruhige Flächen |
| surface | `#FFFFFF` | Karten |

**Logo:** stilisiertes **„H" mit Wachstumslinie** (aktuell: grünes H auf dunkelblauem,
abgerundetem Quadrat). **Keine €/$-Zeichen, keine Münze als Hauptsymbol.** Das Logo-Konzept
(H + Wachstum) soll erhalten bleiben; eine Veredelung ist willkommen.

Du darfst die Palette als Basis nehmen **oder** je Richtung bewusst neu setzen – dann bitte
begründen, warum es besser zur Wirkung aus §3 passt.

## 5. Screen-Inventar (mobile-first, alle zu gestalten)

Navigation Kids: untere **Tab-Bar** mit 5 Tabs. (Adult ähnlich ohne Haus; Lehrer hat eigene Shell.)

1. **Onboarding / Auth** – Willkommen, Rollenwahl (Kind/Erwachsene/Eltern/Lehrer),
   Anzeigename, **Grundstück wählen** (Kids), E-Mail/Passwort, Spr+ Sprachumschalter DE/EN.
2. **Zuhause (Kids)** – Begrüßung, **Haus-Karte** (Stufe + Fortschrittsbalken), zwei Kennzahlen
   (Depotwert mit %, Wissenspunkte mit „x/20 Module"), **„Nächste Mission"**-CTA, Lernkapital-Hinweis.
3. **Zuhause (Adult)** – Dashboard **ohne** Haus: Depotwert, Lernfortschritt, Rankings-Teaser.
4. **Lernen** – **Wissenslevel + XP-Balken**, **Auszeichnungen** (Bronze/Silber/Gold),
   Tages-Lernstatus, **„tägliche Mini-Aufgabe"** (Wiederholung), Liste der **Konzepte/Module**
   (mit Status-Badges: „gemeistert", „Box n", „vom Lehrer"). Plus **Frage-Flow**: Erklärseite →
   Multiple-Choice-Frage → Feedback (richtig/falsch + Erklärung) → Abschluss-Belohnung.
5. **Depot** – Gesamtwert + %, Cash vs. Positionen, Positionsliste, Kauf/Verkauf-Flow
   (mit **5 €/Order-Gebührenanzeige**), Wunschliste.
6. **Entdecken** – Liste aller Werte (Aktien/ETFs als **Lernbeispiele**), Detail-/Faktensheet je
   Wert (Was macht die Firma? Chancen/Risiken … – **neutral**, keine Empfehlung).
7. **Ligen / Rankings** – Performance-Ranking, Gesamtkapital-Ranking, Wissensliga (Top 10 mit
   Auszeichnungen). Motivierend, nicht aggressiv-kompetitiv.
8. **Family** – Eltern: Kind verknüpfen (Freigabe-Flow), Lernfortschritt + Depotentwicklung lesend.
9. **Classroom** – Lehrer: Klasse + Code, Schülerliste (**nur Aggregate**), **Module zuweisen**,
   Klassen-Challenge; **Beamer-Ansicht** (große Schrift, Klassenüberblick fürs Whiteboard/Web).

**Wiederkehrende Komponenten:** Tab-Bar (Icons!), Karten, Buttons (primär/sekundär/ghost),
Pills/Badges, Progress-Bars, Eingabefelder, Listenzeilen, Belohnungs-/Erfolgs-Momente.

## 6. Die große Design-Chance: das Haus-System (nur Kids)

Das Kind baut durch **Lernen** ein Haus aus – das ist das emotionale Herz der App:
`Grundstück` → `Fundament` (erstes Investment) → `Wände` (erste Module) → `Dach`
(Risiko/Diversifikation verstanden) → `Erstes Haus` (erster Themenblock) → `Ausbauten`.
- Es **stürzt nie ein** (auch bei Depotverlust) – positive, nie bestrafende Bildsprache.
- Es gibt **3 Grundstücks-Typen** (Wald/Wiese, See, Stadt).
- Brauche einen **kohärenten, skalierbaren Illustrationsstil** für die 6 Bau-Stufen × 3
  Grundstücke **plus** Auszeichnungs-Objekte. (Aktuell nur ein Platzhalter-Piktogramm – hier ist
  am meisten Luft nach oben.) Vorschlag bitte inkl. Stil (z. B. flache Vektor-Illu, soft 3D, …).

## 7. Technische & UX-Anforderungen

- **Mobile-first**, Basisbreite **375–390 px**; später skalierbar auf Tablet/Web (Classroom-Beamer
  braucht eine **Großbild-Web-Ansicht**).
- **Bedienbarkeit für 10–15-Jährige**: große Tap-Ziele, klare Hierarchie, gut lesbare Größen,
  Kontrast mind. WCAG AA.
- **Eine Codebasis** (RN + react-native-web) → umsetzbar halten (siehe §0).
- **DE/EN** umschaltbar – Texte können unterschiedlich lang sein (Layouts flexibel).
- **Dark Mode**: optional, aber sag, ob/wie du es vorsiehst.
- **Icons**: aktuell Emojis in der Tab-Bar – bitte durch ein **konsistentes Icon-Set** ersetzen.

## 8. Was wir NICHT wollen

Gambling-/Hype-Ästhetik · blinkende Kursticker · Dark Patterns/Suchtmechaniken ·
kindisches Clipart · steifer Bank-Look · Stockfoto-Finanzbilder (Bullen/Bären, Geldregen) ·
Broker-/Kaufen-Buttons · €/$ als Leitsymbol.

## 9. Deliverables (Checkliste für deine Antwort)

- [ ] (Optional) Rückfragen
- [ ] **3 Richtungen** mit je: Idee, Moodboard, Farb-Hex, Typo, Icon-/Illu-Stil, Komponenten,
      3 Screen-Mockups, Begründung
- [ ] Hinweis, **welche Richtung du empfiehlst** und warum
- [ ] Warten auf meine Auswahl → dann **vollständige Ausarbeitung** der gewählten Richtung +
      kompaktes Design-System (Tokens, Spacing-Skala, Komponenten-Specs)

---

## Anhang A – Aktueller Stand (Screenshots)

Die folgenden Bilder zeigen den **heutigen** Stand (funktional, aber gestalterisch schlicht) –
das ist die Baseline, die du überarbeitest. (Bilder im Ordner `images/`.)

| Datei | Screen | Kurzcharakteristik heute |
|---|---|---|
| `images/01-onboarding.png` | Onboarding | Logo (grünes H auf Navy), Rollen-Chips, Grundstücks-Liste mit Emojis |
| `images/02-kids-home.png` | Kinder-Zuhause | Haus-Karte (Platzhalter-Illu), 2 Kennzahl-Karten, „Nächste Mission"-CTA, Emoji-Tab-Bar |
| `images/03-learn.png` | Lernen | Wissenslevel + XP-Balken, Auszeichnungen, Tagesstatus, Konzept-Karten mit Badges |
| `images/04-depot.png` | Depot | Gesamtwert-Karte, Positionsliste (Apple), schlichte Typo |
| `images/05-discover.png` | Entdecken | Werteliste (Aktien/ETFs) mit Ticker + Preis |
| `images/06-classroom.png` | Classroom (Lehrer) | Klassencode, Schüler-Aggregate, „Module zuweisen", Beamer-Tab |

**Beobachtung zur Baseline (zur Orientierung, nicht bindend):** sehr „karten- und textlastig",
Emoji-Icons, kaum Illustration/Charakter, wenig visuelle Hierarchie zwischen den Modi. Das Haus
wirkt noch wie ein Platzhalter. → Hier ist der größte Hebel für „cool & mobile-first".

## Anhang B – Eiserne Fakten (für korrekte Zahlen in Mockups)

- Startkapital **5.000 €** virtuell · Gebühr **5 € pro Order** · **keine** Bruchstücke ·
  Kurse stündlich (keine Realtime) · **20** Lernmodule/Konzepte.
- Rankings: Performance-% / Gesamtkapital / Wissensliga (je Top 10 mit Auszeichnung).
- Haus-Stufen: Grundstück → Fundament → Wände → Dach → Erstes Haus → Ausbauten.
