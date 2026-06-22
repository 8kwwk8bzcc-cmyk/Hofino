# SECURITY.md – Kinderschutz & Manipulationsschutz

Diese Schutzmaßnahmen sind umgesetzt und (lokal) getestet. Sie ergänzen `CLAUDE.md §2/§3`.

## Manipulationsschutz (serverseitig)
- **Order-Ausführung:** nur über die RPC `place_order` (SECURITY DEFINER). Preis kommt aus
  `price_snapshots` der DB, Gebühr (5 €) ist serverseitig fix, Menge wird validiert, Cash/Holdings/
  Order werden atomar gebucht. Der Client kann weder Preis noch Gebühr setzen.
- **Lernkapital & Wissenspunkte:** nur über die RPC `complete_module`. `capital_grants` und
  `knowledge_points` haben **keine** INSERT-Policy für `authenticated` → kein Self-Granting.
  Idempotenz über Unique-Constraints (`profile_id, reason/source, ref_id`).
- **Ranglisten:** werden serverseitig in der Edge Function `ranking-recompute` berechnet und in
  `rankings` geschrieben – nie im Client.

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
