# Screenshots des aktuellen Stands

Lege hier die 6 Screenshots ab, die im Brief (`../DESIGN_BRIEF.md`, Anhang A) referenziert werden.
Sie zeigen den **heutigen** Stand der App (mobile, 375 px) und dienen ChatGPT als Baseline.

Erwartete Dateinamen:

| Datei | Screen |
|---|---|
| `01-onboarding.png` | Onboarding / Auth |
| `02-kids-home.png` | Kinder-Zuhause (Haus-System) |
| `03-learn.png` | Lernen (Level, XP, Auszeichnungen, Konzepte) |
| `04-depot.png` | Depot |
| `05-discover.png` | Entdecken |
| `06-classroom.png` | Classroom (Lehrer-Dashboard) |

**So bekommst du frische Screenshots selbst** (lokaler Stand):
1. Supabase + Cockpit starten: `./cockpit.sh` (öffnet `http://localhost:8099/cockpit.html`).
2. Test-Login z. B. `mia@hofino.test` (Kind), `lehrer@hofino.test` (Lehrer), PW `hofino-dev-123`.
3. Im Browser auf Mobilbreite stellen (DevTools → Device Toolbar, iPhone) und je Screen einen
   Screenshot machen, hier mit obigen Namen ablegen.

Danach im ChatGPT-Chat: `DESIGN_BRIEF.md` einfügen **und diese 6 Bilder anhängen**.
