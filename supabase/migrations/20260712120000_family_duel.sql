-- ─────────────────────────────────────────────────────────────────────────────
-- Familien-Duell (Eltern-gegen-Kind, Produktentscheidung: Family SPIELT MIT).
-- Wochenwertung (ISO-Woche, Mo–So) über den Familienkreis des Aufrufers:
-- verknüpfte Eltern, Kinder, Geschwister (Kinder derselben Eltern) und weitere
-- Elternteile der eigenen Kinder — jeweils nur über APPROVED-Links.
-- Metriken je Mitglied: XP der Woche, richtige Antworten der Woche, komplette
-- Trainingstage der Woche. Security definer, weil Kinder die Profile ihrer
-- Geschwister/Eltern per RLS nicht lesen dürfen — die Funktion gibt bewusst
-- NUR Anzeigename + Wochenwerte preis (keine Depots, keine privaten Daten).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.familien_duell()
returns table (
  profile_id uuid,
  display_name text,
  role user_role,
  xp_week bigint,
  korrekt_week bigint,
  tage_week bigint
)
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid;
begin
  select p.id into v_me from profiles p where p.auth_user_id = auth.uid();
  if v_me is null then return; end if;
  return query
    with fam as (
      select l.parent_profile_id as pid
        from parent_child_links l where l.child_profile_id = v_me and l.status = 'approved'
      union
      select l.child_profile_id
        from parent_child_links l where l.parent_profile_id = v_me and l.status = 'approved'
      union
      select l2.child_profile_id
        from parent_child_links l1
        join parent_child_links l2 on l2.parent_profile_id = l1.parent_profile_id and l2.status = 'approved'
       where l1.child_profile_id = v_me and l1.status = 'approved'
      union
      select l2.parent_profile_id
        from parent_child_links l1
        join parent_child_links l2 on l2.child_profile_id = l1.child_profile_id and l2.status = 'approved'
       where l1.parent_profile_id = v_me and l1.status = 'approved'
      union
      select v_me
    )
    select p.id,
           p.display_name,
           p.role,
           coalesce(x.xp, 0)::bigint,
           coalesce(x.korrekt, 0)::bigint,
           coalesce(d.tage, 0)::bigint
    from fam
    join profiles p on p.id = fam.pid
    left join lateral (
      select sum(a.xp) as xp, count(*) filter (where a.korrekt) as korrekt
      from lern_antworten a
      where a.profile_id = p.id and a.beantwortet_at >= date_trunc('week', now())
    ) x on true
    left join lateral (
      select count(*) as tage
      from daily_plans dp
      where dp.profile_id = p.id
        and dp.plan_date >= date_trunc('week', now())::date
        and dp.learning_completed_at is not null
        and dp.market_viewed_at is not null
        and dp.decision_completed_at is not null
    ) d on true
    order by coalesce(x.xp, 0) desc, p.display_name;
end $$;

revoke execute on function public.familien_duell() from public, anon;
grant execute on function public.familien_duell() to authenticated;
