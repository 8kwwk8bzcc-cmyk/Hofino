-- ─────────────────────────────────────────────────────────────────────────────
-- Regression-Fix: Das UPDATE-Lockdown auf profiles (20260711110100) hat auch
-- das legitime Setzen von tutorial_done durch den Client blockiert — das
-- Willkommens-Tutorial erschien nach jedem Reload erneut. Eigene RPC, die NUR
-- dieses eine Feld am eigenen Profil setzt.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.tutorial_abschliessen()
returns void language sql security definer set search_path = public as $$
  update profiles set tutorial_done = true where auth_user_id = auth.uid();
$$;

revoke execute on function public.tutorial_abschliessen() from public, anon;
grant execute on function public.tutorial_abschliessen() to authenticated;
