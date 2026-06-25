-- Hofino – Entscheidungs-Flow (mission-board-no-house-v1, Phase 3).
-- Eine einheitliche RPC für buy/sell/hold mit Begründungspflicht. Buy/Sell nutzen die
-- bestehende Order-Engine (place_order: Validierung + 5 € Gebühr + orders-Eintrag),
-- Halten erzeugt nur einen Entscheidungs-Datensatz. XP wird einheitlich in lern_status
-- vergeben (15 je begründeter Entscheidung, +10 Bonus wenn der Tag komplett ist).

drop function if exists public.tagesentscheidung_halten(text, text);

create or replace function public.tagesentscheidung_speichern(
  p_action text,
  p_quantity int default 0,
  p_reason text default null,
  p_reason_text text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_plan    daily_plans;
  v_price   bigint;
  v_fee     int := 0;
  v_order   jsonb;
  v_xp      int := 15;
  v_bonus   int := 0;
  v_learning_done boolean;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  if p_action not in ('buy', 'sell', 'hold') then return jsonb_build_object('ok', false, 'reason', 'bad_action'); end if;
  if p_reason not in ('long_term_growth', 'reduce_risk', 'not_enough_information', 'diversify', 'own_reason') then
    return jsonb_build_object('ok', false, 'reason', 'bad_reason');
  end if;
  if p_reason = 'own_reason' and coalesce(length(trim(p_reason_text)), 0) < 5 then
    return jsonb_build_object('ok', false, 'reason', 'reason_text_too_short');
  end if;

  select * into v_plan from daily_plans where profile_id = v_profile and plan_date = current_date;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  if v_plan.market_viewed_at is null then return jsonb_build_object('ok', false, 'reason', 'market_not_viewed'); end if;
  if v_plan.decision_completed_at is not null then return jsonb_build_object('ok', false, 'reason', 'already_done'); end if;

  if p_action in ('buy', 'sell') then
    if p_quantity <= 0 then return jsonb_build_object('ok', false, 'reason', 'invalid_quantity'); end if;
    -- bestehende Order-Engine ausführen (prüft Cash/Bestand, bucht Gebühr, schreibt orders)
    v_order := public.place_order(v_plan.instrument_id, p_action::order_side, p_quantity);
    if not coalesce((v_order->>'ok')::boolean, false) then
      return jsonb_build_object('ok', false, 'reason', v_order->>'reason');
    end if;
    v_price := (v_order->>'price_cents')::bigint;
    v_fee := 500;
  end if;

  insert into trade_decisions (profile_id, instrument_id, daily_plan_id, action, quantity, virtual_price_cents, fee_cents, reason_type, reason_text)
    values (v_profile, v_plan.instrument_id, v_plan.id, p_action,
            case when p_action = 'hold' then 0 else p_quantity end, v_price, v_fee, p_reason, p_reason_text);

  update daily_plans set decision_completed_at = now(), updated_at = now() where id = v_plan.id;

  -- Tag komplett? (Lernmission heute + Markt-Labor gesehen + jetzt Entscheidung) → Bonus
  v_learning_done := exists (select 1 from lern_antworten a where a.profile_id = v_profile and a.beantwortet_am = current_date);
  if v_learning_done then v_bonus := 10; end if;

  insert into lern_status (profile_id, xp_gesamt, xp_saison)
    values (v_profile, v_xp + v_bonus, v_xp + v_bonus)
    on conflict (profile_id) do update set
      xp_gesamt = lern_status.xp_gesamt + v_xp + v_bonus,
      xp_saison = lern_status.xp_saison + v_xp + v_bonus;

  return jsonb_build_object('ok', true, 'action', p_action, 'price_cents', v_price, 'fee_cents', v_fee, 'xp', v_xp + v_bonus, 'bonus', v_bonus);
end $$;
grant execute on function public.tagesentscheidung_speichern(text, int, text, text) to authenticated;
