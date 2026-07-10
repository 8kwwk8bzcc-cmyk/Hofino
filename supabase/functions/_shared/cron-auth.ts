// Shared-Secret-Prüfung für Cron-getriggerte Edge Functions (fail-closed).
// Ohne gesetztes CRON_SECRET wird der Aufruf abgelehnt (503) — nie "offen".
// Vergleich in konstanter Zeit (kein Timing-Seitenkanal).

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  // Längenunterschied nicht früh verraten: immer über die volle Länge XOR-en.
  const len = Math.max(ba.length, bb.length);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/** Prüft x-cron-secret gegen CRON_SECRET. Gibt bei Erfolg null zurück, sonst eine Response. */
export function requireCronSecret(req: Request): Response | null {
  const secret = Deno.env.get("CRON_SECRET");
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (!secret) {
    // Fail-closed: Fehlkonfiguration darf die Function nicht öffentlich machen.
    // Lokal: `CRON_SECRET` in supabase/functions/.env setzen (siehe LOCAL_DEV.md).
    return json({ error: "cron_secret_not_configured" }, 503);
  }
  const given = req.headers.get("x-cron-secret") ?? "";
  if (!timingSafeEqual(given, secret)) {
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}
