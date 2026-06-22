# BACKLOG.md – Hofino MVP

> **V1.1-Entscheidungen (verbindlich):** Kinder **10–15**. Vier Modi **alle im MVP**:
> Kids, Family, **Adult** (neu), Classroom. Siehe `CLAUDE.md §7`.

Reihenfolge ist bewusst gewählt: erst das Fundament (Logik + Daten), dann UI, dann Modi.
Jede Aufgabe ist so geschnitten, dass Claude Code sie in einem überschaubaren Schritt umsetzen kann.
Definition of Done je Aufgabe: `pnpm lint && pnpm typecheck && pnpm test` grün.

## M0 – Projekt-Setup
- [ ] Monorepo mit pnpm + Turborepo anlegen (Struktur aus `ARCHITECTURE.md`).
- [ ] TypeScript `strict`, ESLint, Prettier, Vitest konfigurieren.
- [ ] Expo-App `apps/app` mit iOS-, Android- und Web-Target starten („Hello Hofino").
- [ ] Leere Pakete `core`, `content`, `market-data` mit Build/Test-Setup.
- [ ] Supabase-Projekt anlegen, `supabase/` lokal initialisieren.

## M1 – Domänen-Logik (`packages/core`, voll getestet)
- [ ] Geld-Typ (Cent) + Formatierungshelfer.
- [ ] Depot-Engine: Kauf/Verkauf, ganze Stücke, 5 €/Order-Gebühr, Cash-Verrechnung, avg_cost.
- [ ] Validierung: zu teuer → ablehnen/Wunschliste; keine Bruchstücke; keine Limit/Stop-Orders.
- [ ] Lernkapital-Regeln (+500/+500/+1.000/+2.000), je Ereignis einmal.
- [ ] Wissenspunkte-Regeln (+100/+50/+100/+300/+500).
- [ ] Ranking-Berechnung: Performance, Gesamtkapital, Wissensliga.
- [ ] Haus-System: Stufen-Logik (Grundstück → … → Ausbauten), kein Einsturz bei Verlust.
- [ ] Umfangreiche Unit-Tests inkl. der Konzept-Beispiele (z. B. 4×120 € + 5 € = 485 €).

## M2 – Datenbank & Sicherheit (Supabase)
- [ ] Migrations aus `DATA_MODEL.md` anlegen.
- [ ] RLS auf allen Tabellen aktivieren + Policies (Kind/Eltern/Lehrer).
- [ ] SECURITY-DEFINER-Views/Functions für die Lehrer-Aggregate (keine Einzelorders).
- [ ] Seed-Skript: ~200 Unternehmen + 10 ETFs als `instruments`.

## M3 – Kursdaten (`packages/market-data`)
- [ ] `MarketDataProvider`-Interface.
- [ ] `SimulatedMarketDataProvider` mit realistischen, deterministischen Stundenkursen.
- [ ] Edge Function `hourly-price-update` (Cron) → schreibt `price_snapshots`.
- [ ] Edge Function `ranking-recompute` (Cron) → aktualisiert `rankings`.

## M4 – Inhalte (`packages/content`)
- [ ] Datenschema für Lernmodule (Textkarten + 3–5 MC-Fragen) und Profile.
- [ ] Die 20 Lernmodule als Inhalt (Kinder-Erklärung + Eltern-/Lehrer-Erklärung).
- [ ] Profil-Vorlage für Unternehmen (Was macht es? Wie verdient es Geld? Chancen/Risiken …).
- [ ] ETF-Profil-Vorlage (neutral, mit Name/ISIN/WKN, keine Empfehlung).
- [ ] Redaktioneller Erstbestand der Profile (kann iterativ wachsen).

## M5 – Kindermodus (Haupt-UI, mobile-first)
- [ ] Auth/Onboarding kindgerecht: Profil, Grundstück wählen, 5.000 € erhalten.
- [ ] Navigation: Zuhause, Lernen, Depot, Entdecken, Challenges/Ligen.
- [ ] Zuhause: Haus, Fortschritt, nächste Mission.
- [ ] Entdecken: 200 Unternehmen + 10 ETFs, Profile, Wunschliste.
- [ ] Depot: Cash, Positionen, Kauf/Verkauf-Flow mit Gebührenanzeige.
- [ ] Lernen: Module + Quiz, Lernkapital/Wissenspunkte vergeben.
- [ ] Rankings + Challenges anzeigen.
- [ ] Design-Tokens aus `CLAUDE.md` als Theme; H-Logo einbinden.
- [ ] Gesperrte Premium-Kacheln anzeigen.

## M6 – Family-Modus
- [ ] Kind einladen/verknüpfen (Freigabe-Flow).
- [ ] Eltern-Dashboard: Lernfortschritt + Depotentwicklung (nur lesend).
- [ ] Familien-Challenge starten.

## M6b – Adult-Modus (Erwachsene)
- [ ] Eigenes Depot + Lernen/Rankings wie Kids, aber **ohne** Haus-System.
- [ ] Sachlicheres Theme/Navigation (gleiche Komponenten, andere UI-Variante).
- [ ] Elternfunktion: Adult kann optional ein Kind verknüpfen (teilt sich Flow mit M6).

## M7 – Classroom-Modus
- [ ] Lehrer: Klasse erstellen, Klassencode generieren.
- [ ] Schüler: per Code beitreten (keine offenen Profile, kein Chat).
- [ ] Lehrer-Dashboard: nur Aggregate (Lernfortschritt, Wissenspunkte, Quiz, Klassenrankings, grobe Depotkennzahlen).
- [ ] Module/Challenges zuweisen; Klassen-Challenge.
- [ ] Web-Ansicht für den Beamer (große Schrift, Klassenüberblick).

## M8 – Schliff & Absicherung
- [~] i18n de/en: Grundlage (de/en) + UI-Hülle/Auth übersetzt mit Sprachumschalter
      (`src/i18n.ts`). Offen: Inhaltsschirme schrittweise migrieren; englische Lerninhalte.
- [x] Kinderschutz-Checks als Tests (`packages/content` `auditChildContent`): keine
      Brokerlinks/Werbung/Anlageempfehlungen/Chat im Kindermodus.
- [x] Manipulationsschutz: Rankings nur serverseitig (`ranking-recompute`); Order/Lernkapital
      serverseitig (`place_order`/`complete_module`); kein Self-Granting (RLS). Siehe `SECURITY.md`.
- [x] Erfolgskriterien → Datenquellen dokumentiert (`SECURITY.md`); Datengrundlage vorhanden,
      Reporting später.

## Später (NICHT MVP)
Lizenzierter Kursfeed statt Simulator · Premium-Zahlung · KI-Coach · mehrere Depots ·
ETF-Werkstatt · erweiterte Analyse · Investment-Journal · optionale Saisons ·
Audio/Video · weitere Sprachen.

---

### Hinweis für die rechtliche Spur (parallel, nicht Code)
Vor öffentlichem Start prüfen: Markenrecht (DPMA/EUIPO/App-Stores), Datenschutz & Kinderkonten,
Kursdatenlizenz mit Weitergaberecht, Formulierung „Information vs. Anlageberatung", Schulmodus-Einwilligungen.
Dies ersetzt keine Rechtsberatung.
