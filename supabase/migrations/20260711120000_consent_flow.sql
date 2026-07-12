-- ─────────────────────────────────────────────────────────────────────────────
-- Paket C (AUTH.md): Eltern-Bestätigungsflow.
-- 1) Mail-Tracking-Spalten für den Sweep (Erst-Mail, Erinnerung).
-- 2) RPCs: Eltern sehen offene Einwilligungen (Match über ihre Login-E-Mail),
--    bestätigen sie (setzt approved + Family-Link) — beides security definer,
--    da Eltern fremde Kind-Profile sonst nicht lesen/schreiben dürfen.
-- 3) Blocked-Härtung: Schreib-Trigger auf orders/lern_antworten/trade_decisions
--    lehnen gesperrte Konten serverseitig ab (nicht nur UI).
-- 4) Stündlicher Cron ruft die Edge Function `consent-sweep` (Vault-Muster).
-- ─────────────────────────────────────────────────────────────────────────────
alter table profiles
  add column consent_mail_sent_at timestamptz,
  add column consent_reminded_at timestamptz;

-- ── RPC: offene Einwilligungen des angemeldeten Elternteils ────────────────
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
  return query
    select p.id, p.display_name, p.consent_deadline, p.created_at
    from profiles p
    where p.role = 'child'
      and p.consent_status in ('pending', 'blocked')
      and lower(coalesce(p.consent_parent_email, '')) = v_caller_email
    order by p.created_at;
end $$;

-- ── RPC: Einwilligung bestätigen (+ Family-Link) ───────────────────────────
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
  update profiles p
     set consent_status = 'approved',
         consent_confirmed_at = now()
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

-- ── RPC: Kind fordert die Eltern-Mail erneut an (max. 1×/Stunde) ───────────
create or replace function public.einwilligung_mail_anfordern()
returns void language plpgsql security definer set search_path = public as $$
begin
  update profiles p
     set consent_mail_sent_at = null,
         consent_reminded_at = null
   where p.auth_user_id = auth.uid()
     and p.role = 'child'
     and p.consent_status in ('pending', 'blocked')
     and (p.consent_mail_sent_at is null or p.consent_mail_sent_at < now() - interval '1 hour');
end $$;

revoke execute on function public.offene_einwilligungen() from public, anon;
revoke execute on function public.einwilligung_bestaetigen(uuid) from public, anon;
revoke execute on function public.einwilligung_mail_anfordern() from public, anon;
grant execute on function public.offene_einwilligungen() to authenticated;
grant execute on function public.einwilligung_bestaetigen(uuid) to authenticated;
grant execute on function public.einwilligung_mail_anfordern() to authenticated;

-- ── Blocked-Härtung: zentrale Prüfung + Trigger auf Schreibpfaden ──────────
create or replace function public.reject_blocked_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  select consent_status into v_status from profiles where id = new.profile_id;
  if v_status = 'blocked' then
    raise exception 'Konto gesperrt – die Eltern-Bestätigung fehlt.';
  end if;
  return new;
end $$;

-- orders hat kein profile_id (hängt am Portfolio) → eigene Variante.
create or replace function public.reject_blocked_portfolio()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  select p.consent_status into v_status
  from portfolios pf join profiles p on p.id = pf.profile_id
  where pf.id = new.portfolio_id;
  if v_status = 'blocked' then
    raise exception 'Konto gesperrt – die Eltern-Bestätigung fehlt.';
  end if;
  return new;
end $$;

revoke execute on function public.reject_blocked_profile() from public, anon, authenticated;
revoke execute on function public.reject_blocked_portfolio() from public, anon, authenticated;

create trigger orders_reject_blocked before insert on orders
  for each row execute function public.reject_blocked_portfolio();
create trigger lern_antworten_reject_blocked before insert on lern_antworten
  for each row execute function public.reject_blocked_profile();
create trigger trade_decisions_reject_blocked before insert on trade_decisions
  for each row execute function public.reject_blocked_profile();

-- ── Cron: consent-sweep stündlich (Minute 10), Vault-Muster wie Kurse ──────
create or replace function public.trigger_consent_sweep()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_base   text;
  v_secret text;
begin
  select decrypted_secret into v_base   from vault.decrypted_secrets where name = 'hofino_functions_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'hofino_cron_secret';
  if v_base is null or v_base = '' then return; end if;
  perform net.http_post(
    url := v_base || '/consent-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(v_secret, '')
    ),
    body := '{}'::jsonb
  );
end $$;

revoke execute on function public.trigger_consent_sweep() from public, anon, authenticated;

select cron.schedule('hofino-consent-sweep', '10 * * * *', $$select public.trigger_consent_sweep()$$);
