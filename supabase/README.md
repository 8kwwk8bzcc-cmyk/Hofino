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

## Edge Functions (M3)

- `hourly-price-update` – schreibt für jedes Instrument einen `price_snapshot`
  (Kurse vom Simulator, geteilte Logik in `functions/_shared/price-model.ts`).
- `ranking-recompute` – berechnet Performance-, Gesamtkapital- und Wissensliga serverseitig.

Lokal starten & aufrufen:

```bash
pnpm exec supabase functions serve            # Dev-Server (Hot-Reload)
# in zweitem Terminal, ANON-Key aus `supabase status`:
curl -X POST http://127.0.0.1:54321/functions/v1/hourly-price-update -H "Authorization: Bearer <ANON_KEY>"
curl -X POST http://127.0.0.1:54321/functions/v1/ranking-recompute   -H "Authorization: Bearer <ANON_KEY>"
```

**Cron:** Beide Functions sind als stündliche Cron-Jobs gedacht. Die Zeitsteuerung wird beim
Deployment eingerichtet (Supabase Scheduled Functions bzw. pg_cron + pg_net) – nicht im lokalen
MVP nötig. `verify_jwt = false` ist in `config.toml` gesetzt, damit der Scheduler sie aufrufen kann.
