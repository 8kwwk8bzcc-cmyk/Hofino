# ARCHITECTURE.md – Hofino

## 1. Plattform-Strategie

Ziel: **ein Codebase** für iOS (zuerst), Android (V1.1) und Web (Browser, u. a. Lehrer am Beamer).

Lösung: **Expo / React Native + react-native-web**.
- iOS & Android: native Builds über Expo.
- Web: dieselbe Komponenten-Basis via react-native-web.
- Der Lehrer-/Beamer-Modus ist **kein** eigenes Projekt, sondern eine eigene Ansicht/Route
  innerhalb der Web-Version, optimiert für große Bildschirme.

Mobile-first: Layouts werden für kleine Screens entworfen und nach oben skaliert.

## 2. Warum dieser Stack

- **Ein Codebase** statt drei Apps → entscheidend für ein kleines Team.
- **Supabase** liefert Datenbank, Auth und – zentral für den Kinderschutz – Row-Level Security
  fertig mit. Sicherheit liegt damit in der Datenbank, nicht nur in der App.
- **TypeScript end-to-end**: gleiche Typen in App, Core und Edge Functions.

## 3. Schichten

```
┌─────────────────────────────────────────────┐
│ apps/app  (Expo / RN + react-native-web)     │  UI, Navigation, Modi
└───────────────┬─────────────────────────────┘
                │ ruft reine Funktionen + Supabase-Client
┌───────────────┴─────────────────────────────┐
│ packages/core   (reine Domänen-Logik)         │  Depot-Engine, Gebühren,
│                  KEINE UI, KEIN Netzwerk      │  Lernkapital, Wissenspunkte,
│                                               │  Rankings, Haus-System
├──────────────────────────────────────────────┤
│ packages/content  (redaktionelle Inhalte)     │  Module, Profile, ETFs
├──────────────────────────────────────────────┤
│ packages/market-data  (Kursdaten-Abstraktion) │  MarketDataProvider + Simulator
└───────────────┬──────────────────────────────┘
                │
┌───────────────┴─────────────────────────────┐
│ Supabase: Postgres + Auth + RLS              │  Persistenz + Sicherheit
│ Edge Functions (Cron):                        │
│   - hourly-price-update                       │  schreibt price_snapshots
│   - ranking-recompute                         │  aktualisiert Ranglisten
└──────────────────────────────────────────────┘
```

## 4. Kursdaten-Abstraktion (Kernentscheidung)

Im MVP werden **keine** echten Feeds aufgerufen. Stattdessen gibt es eine klare Schnittstelle:

```ts
// packages/market-data/src/provider.ts
export interface PricePoint { instrumentId: string; priceCents: number; asOf: string; }

export interface MarketDataProvider {
  /** Liefert die aktuellen Stundenkurse für alle gehandelten Instrumente. */
  getHourlyPrices(instrumentIds: string[]): Promise<PricePoint[]>;
}
```

- **MVP:** `SimulatedMarketDataProvider` – erzeugt realistische, deterministische Kursverläufe
  für die ~210 Instrumente. Damit ist die App vollständig entwickel- und testbar, ohne Vertrag.
- **Später:** `LicensedDelayedProvider` – verzögerter, lizenzierter Feed.
  Wird hinter **derselben** Schnittstelle eingehängt; der Rest der App ändert sich nicht.

**Regel:** Kein Code außerhalb von `packages/market-data` kennt einen konkreten Anbieter.

## 5. Datenfluss „Kurse & Rankings"

1. **Edge Function `hourly-price-update`** (Cron, stündlich): holt Preise über den aktiven
   `MarketDataProvider`, schreibt einen neuen Satz `price_snapshots`.
2. Order-Ausführung in der App liest immer den **jüngsten** `price_snapshot` eines Instruments.
3. **Edge Function `ranking-recompute`** (Cron, z. B. stündlich): berechnet Performance-,
   Gesamtkapital- und Wissensliga-Werte serverseitig und aktualisiert die Ranglisten.

Rankings **nie** im Client berechnen (Manipulationsschutz).

## 6. Order-Ausführung (Pseudo-Ablauf)

```
Kauf(instrument, menge):
  preis   = jüngster price_snapshot(instrument)
  brutto  = preis * menge            # ganze Stücke, keine Bruchteile
  gebuehr = 500                      # 5 € pro Order, in Cent
  gesamt  = brutto + gebuehr
  wenn cash < gesamt: ablehnen (oder auf Wunschliste)
  sonst:
    cash -= gesamt
    holding += menge (avg_cost aktualisieren)
    order-Datensatz schreiben (preis, gebuehr, zeit)
```

Alle Beträge in Cent. Diese Logik lebt in `packages/core` und ist unit-getestet.

## 7. Internationalisierung

MVP-Sprachen Deutsch + Englisch. Texte über i18n-Keys, nie hartkodiert in Komponenten.

## 8. Was bewusst draußen bleibt (Komplexität vermeiden)

Realtime-Kurse, Limit/Stop-Orders, Bruchstücke, Echtgeld, Broker-Anbindung, Chat, Audio/Video.
Diese stehen nicht im MVP und sollen den Code nicht „vorsorglich" verkomplizieren.
