# SECURITY.md – Kinderschutz & Manipulationsschutz

Diese Schutzmaßnahmen sind umgesetzt und (lokal) getestet. Sie ergänzen `CLAUDE.md §2/§3`.

## Manipulationsschutz (serverseitig)
> Stand: Server-Härtung 2026-07-10 (Migration `20260710120000_server_hardening.sql`).

- **Order-Ausführung:** nur über die RPC `place_order` (SECURITY DEFINER). Preis kommt aus
  `price_snapshots` der DB, Gebühr (5 €) ist serverseitig fix, Menge wird validiert, Cash/Holdings/
  Order werden atomar gebucht — mit **Row-Locking** (`SELECT … FOR UPDATE`) gegen parallele
  Doppel-Orders und `CHECK`-Constraints (`cash_cents >= 0`, `quantity > 0`). Der Erst-Order-
  Gebührenerlass greift nur bei Order-Anzahl 0 **und genau 1 Stück**. Der Client kann weder
  Preis noch Gebühr setzen.
- **Wissenspunkte (XP):** Vergabe über die RPC `lern_antwort_speichern`; die XP-Höhe wird
  serverseitig auf den Katalogwert der referenzierten Frage/Vorlage gedeckelt (`fragen`/
  `vorlagen.wissenspunkte`, hartes Maximum 200) — clientgelieferte Fantasie-XP sind wirkungslos.
- **Lernkapital:** Vergabe über die RPC `lern_konzept_abschliessen` — nur mit **Lernnachweis**
  (korrekte Antworten über alle 5 Stufen in `lern_antworten`). `capital_grants` hat **keine**
  INSERT-Policy für `authenticated` → kein Self-Granting. Idempotenz über Unique-Constraint
  (`profile_id, reason, ref_id`). Die frühere RPC `complete_module` wurde entfernt;
  `lern_stufe_abgeschlossen` ist für Clients gesperrt (REVOKE).
- **Interne Funktionen:** SECURITY-DEFINER-Helfer (`portfolio_value_cents`, `grant_capital`,
  `snapshot_all_portfolios`, `trigger_update_prices`) sind per REVOKE nicht von Clients aufrufbar.
- **Rollen:** `profiles.role` ist nach der Anlage für Clients unveränderlich (Trigger
  `profiles_prevent_role_change`); `join_class` akzeptiert nur `child`/`student`.
- **Ranglisten:** werden serverseitig in der Edge Function `ranking-recompute` berechnet und in
  `rankings` geschrieben – nie im Client. Beide Cron-Functions verlangen zwingend das Shared
  Secret (`x-cron-secret`, fail-closed, timing-sicherer Vergleich).

## Kinderschutz (in der DB erzwungen)
- **RLS auf allen Tabellen.** Kind sieht nur Eigenes. Geprüft per RLS-Tests (siehe `supabase/README.md`).
- **Eltern:** lesen Lernfortschritt + Depot**entwicklung** des Kindes, **nicht** dessen Orders;
  können das Depot **nicht** verändern. Verknüpfung nur mit **Freigabe des Kindes**
  (`respond_to_parent_link`).
- **Lehrer:** sehen ausschließlich **Aggregate** der Klasse über `class_overview` (SECURITY DEFINER,
  nur der Lehrer der Klasse) – keine Einzelorders, keine privaten Familieninfos.
- **Inhalte:** keine Brokerlinks, keine Werbung, keine Anlageempfehlungen, kein Chat im Kindermodus.
  Automatisch geprüft durch `auditChildContent()` (Test in `packages/content/src/guard.test.ts`).
- Keine Klarnamenpflicht; Anzeigename frei wählbar; kein echtes Geld.

## Erfolgskriterien (MVP) → Datenquellen
| Kriterium | Datenquelle |
|---|---|
| Aktivierung (Profil + Grundstück + 5.000 € + erste Order) | `profiles`, `portfolios`, `orders` |
| ≥ 3 Lernmodule in 7 Tagen | `learning_progress.completed_at` |
| Elternbindung (mind. 1 Verknüpfung) | `parent_child_links.status = 'approved'` |
| Depotverständnis (Aktie/ETF/Cash/Gebühr/G&V) | `orders`, `holdings`, `learning_progress` |
| Schulnutzung (Klasse startet + Challenge) | `classes`, `class_members` |

Auswertung erfolgt später über Reporting/Analytics; die Datengrundlage ist vorhanden.
