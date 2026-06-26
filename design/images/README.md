# Screenshots des aktuellen Stands

Diese Bilder zeigen den **aktuellen** Stand der App (mobile, 390 px – Navy/Gold-Tokens,
Space Grotesk/Inter, Mission-Board-Layout) und dienen Claude Design als Baseline.

Erwartete Dateinamen:

| Datei | Screen |
|---|---|
| `01-onboarding.png` | Onboarding / Auth (Rollenwahl) |
| `02-kids-home.png` | Start – „Dein Finanztraining heute" (Daily Finance Workout) |
| `03-learn.png` | Lernen (Wissenslevel, XP, Auszeichnungen, tägliche Mini-Aufgabe) |
| `04-depot.png` | Depot (Musterdepot, Positionen, Entscheidungsjournal) |
| `05-discover.png` | Werte (Aktien/ETFs als Lernbeispiele) |
| `06-classroom.png` | Classroom – Lehrer-Dashboard (Klasse, Aggregate, Module zuweisen) |
| `07-league.png` | Ligen & Challenges (Performance/Gesamtkapital/Wissensliga) |

## So bekommst du frische Screenshots (ein Befehl)

Reproduzierbar über `../shoot.mjs` (Playwright). Voraussetzungen: lokaler Supabase läuft,
Seed-User vorhanden (`node apps/app/scripts/seed-test-users.mjs`).

```bash
# aus dem Repo-Root (hofino/)
cd apps/app && CI=1 ./node_modules/.bin/expo export --platform web && cd ../..
python3 -m http.server 8099 --directory apps/app/dist &   # serviert den Build
pnpm dlx playwright install chromium                      # einmalig
node design/shoot.mjs
```

Danach in **claude.ai/design**: `../DESIGN_BRIEF.md` als Auftrag einfügen **und diese Bilder
anhängen**.
