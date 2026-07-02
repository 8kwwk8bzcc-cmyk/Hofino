-- Hebt das tägliche Limit für NEUE Lektionen auf. Kinder können beliebig viele neue
-- Lektionen pro Tag abschließen. Das Wiederholungs-Tageslimit (Spaced Repetition) und
-- die daran gekoppelte Wissenspunkte-Deckelung (300 XP/Tag) bleiben UNVERÄNDERT –
-- sie schützen die Ranking-Integrität. Lernkapital bleibt einmalig je Ereignis.

-- Tagesstatus: neu_limit entfällt (null = unbegrenzt). neue_genutzt bleibt als reine Anzeige.
create or replace function public.lern_tagesstatus()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_z lern_tageszaehler;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  select * into v_z from lern_tageszaehler where profile_id = v_profile and datum = current_date;
  return jsonb_build_object(
    'ok', true,
    'neu_genutzt', coalesce(v_z.neue_genutzt, 0),
    'wieder_genutzt', coalesce(v_z.wiederholungen_genutzt, 0),
    'wiederhol_xp', coalesce(v_z.wiederhol_xp, 0),
    'neu_limit', null, 'wieder_limit', 10, 'wiederhol_xp_cap', 300
  );
end $$;
grant execute on function public.lern_tagesstatus() to authenticated;

-- Antwort speichern: KEIN Neu-Limit mehr; Wiederhol-Limit + XP-Cap unverändert.
create or replace function public.lern_antwort_speichern(
  p_konzept text, p_stufe text, p_frage_id text, p_vorlage_id text,
  p_korrekt boolean, p_ist_wiederholung boolean, p_basis_xp int,
  p_box int, p_richtig_in_folge int, p_gemeistert boolean, p_faellig date
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_z lern_tageszaehler;
  v_granted int := 0;
  v_rest int;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;

  select * into v_z from lern_tageszaehler where profile_id = v_profile and datum = current_date;
  if not found then
    insert into lern_tageszaehler (profile_id, datum) values (v_profile, current_date) returning * into v_z;
  end if;

  -- Nur noch das Wiederholungs-Budget begrenzt (neue Lektionen sind unbegrenzt).
  if p_ist_wiederholung and v_z.wiederholungen_genutzt >= 10 then
    return jsonb_build_object('ok', false, 'reason', 'budget_wiederholung');
  end if;

  -- XP: nur bei richtig; Wiederholungen mit Tages-Cap 300
  if p_korrekt then
    if p_ist_wiederholung then
      v_rest := greatest(0, 300 - v_z.wiederhol_xp);
      v_granted := least(p_basis_xp, v_rest);
    else
      v_granted := p_basis_xp;
    end if;
  end if;

  insert into lern_antworten (profile_id, konzept_id, frage_id, vorlage_id, stufe, korrekt, ist_wiederholung, xp)
    values (v_profile, p_konzept, nullif(p_frage_id, ''), nullif(p_vorlage_id, ''), p_stufe, p_korrekt, p_ist_wiederholung, v_granted);

  update lern_tageszaehler set
    neue_genutzt = neue_genutzt + (case when p_ist_wiederholung then 0 else 1 end),
    wiederholungen_genutzt = wiederholungen_genutzt + (case when p_ist_wiederholung then 1 else 0 end),
    wiederhol_xp = wiederhol_xp + (case when p_ist_wiederholung then v_granted else 0 end)
  where profile_id = v_profile and datum = current_date;

  insert into lern_status (profile_id, xp_gesamt, xp_saison)
    values (v_profile, v_granted, v_granted)
    on conflict (profile_id) do update set
      xp_gesamt = lern_status.xp_gesamt + v_granted,
      xp_saison = lern_status.xp_saison + v_granted;

  insert into lern_sr_zustand (profile_id, konzept_id, leitner_box, richtig_in_folge, gemeistert, naechste_faelligkeit, letzte_antwort_korrekt)
    values (v_profile, p_konzept, p_box, p_richtig_in_folge, p_gemeistert, p_faellig, p_korrekt)
    on conflict (profile_id, konzept_id) do update set
      leitner_box = excluded.leitner_box,
      richtig_in_folge = excluded.richtig_in_folge,
      gemeistert = lern_sr_zustand.gemeistert or excluded.gemeistert,
      naechste_faelligkeit = excluded.naechste_faelligkeit,
      letzte_antwort_korrekt = excluded.letzte_antwort_korrekt;

  return jsonb_build_object('ok', true, 'granted_xp', v_granted);
end $$;
grant execute on function public.lern_antwort_speichern(text, text, text, text, boolean, boolean, int, int, int, boolean, date) to authenticated;
