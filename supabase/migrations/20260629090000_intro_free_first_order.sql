-- ─────────────────────────────────────────────────────────────────────────────
-- Intro-/Willkommensorder: Die ALLERERSTE Order eines Nutzers kann gebührenfrei
-- ausgeführt werden (gesteuert über den Ersteinrichtungsassistenten). Alle weiteren
-- Orders kosten regulär 5 € (Domänenregel §6). Der Gebührenerlass ist serverseitig
-- an „erste Order" gekoppelt und damit nicht durch den Client manipulierbar.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.place_order(uuid, order_side, int);

create or replace function public.place_order(
  p_instrument uuid,
  p_side order_side,
  p_qty int,
  p_waive_fee boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_pf portfolios;
  v_price bigint;
  v_fee bigint := 500;
  v_gross bigint;
  v_hold holdings;
  v_order_count int;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  if p_qty <= 0 then return jsonb_build_object('ok', false, 'reason', 'invalid_quantity'); end if;

  select * into v_pf from portfolios where owner_profile_id = v_profile;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_portfolio'); end if;

  -- Gebührenerlass nur bei der allerersten Order (Intro) – sonst immer 5 €.
  if p_waive_fee then
    select count(*) into v_order_count from orders where portfolio_id = v_pf.id;
    if v_order_count = 0 then v_fee := 0; end if;
  end if;

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

grant execute on function public.place_order(uuid, order_side, int, boolean) to authenticated;
