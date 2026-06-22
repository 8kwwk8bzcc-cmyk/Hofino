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

## Was lokal läuft
- ✅ Domänen-Logik + Tests (`packages/core`)
- ✅ App im **Web-Browser** (`pnpm web`) — deckt auch den Lehrer-/Beamer-Modus ab
- ⏳ **iOS-Simulator**: braucht volles Xcode (aktuell nur Command Line Tools)
- ✅ **Supabase lokal** (Docker): `pnpm exec supabase start` — Studio auf http://127.0.0.1:54323, siehe `supabase/README.md`
