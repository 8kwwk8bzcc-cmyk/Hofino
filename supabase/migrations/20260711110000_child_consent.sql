-- ─────────────────────────────────────────────────────────────────────────────
-- Kinderkonten (AUTH.md, Paket B): Einwilligungs-Status am Profil.
-- Selbst registrierte Kinder starten mit consent_status='pending' und einer
-- 7-Tage-Frist; die Eltern-Bestätigung (Paket C) setzt 'approved'. Ein
-- BEFORE-INSERT-Trigger erzwingt das serverseitig — ein manipulierter Client
-- kann sich kein 'approved' geben. service_role (Seeds, Eltern-legt-Kind-an,
-- Paket D) darf den Status frei setzen.
-- ─────────────────────────────────────────────────────────────────────────────
alter table profiles
  add column consent_status text not null default 'approved'
    check (consent_status in ('approved', 'pending', 'blocked')),
  add column consent_source text
    check (consent_source in ('parent', 'school', 'self_adult')),
  add column consent_parent_email text,
  add column consent_deadline timestamptz,
  add column consent_confirmed_at timestamptz,
  add column consent_text_version text;

create or replace function public.enforce_child_consent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'child' and coalesce(auth.role(), '') <> 'service_role' then
    new.consent_status := 'pending';
    new.consent_source := 'parent';
    new.consent_deadline := now() + interval '7 days';
    new.consent_confirmed_at := null;
  end if;
  return new;
end $$;

revoke execute on function public.enforce_child_consent() from public, anon, authenticated;

create trigger profiles_child_consent
  before insert on profiles
  for each row execute function public.enforce_child_consent();
