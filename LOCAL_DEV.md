# Lokal entwickeln & testen

Voraussetzung: Node ≥20 + pnpm (auf diesem Mac via nvm bereits eingerichtet).

```bash
pnpm install        # Abhängigkeiten
pnpm test           # Unit-Tests (Vitest, packages/core)
pnpm typecheck      # TypeScript strict über alle Pakete
pnpm lint           # ESLint
pnpm web            # App im Browser (Expo Web, http://localhost:8081)
```

**Definition of Done je Aufgabe:** `pnpm lint && pnpm typecheck && pnpm test` grün.

## GitHub-Sync
Remote: `git@github.com:8kwwk8bzcc-cmyk/Hofino.git` (SSH). Ein lokaler `post-commit`-Hook
pusht **nach jedem Commit automatisch** nach `origin/main`. Push-Log: `/tmp/hofino_autopush.log`.

## App ↔ Supabase
Die App nutzt Supabase (Auth + DB). Lokale Defaults sind in `apps/app/src/lib/supabase.ts`
hinterlegt; für andere Umgebungen `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
setzen. Voraussetzung: lokaler Supabase-Stack läuft (`pnpm exec supabase start`).
Mutationen laufen über die RPCs `place_order` / `complete_module` (serverseitig, manipulationssicher).

## Test-Cockpit (alle Rollen nebeneinander)
Mehrere Rollen gleichzeitig im Browser testen (Kind ↔ Eltern, mehrere Kinder ↔ Lehrer, nur Kind …).

```bash
pnpm exec supabase start                          # DB/Auth
node apps/app/scripts/seed-test-users.mjs          # Test-Nutzer anlegen (Passwort: hofino-dev-123)
pnpm --filter @hofino/app cockpit                  # Build mit Dev-Login + cockpit.html -> dist
python3 -m http.server 8099 --directory apps/app/dist
# dann öffnen:  http://localhost:8099/cockpit.html
```

Test-Nutzer: Mia & Tom (Kind), Alex (Erwachsene), Papa (Eltern, mit Mia+Tom verknüpft),
Frau Klein (Lehrer, Klasse „6b" / Code TEST6B mit Mia+Tom). Oben Layout-Presets wählen;
jede Spalte hat eine eigene Session und einen Nutzer-Umschalter.

> Hinweis: Der Dev-Auto-Login ist nur im **Cockpit-Build** aktiv (`EXPO_PUBLIC_DEV_LOGIN=1`) und
> darf nicht produktiv deployt werden. Schlägt das Seeden mit „already registered" fehl, vorher
> `pnpm exec supabase db reset` ausführen.

## Was lokal läuft
- ✅ Domänen-Logik + Tests (`packages/core`)
- ✅ App im **Web-Browser** (`pnpm web`) — deckt auch den Lehrer-/Beamer-Modus ab
- ⏳ **iOS-Simulator**: braucht volles Xcode (aktuell nur Command Line Tools)
- ✅ **Supabase lokal** (Docker): `pnpm exec supabase start` — Studio auf http://127.0.0.1:54323, siehe `supabase/README.md`
