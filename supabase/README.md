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

- `update-prices` – **Marktdaten-Ingestion** (Schicht A). Holt die Kurse aller aktiven
  Instrumente über die per Env gewählte `MarketDataSource`, schreibt `prices` (Upsert,
  aktueller Kurs) **und** `price_snapshots` (Append, Zeitreihe). Läuft nur während der
  Xetra-Handelszeit (Mo–Fr 09:00–17:30 Europe/Berlin, DST-sicher im Code). Fallback:
  liefert die Quelle für ein Instrument keinen Wert, bleibt der bestehende Kurs stehen.
- `ranking-recompute` – berechnet Performance-, Gesamtkapital- und Wissensliga serverseitig.

**Zwei Schichten (nicht verwässern):** Schicht A (diese Function) ist die einzige Stelle, die
eine externe Quelle kennt. Schicht B (App / Store) liest **ausschließlich** `prices` /
`price_snapshots` aus der DB. Quellenwechsel = neue `MarketDataSource` in
`functions/_shared/market-source.ts`, **kein** App-Change.

### Marktdaten-Quelle umstellen

`MARKET_DATA_SOURCE` wählt die aktive Quelle:

- `simulated` (Default) – deterministische Pseudo-Kurse, offline, kein Key. Für lokale Entwicklung.
- `twelvedata` – Twelve Data `/price` (Xetra/EUR über `provider_symbol` im Format `TICKER:XETR`).
  Braucht das Secret `TWELVEDATA_API_KEY`. Free-Tier ist credit-limitiert (Limit im eigenen
  Twelve-Data-Dashboard prüfen) → Symbole werden gechunkt; bei Rate-/HTTP-Fehlern greift der Fallback.

```bash
# Secret für die gehostete Umgebung setzen (nie ins Repo / nie in den Client):
pnpm exec supabase secrets set TWELVEDATA_API_KEY=dein_key MARKET_DATA_SOURCE=twelvedata
```

### Lokal starten & aufrufen

```bash
pnpm exec supabase functions serve            # Dev-Server (Hot-Reload)
# in zweitem Terminal, ANON-Key aus `supabase status`. ?force=1 umgeht den Handelszeit-Guard:
curl -X POST "http://127.0.0.1:54321/functions/v1/update-prices?force=1" -H "Authorization: Bearer <ANON_KEY>"
curl -X POST  http://127.0.0.1:54321/functions/v1/ranking-recompute      -H "Authorization: Bearer <ANON_KEY>"
```

Lokaler Default ist `MARKET_DATA_SOURCE=simulated` → läuft offline ohne Key.

### Cron einrichten (gehostete Umgebung)

Bewusst **nicht** als Migration (keine Secrets/URLs im Repo, würde `db reset` lokal brechen).
Auf dem gehosteten Projekt einmalig im SQL-Editor einrichten (`pg_cron` + `pg_net`). Der
DST-sichere Handelszeit-Guard steckt im Function-Code, daher genügt ein **stündlicher** Job:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- Service-Role-Key + Functions-URL vorher in Vault ablegen (vault.create_secret(...)).
select cron.schedule('hofino-update-prices', '0 * * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'hofino_functions_url') || '/update-prices',
    headers := jsonb_build_object('Authorization',
                 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'hofino_service_role_key'),
                 'Content-Type', 'application/json')
  );
$$);
```

`verify_jwt = false` ist in `config.toml` gesetzt, damit der Scheduler die Functions aufrufen kann.

### Datenquelle / Rechte

Free-Tier-Daten sind „internal use". Für die geschlossene MVP-Phase vertretbar; vor öffentlichem
Einsatz Anzeige-/Weitergaberechte (Display/Redistribution) für den DE-Markt klären. Dank der
austauschbaren `MarketDataSource` ist der Wechsel auf einen lizenzierten verzögerten Feed ein
reiner Schicht-A-Tausch.
