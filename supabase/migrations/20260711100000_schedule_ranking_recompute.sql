-- ─────────────────────────────────────────────────────────────────────────────
-- Ranking-Cron: `ranking-recompute` lief bisher nur manuell — die Ranglisten
-- (Performance, Gesamtkapital, Wissensliga) veralteten in der Cloud. Gleiche
-- Mechanik wie der Kurs-Cron (M1): URL + Shared Secret aus dem Vault
-- (`hofino_functions_url` / `hofino_cron_secret`); ohne Vault-Einträge (lokal)
-- bleibt der Trigger inert. Minute 5, damit der Kurs-Update (Minute 0) vorher
-- fertig ist; Wissens-XP ändern sich auch außerhalb der Handelszeit, daher
-- rund um die Uhr stündlich.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.trigger_ranking_recompute()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_base   text;
  v_secret text;
begin
  select decrypted_secret into v_base   from vault.decrypted_secrets where name = 'hofino_functions_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'hofino_cron_secret';
  if v_base is null or v_base = '' then return; end if;
  perform net.http_post(
    url := v_base || '/ranking-recompute',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(v_secret, '')
    ),
    body := '{}'::jsonb
  );
end $$;

revoke execute on function public.trigger_ranking_recompute() from public, anon, authenticated;

select cron.schedule('hofino-ranking-recompute', '5 * * * *', $$select public.trigger_ranking_recompute()$$);
