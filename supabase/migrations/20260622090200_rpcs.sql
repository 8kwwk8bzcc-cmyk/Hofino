-- Hofino – serverseitige, atomare Operationen (Manipulationsschutz).
-- Order-Ausführung und Modul-Abschluss laufen NICHT als Client-Schreibzugriffe,
-- sondern als SECURITY-DEFINER-Funktionen mit Prüfung des aufrufenden Profils.

-- Modul → Themenblock (Referenz für Themenblock-/Meilenstein-Belohnungen, spiegelt packages/content).
create table content_blocks (
  module_id text primary key,
  block     text not null
);
insert into content_blocks (module_id, block) values
  ('m01','geld'), ('m02','geld'), ('m03','geld'), ('m04','geld'),
  ('m05','unternehmen'), ('m06','unternehmen'), ('m07','unternehmen'),
  ('m08','unternehmen'), ('m09','unternehmen'), ('m10','unternehmen'),
  ('m11','etf-risiko'), ('m12','etf-risiko'), ('m13','etf-risiko'), ('m14','etf-risiko'),
  ('m15','depot-langfristig'), ('m16','depot-langfristig'), ('m17','depot-langfristig'),
  ('m18','depot-langfristig'), ('m19','depot-langfristig'), ('m20','depot-langfristig');

alter table content_blocks enable row level security;
create policy content_blocks_read on content_blocks for select to authenticated using (true);
grant select on content_blocks to authenticated;

-- Hilfsfunktion: Profil-ID des aufrufenden Auth-Nutzers.
create or replace function public.caller_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1
$$;

-- Lernkapital idempotent gewähren; gibt den tatsächlich gutgeschriebenen Betrag zurück.
create or replace function public.grant_capital(p_profile uuid, p_reason text, p_ref text, p_amount bigint)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  insert into capital_grants (profile_id, reason, ref_id, amount_cents)
    values (p_profile, p_reason, p_ref, p_amount);
  return p_amount;
exception
  when unique_violation then return 0;
end $$;

-- Wissenspunkte idempotent vergeben.
create or replace function public.award_points(p_profile uuid, p_source text, p_ref text, p_points int)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into knowledge_points (profile_id, points, source, ref_id)
    values (p_profile, p_points, p_source, p_ref);
