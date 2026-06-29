// Edge Function `update-prices` (Cron, stündlich): aktualisiert zentral & serverseitig
// die Kurse aller aktiven Instrumente über die per Env gewählte MarketDataSource.
// Schreibt prices (Upsert, aktueller Kurs) + price_snapshots (Append, Zeitreihe).
// Läuft nur während der Xetra-Handelszeit (DST-sicher im Code). Service-Role-Key,
// kein Secret gelangt je in den Client.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { floorToHourMs } from "../_shared/price-model.ts";
import { createMarketDataSource } from "../_shared/market-source.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Xetra: Mo–Fr 09:00–17:30 Europe/Berlin. Über Intl ist Sommer-/Winterzeit automatisch korrekt.
function isXetraOpen(d = new Date()): boolean {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  if (parts.weekday === "Sat" || parts.weekday === "Sun") return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 9 * 60 && minutes <= 17 * 60 + 30;
}

Deno.serve(async (req) => {
  // ?force=1 erlaubt manuelles Auslösen außerhalb der Handelszeit (lokaler Test).
  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!force && !isXetraOpen()) {
    return json({ ok: true, skipped: true, reason: "outside_trading_hours" });
  }

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: instruments, error } = await sb
    .from("instruments")
    .select("id, ticker, provider_symbol, base_price_cents")
    .eq("is_active", true);
  if (error) return json({ error: error.message }, 500);

  // Quellen-Symbol → Instrument-ID + kuratierter Basiskurs (für den Simulator).
  // Fällt auf ticker zurück, wenn kein provider_symbol gesetzt ist.
  const symbolToId = new Map<string, string>();
  const baseBySymbol: Record<string, number> = {};
  for (const i of instruments ?? []) {
    const sym = (i.provider_symbol ?? i.ticker) as string | null;
    if (!sym) continue;
    symbolToId.set(sym, i.id as string);
    if (i.base_price_cents != null) baseBySymbol[sym] = Number(i.base_price_cents);
  }
  const total = symbolToId.size;

  const source = createMarketDataSource(Deno.env.get("MARKET_DATA_SOURCE"), {
    TWELVEDATA_API_KEY: Deno.env.get("TWELVEDATA_API_KEY") ?? undefined,
  });

  let quotes;
  try {
    quotes = await source.fetchQuotes([...symbolToId.keys()], baseBySymbol);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }

  // Auf die volle Stunde normieren, damit der Snapshot-PK (instrument_id, as_of) stabil ist.
  const asOf = new Date(floorToHourMs(Date.now())).toISOString();
  const nowIso = new Date().toISOString();
  const priceRows: Record<string, unknown>[] = [];
  const snapRows: Record<string, unknown>[] = [];
  for (const q of quotes) {
    const id = symbolToId.get(q.providerSymbol);
    if (!id) continue;
    priceRows.push({ instrument_id: id, price_cents: q.priceCents, as_of: asOf, source: source.name, updated_at: nowIso });
    snapRows.push({ instrument_id: id, price_cents: q.priceCents, as_of: asOf, source: source.name });
  }
  // Fallback: Instrumente ohne gültigen Kurs bleiben unverändert (kein Überschreiben mit NULL).
  const failed = total - priceRows.length;

  if (priceRows.length) {
    const up = await sb.from("prices").upsert(priceRows, { onConflict: "instrument_id" });
    if (up.error) return json({ error: up.error.message }, 500);
    const snap = await sb.from("price_snapshots").upsert(snapRows, { onConflict: "instrument_id,as_of" });
    if (snap.error) return json({ error: snap.error.message }, 500);
  }

  console.log(`update-prices source=${source.name} updated=${priceRows.length} failed=${failed} as_of=${asOf}`);
  return json({ ok: true, source: source.name, updated: priceRows.length, failed, as_of: asOf });
});
