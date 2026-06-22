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

## Was lokal läuft
- ✅ Domänen-Logik + Tests (`packages/core`)
- ✅ App im **Web-Browser** (`pnpm web`) — deckt auch den Lehrer-/Beamer-Modus ab
- ⏳ **iOS-Simulator**: braucht volles Xcode (aktuell nur Command Line Tools)
- ⏳ **Supabase lokal**: braucht Docker + Supabase CLI — siehe `supabase/README.md` (ab M2)
