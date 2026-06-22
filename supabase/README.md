# supabase/

SQL-Migrationen (`migrations/`) und Edge Functions (`functions/`) für Hofino.

**Status:** SQL/Functions werden ab **M2/M3** hier abgelegt und sind als Dateien lokal prüfbar.
Der **lokale Stack** (`supabase start`) braucht **Docker** + **Supabase CLI** — beides ist auf diesem
Rechner noch nicht installiert. Sobald vorhanden:

```bash
brew install supabase/tap/supabase   # CLI
supabase init                        # erzeugt config.toml (falls noch nicht vorhanden)
supabase start                       # startet Postgres/Auth/Studio lokal (Docker)
supabase db reset                    # spielt migrations/ + seed ein
```

Bis dahin: Domänen-Logik in `packages/core` ist voll ohne DB testbar (Vitest), die App läuft im Web.
