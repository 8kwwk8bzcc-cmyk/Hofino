-- ─────────────────────────────────────────────────────────────────────────────
-- Onboarding-Tutorial dauerhaft als „erledigt" merken – pro Nutzer, serverseitig,
-- damit es nach einmaligem Durchlaufen NICHT erneut erscheint (auch gerätewechsel-
-- und plattformübergreifend; localStorage gibt es auf nativen Clients nicht).
-- Der Nutzer darf das eigene Profil per RLS-Policy `profiles_own` selbst schreiben.
-- ─────────────────────────────────────────────────────────────────────────────
alter table profiles add column if not exists tutorial_done boolean not null default false;
