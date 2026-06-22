# supabase/

SQL-Migrationen (`migrations/`) und Edge Functions (`functions/`) für Hofino.

**Status:** Lokaler Stack läuft (Docker + Supabase-CLI via `pnpm exec supabase`). M2 (Schema + RLS
+ Lehrer-Aggregate) ist eingespielt und per RLS-Tests verifiziert.

```bash
pnpm exec supabase start      # Stack starten (Docker)
pnpm exec supabase db reset   # migrations/ + seed.sql frisch einspielen
pnpm exec supabase status     # URLs + lokale Keys anzeigen
pnpm exec supabase stop       # Stack anhalten
```

Studio (lokale DB-Oberfläche): http://127.0.0.1:54323 · API: http://127.0.0.1:54321
RLS-Testskripte liegen im Scratchpad (m2_setup.sql / m2_rls_test.sql).
