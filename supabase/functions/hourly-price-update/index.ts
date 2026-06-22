// Edge Function (Cron, stündlich): schreibt für jedes Instrument einen price_snapshot
// über den aktiven MarketDataProvider (MVP = deterministischer Simulator).
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  DEFAULT_VOLATILITY,
  deriveBaseCents,
  floorToHourMs,
  priceAtCents,
} from "../_shared/price-model.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: instruments, error } = await sb.from("instruments").select("id");
  if (error) return json({ error: error.message }, 500);

  const atMs = floorToHourMs(Date.now());
  const asOf = new Date(atMs).toISOString();
  const rows = (instruments ?? []).map((i: { id: string }) => ({
    instrument_id: i.id,
    price_cents: priceAtCents(i.id, deriveBaseCents(i.id), DEFAULT_VOLATILITY, atMs),
    as_of: asOf,
  }));

  const { error: upErr } = await sb
    .from("price_snapshots")
    .upsert(rows, { onConflict: "instrument_id,as_of" });
  if (upErr) return json({ error: upErr.message }, 500);

  return json({ ok: true, instruments: rows.length, as_of: asOf });
});
