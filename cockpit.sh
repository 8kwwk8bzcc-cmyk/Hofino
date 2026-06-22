#!/usr/bin/env bash
# Startet das Hofino-Test-Cockpit komplett und öffnet es im Browser.
# Aufruf:  ./cockpit.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Node/pnpm verfügbar machen (nvm), falls die Shell es nicht geladen hat.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true

echo "▶ Supabase starten (falls nötig)…"
pnpm exec supabase start >/dev/null 2>&1 || pnpm exec supabase start || true

echo "▶ Test-Nutzer anlegen…"
node apps/app/scripts/seed-test-users.mjs

echo "▶ Cockpit bauen…"
( cd apps/app && pnpm cockpit >/dev/null )

echo "▶ Server starten (Port 8099)…"
# alten Server auf 8099 beenden, dann neu starten
lsof -ti tcp:8099 2>/dev/null | xargs kill -9 2>/dev/null || true
( cd apps/app/dist && nohup python3 -m http.server 8099 >/tmp/hofino-cockpit.log 2>&1 & )
sleep 1

URL="http://localhost:8099/cockpit.html"
echo "✓ Cockpit läuft: $URL"
open "$URL" 2>/dev/null || echo "  Bitte im Browser öffnen: $URL"
echo "  (Server stoppen: lsof -ti tcp:8099 | xargs kill)"
