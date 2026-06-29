#!/usr/bin/env bash
# Heimnetz-Test: baut die Web-App so, dass sie das LOKALE Supabase über die
# WLAN-IP dieses Macs anspricht, und serviert sie im LAN. Dein Sohn öffnet dann
# auf seinem Gerät die am Ende ausgegebene URL (gleiches WLAN nötig).
#
#   bash apps/app/scripts/lan-test.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."   # -> apps/app

PORT=8099
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [ -z "$IP" ]; then echo "Keine WLAN-IP gefunden. Bist du im WLAN?"; exit 1; fi
echo "WLAN-IP: $IP"

echo "==> Supabase-Status (muss laufen)"
( cd .. && pnpm exec supabase status >/dev/null 2>&1 ) || { echo "Supabase läuft nicht. Erst: pnpm exec supabase start"; exit 1; }

echo "==> Web-Build (Backend = http://$IP:54321)"
rm -rf .expo
EXPO_PUBLIC_SUPABASE_URL="http://$IP:54321" \
EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON" \
CI=1 ./node_modules/.bin/expo export --platform web --clear >/dev/null

# Alten Server auf dem Port beenden, frischen starten
lsof -ti tcp:"$PORT" 2>/dev/null | xargs kill 2>/dev/null || true
echo "==> Server startet auf Port $PORT (Strg+C beendet)"
echo ""
echo "   Auf dem Gerät deines Sohnes (gleiches WLAN) öffnen:"
echo "   >>>  http://$IP:$PORT/  <<<"
echo ""
echo "   Test-Login (oder neu registrieren als Kind):"
echo "   E-Mail: mia@hofino.test   Passwort: hofino-dev-123"
echo ""
exec /usr/bin/python3 scripts/serve-utf8.py "$PORT" dist
