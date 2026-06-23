-- Hofino – Lernen & Investieren verbinden: Konzept-Abschluss zahlt Lernkapital (€) ins Depot.
-- Einmalig je Ereignis (capital_grants unique), nie aus Wiederholung. Themenblock-/Meilenstein-Boni
-- serverseitig anhand der konzepte-Tabelle. Beträge aus Konzept-Doku §8.

create or replace function public.lern_konzept_abschliessen(p_konzept text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_block text;
  v_block_total int;
  v_block_done int;
  v_total int;
  v_done int;
  v_added bigint := 0;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;

  -- Konzept als abgeschlossen markieren (Stufe meistern erreicht).
  insert into lern_konzept_fortschritt (profile_id, konzept_id, erklaerung_gesehen, hoechste_abgeschlossene_stufe)
    values (v_profile, p_konzept, true, 'meistern')
    on conflict (profile_id, konzept_id) do update set hoechste_abgeschlossene_stufe = 'meistern';

  -- +500 € Lernkapital fürs Konzept (einmalig).
  v_added := v_added + public.grant_capital(v_profile, 'lern_konzept', p_konzept, 50000);

  -- Themenblock komplett? → +1.000 €
  select themenblock_id into v_block from konzepte where id = p_konzept;
  if v_block is not null then
    select count(*) into v_block_total from konzepte where themenblock_id = v_block;
    select count(*) into v_block_done
      from lern_konzept_fortschritt f join konzepte k on k.id = f.konzept_id
      where f.profile_id = v_profile and f.hoechste_abgeschlossene_stufe = 'meistern' and k.themenblock_id = v_block;
    if v_block_done >= v_block_total then
      v_added := v_added + public.grant_capital(v_profile, 'lern_themenblock', v_block, 100000);
    end if;
  end if;

  -- Alle Konzepte? → Meilenstein +2.000 €
  select count(*) into v_total from konzepte;
  select count(*) into v_done from lern_konzept_fortschritt
    where profile_id = v_profile and hoechste_abgeschlossene_stufe = 'meistern';
  if v_total > 0 and v_done >= v_total then
    v_added := v_added + public.grant_capital(v_profile, 'lern_meilenstein', 'alle', 200000);
  end if;

  -- Lernkapital dem Depot-Cash gutschreiben (Performance-Basis wächst mit → Erhalt neutral).
  if v_added > 0 then
    update portfolios set cash_cents = cash_cents + v_added where owner_profile_id = v_profile;
  end if;

  return jsonb_build_object('ok', true, 'lernkapital_cents', v_added);
end $$;
grant execute on function public.lern_konzept_abschliessen(text) to authenticated;
