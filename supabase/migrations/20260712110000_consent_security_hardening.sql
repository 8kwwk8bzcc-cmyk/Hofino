-- ─────────────────────────────────────────────────────────────────────────────
-- Härtung nach Security-Review (2026-07-12):
-- 1) Eltern-Bestätigung nur mit VERIFIZIERTER E-Mail: sonst könnte sich ein
--    Kind ein Zweitkonto mit der selbst angegebenen "Eltern"-Adresse anlegen
--    und die eigene Einwilligung bestätigen. Mit aktivem Autoconfirm (Dev)
--    ist jede Mail als bestätigt markiert — die Prüfung greift automatisch
--    scharf, sobald die E-Mail-Bestätigung vor dem Launch eingeschaltet wird.
-- 2) consent_blocked_at: die 30-Tage-Löschfrist misst ab der tatsächlichen
--    Sperre statt indirekt über die (ältere) Bestätigungsfrist.
-- 3) display_name serverseitig auf 1–40 Zeichen begrenzen.
-- ─────────────────────────────────────────────────────────────────────────────
alter table profiles add column consent_blocked_at timestamptz;

alter table profiles add constraint profiles_display_name_len
  check (char_length(display_name) between 1 and 40);

-- Hilfsfunktion: hat der Aufrufer eine bestätigte E-Mail-Adresse?
create or replace function public.caller_email_verified()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;
revoke execute on function public.caller_email_verified() from public, anon;
grant execute on function public.caller_email_verified() to authenticated;

create or replace function public.offene_einwilligungen()
returns table (child_profile_id uuid, display_name text, deadline timestamptz, registered_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_caller_role  user_role;
begin
  select p.role into v_caller_role from profiles p where p.auth_user_id = auth.uid();
  if v_caller_role not in ('parent', 'adult') or v_caller_email = '' then
    return;
  end if;
  if not public.caller_email_verified() then
    return;
  end if;
  return query
    select p.id, p.display_name, p.consent_deadline, p.created_at
    from profiles p
    where p.role = 'child'
      and p.consent_status in ('pending', 'blocked')
      and lower(coalesce(p.consent_parent_email, '')) = v_caller_email
    order by p.created_at;
end $$;

create or replace function public.einwilligung_bestaetigen(p_child uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_parent_id    uuid;
  v_caller_role  user_role;
begin
  select p.id, p.role into v_parent_id, v_caller_role from profiles p where p.auth_user_id = auth.uid();
  if v_parent_id is null or v_caller_role not in ('parent', 'adult') then
    raise exception 'Nur Eltern-Konten können Einwilligungen bestätigen.';
  end if;
  if not public.caller_email_verified() then
    raise exception 'Bitte bestätige zuerst deine E-Mail-Adresse.';
  end if;
  update profiles p
     set consent_status = 'approved',
         consent_confirmed_at = now(),
         consent_blocked_at = null
   where p.id = p_child
     and p.role = 'child'
     and p.consent_status in ('pending', 'blocked')
     and lower(coalesce(p.consent_parent_email, '')) = v_caller_email;
  if not found then
    raise exception 'Keine offene Einwilligung für dieses Kind unter deiner E-Mail-Adresse.';
  end if;
  insert into parent_child_links (parent_profile_id, child_profile_id, status)
  values (v_parent_id, p_child, 'approved')
  on conflict (parent_profile_id, child_profile_id) do update set status = 'approved';
end $$;
