// Edge Function (Cron): berechnet die Ranglisten serverseitig (Manipulationsschutz)
// und aktualisiert die Tabelle `rankings`. Drei Wertungen: Performance, Gesamtkapital, Wissen.
import { createClient } from "jsr:@supabase/supabase-js@2";

const START_CAPITAL_CENTS = 500_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

interface Entry {
  profileId: string;
  score: number;
}

/** Competition-Ranking: gleiche Scores teilen sich den Rang. */
function ranked(entries: Entry[], kind: string) {
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  let prevScore: number | null = null;
  let prevRank = 0;
  return sorted.map((e, i) => {
    const rank = prevScore !== null && e.score === prevScore ? prevRank : i + 1;
    prevScore = e.score;
    prevRank = rank;
    return { kind, scope: "global", scope_ref: null, profile_id: e.profileId, score: e.score, rank };
  });
}

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Wissensliga = lebenslange XP aus dem Lern-Kern (lern_status.xp_gesamt); die alten
  // Tabellen learning_progress/knowledge_points werden nicht mehr befüllt (abgelöst 2026-06-27).
  const [portfolios, holdings, grants, points] = await Promise.all([
    sb.from("portfolios").select("owner_profile_id, cash_cents, id"),
    sb.from("holdings").select("portfolio_id, instrument_id, quantity"),
    sb.from("capital_grants").select("profile_id, amount_cents"),
    sb.from("lern_status").select("profile_id, xp_gesamt"),
  ]);
  for (const r of [portfolios, holdings, grants, points]) {
    if (r.error) return json({ error: r.error.message }, 500);
  }

  // Jüngste Kurse (alle Snapshots tragen dieselbe as_of pro Lauf).
  const latest = await sb
    .from("price_snapshots")
    .select("as_of")
    .order("as_of", { ascending: false })
    .limit(1);
  if (latest.error) return json({ error: latest.error.message }, 500);
  const asOf = latest.data?.[0]?.as_of;
  const priceByInstrument = new Map<string, number>();
  if (asOf) {
    const prices = await sb
      .from("price_snapshots")
      .select("instrument_id, price_cents")
      .eq("as_of", asOf);
    if (prices.error) return json({ error: prices.error.message }, 500);
    for (const p of prices.data ?? []) priceByInstrument.set(p.instrument_id, p.price_cents);
  }

  const holdingsByPortfolio = new Map<string, { instrument_id: string; quantity: number }[]>();
  for (const h of holdings.data ?? []) {
    const arr = holdingsByPortfolio.get(h.portfolio_id) ?? [];
    arr.push(h);
    holdingsByPortfolio.set(h.portfolio_id, arr);
  }
  const grantsByProfile = new Map<string, number>();
  for (const g of grants.data ?? []) {
    grantsByProfile.set(g.profile_id, (grantsByProfile.get(g.profile_id) ?? 0) + g.amount_cents);
  }
  const pointsByProfile = new Map<string, number>();
  for (const p of points.data ?? []) {
    pointsByProfile.set(p.profile_id, p.xp_gesamt ?? 0);
  }

  const totalCapital: Entry[] = [];
  const performance: Entry[] = [];
  for (const po of portfolios.data ?? []) {
    let equity = po.cash_cents;
    for (const h of holdingsByPortfolio.get(po.id) ?? []) {
      equity += (priceByInstrument.get(h.instrument_id) ?? 0) * h.quantity;
    }
    totalCapital.push({ profileId: po.owner_profile_id, score: equity });
    const basis = START_CAPITAL_CENTS + (grantsByProfile.get(po.owner_profile_id) ?? 0);
    performance.push({
      profileId: po.owner_profile_id,
      score: basis > 0 ? ((equity - basis) / basis) * 100 : 0,
    });
  }
  const knowledge: Entry[] = [...pointsByProfile.entries()].map(([profileId, score]) => ({
    profileId,
    score,
  }));

  const rows = [
    ...ranked(performance, "performance"),
    ...ranked(totalCapital, "total_capital"),
    ...ranked(knowledge, "knowledge"),
  ].map((r) => ({ ...r, computed_at: new Date().toISOString() }));

  const del = await sb.from("rankings").delete().eq("scope", "global");
  if (del.error) return json({ error: del.error.message }, 500);
  if (rows.length > 0) {
    const ins = await sb.from("rankings").insert(rows);
    if (ins.error) return json({ error: ins.error.message }, 500);
  }

  return json({ ok: true, ranked: rows.length });
});
