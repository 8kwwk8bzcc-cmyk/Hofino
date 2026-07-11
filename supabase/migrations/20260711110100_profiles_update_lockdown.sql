-- ─────────────────────────────────────────────────────────────────────────────
-- Härtung zu Paket B: `profiles_own` ist FOR ALL — ein manipulierter Client
-- könnte sein eigenes consent_status='approved' setzen. Die App schreibt
-- Profile nach dem Insert nie direkt (Änderungen laufen künftig über RPCs),
-- daher UPDATE/DELETE für Clients komplett entziehen. security-definer-RPCs
-- (laufen als Owner) bleiben unberührt.
-- ─────────────────────────────────────────────────────────────────────────────
revoke update, delete on table public.profiles from anon, authenticated;