exception
  when unique_violation then null;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Order ausführen: Preis aus price_snapshots, 5 € Gebühr, ganze Stücke, atomar.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.place_order(p_instrument uuid, p_side order_side, p_qty int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_pf portfolios;
  v_price bigint;
  v_fee bigint := 500;
  v_gross bigint;
  v_hold holdings;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  if p_qty <= 0 then return jsonb_build_object('ok', false, 'reason', 'invalid_quantity'); end if;

  select * into v_pf from portfolios where owner_profile_id = v_profile;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_portfolio'); end if;

  select price_cents into v_price from price_snapshots
    where instrument_id = p_instrument order by as_of desc limit 1;
  if v_price is null then return jsonb_build_object('ok', false, 'reason', 'no_price'); end if;

  v_gross := v_price * p_qty;
  select * into v_hold from holdings where portfolio_id = v_pf.id and instrument_id = p_instrument;

  if p_side = 'buy' then
    if v_pf.cash_cents < v_gross + v_fee then
      return jsonb_build_object('ok', false, 'reason', 'insufficient_funds');
    end if;
    update portfolios set cash_cents = cash_cents - (v_gross + v_fee) where id = v_pf.id;
    if v_hold.portfolio_id is not null then
      update holdings set
        avg_cost_cents = round(
          (v_hold.avg_cost_cents * v_hold.quantity + v_price * p_qty)::numeric / (v_hold.quantity + p_qty)
        ),
        quantity = v_hold.quantity + p_qty
      where portfolio_id = v_pf.id and instrument_id = p_instrument;
    else
      insert into holdings (portfolio_id, instrument_id, quantity, avg_cost_cents)
        values (v_pf.id, p_instrument, p_qty, v_price);
    end if;
  else
    if v_hold.portfolio_id is null or v_hold.quantity < p_qty then
      return jsonb_build_object('ok', false, 'reason', 'insufficient_holdings');
    end if;
    update portfolios set cash_cents = cash_cents + (v_gross - v_fee) where id = v_pf.id;
    if v_hold.quantity = p_qty then
      delete from holdings where portfolio_id = v_pf.id and instrument_id = p_instrument;
    else
      update holdings set quantity = v_hold.quantity - p_qty
        where portfolio_id = v_pf.id and instrument_id = p_instrument;
    end if;
  end if;

  insert into orders (portfolio_id, instrument_id, side, quantity, price_cents, fee_cents)
    values (v_pf.id, p_instrument, p_side, p_qty, v_price, v_fee);

  return jsonb_build_object('ok', true, 'price_cents', v_price);
end $$;
grant execute on function public.place_order(uuid, order_side, int) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Modul abschließen: Lernfortschritt + Lernkapital + Wissenspunkte (idempotent),
-- inkl. Themenblock- und Meilenstein-Belohnung; Lernkapital wird dem Cash gutgeschrieben.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.complete_module(p_module text, p_correct int, p_total int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_passed boolean;
  v_perfect boolean;
  v_score int;
  v_added bigint := 0;
  v_block text;
  v_block_ids text[];
  v_done_in_block int;
  v_total_modules int;
  v_done_total int;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  if p_total <= 0 then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;

  v_score := round(100.0 * p_correct / p_total);
  v_passed := p_correct::numeric / p_total >= 0.6;
  v_perfect := p_correct = p_total;

  insert into learning_progress (profile_id, module_id, completed_at, quiz_score, perfect)
    values (v_profile, p_module, now(), v_score, v_perfect)
    on conflict (profile_id, module_id) do update
      set completed_at = now(),
          quiz_score = greatest(learning_progress.quiz_score, excluded.quiz_score),
          perfect = learning_progress.perfect or excluded.perfect;

  v_added := v_added + public.grant_capital(v_profile, 'module_done', p_module, 50000);
  perform public.award_points(v_profile, 'module_done', p_module, 100);
  if v_passed then perform public.award_points(v_profile, 'quiz_passed', p_module, 50); end if;
  if v_perfect then
    v_added := v_added + public.grant_capital(v_profile, 'quiz_perfect', p_module, 50000);
    perform public.award_points(v_profile, 'quiz_perfect_bonus', p_module, 100);
  end if;

  -- Themenblock abgeschlossen? (serverseitig anhand content_blocks geprüft)
  select block into v_block from content_blocks where module_id = p_module;
  if v_block is not null then
    select array_agg(module_id) into v_block_ids from content_blocks where block = v_block;
    select count(*) into v_done_in_block from learning_progress
      where profile_id = v_profile and completed_at is not null and module_id = any(v_block_ids);
    if v_done_in_block = array_length(v_block_ids, 1) then
      v_added := v_added + public.grant_capital(v_profile, 'themenblock', v_block, 100000);
      perform public.award_points(v_profile, 'themenblock', v_block, 300);
    end if;
  end if;

  -- Großer Meilenstein: alle Module abgeschlossen.
  select count(*) into v_total_modules from content_blocks;
  select count(*) into v_done_total from learning_progress
    where profile_id = v_profile and completed_at is not null
      and module_id in (select module_id from content_blocks);
  if v_done_total >= v_total_modules then
    v_added := v_added + public.grant_capital(v_profile, 'milestone', 'all-modules', 200000);
    perform public.award_points(v_profile, 'milestone', 'all-modules', 500);
  end if;

  if v_added > 0 then
    update portfolios set cash_cents = cash_cents + v_added where owner_profile_id = v_profile;
  end if;

  return jsonb_build_object('ok', true, 'added_cents', v_added, 'score', v_score, 'perfect', v_perfect);
end $$;
grant execute on function public.complete_module(text, int, int) to authenticated;
