# Hofino – Setup-Paket für Claude Code

Diese vier Dateien bilden die Grundlage, damit Claude Code das Projekt sauber aufbauen kann.

| Datei | Inhalt | Wohin |
|---|---|---|
| `CLAUDE.md` | Verbindliche Projektregeln + alle Domänen-Constraints | **Repo-Wurzel** (Claude Code liest das automatisch) |
| `ARCHITECTURE.md` | Stack, Monorepo-Aufbau, Datenfluss, Kursdaten-Abstraktion | Repo-Wurzel |
| `DATA_MODEL.md` | Tabellen, RLS-Rollen, SQL-Startschema | Repo-Wurzel |
| `BACKLOG.md` | Priorisierte, klein geschnittene Aufgaben (M0–M8) | Repo-Wurzel |

## So startest du

1. Lege ein leeres Repository an.
2. Kopiere diese vier Dateien in die Wurzel.
3. Öffne das Projekt in Claude Code und gib als ersten Auftrag z. B.:

   > Lies `CLAUDE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md` und `BACKLOG.md`.
   > Halte dich strikt an `CLAUDE.md`. Setze **M0 – Projekt-Setup** aus `BACKLOG.md` um
   > und stoppe danach, damit ich das Ergebnis prüfen kann.

4. Danach Meilenstein für Meilenstein weiterarbeiten (immer einen abschließen, prüfen, dann weiter).

## Kernpunkte in einem Satz

Ein Codebase (Expo/React Native + Web), Supabase als Backend mit Row-Level Security für den
Kinderschutz, gesamte Spiel-Logik testbar in `packages/core`, und Kursdaten im MVP über einen
**Simulator**, der später ohne App-Umbau gegen einen lizenzierten verzögerten Feed getauscht wird.
