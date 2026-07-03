-- ─────────────────────────────────────────────────────────────────────────────
-- M1: Der stündliche Kurs-Cron ruft die Edge-Function mit einem Shared Secret auf.
-- Die Function (verify_jwt=false) akzeptiert den Aufruf nur mit passendem Header
-- x-cron-secret. URL und Secret liegen im Supabase Vault (verschlüsselt, nicht im
-- Repo): `hofino_functions_url` und `hofino_cron_secret`. Sind sie nicht gesetzt
-- (z. B. lokal), bleibt der Trigger inert. Der postgres-Rolle fehlt das Recht für
-- `alter database ... set`, daher Vault statt GUC.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.trigger_update_prices()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_base   text;
  v_secret text;
begin
  select decrypted_secret into v_base   from vault.decrypted_secrets where name = 'hofino_functions_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'hofino_cron_secret';
  if v_base is null or v_base = '' then return; end if;
  perform net.http_post(
    url := v_base || '/update-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(v_secret, '')
    ),
    body := '{}'::jsonb
  );
end $$;
