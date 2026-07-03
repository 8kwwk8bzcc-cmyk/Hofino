-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3: Challenge-Kopplung an das Klassen-Curriculum.
-- Eine lerninhaltsbezogene Challenge darf sich nicht auf einen GESPERRTEN Themenblock
-- beziehen. Betroffen ist die Metrik 'themenblock' (goal_ref = themenblock_id); alle
-- übrigen Metriken (konzepte/xp allgemein bzw. reine Depot-Challenges) haben keinen
-- Blockbezug und bleiben unberührt. Serverseitige Absicherung per Trigger, damit die
-- Kopplung nicht durch den Client umgangen werden kann (DoD: verhindert Inkonsistenz).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.challenge_block_freigegeben()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.scope = 'class' and new.class_id is not null
     and new.goal_metric = 'themenblock' and new.goal_ref is not null then
    if exists (
      select 1 from class_curriculum cc
      where cc.class_id = new.class_id
        and cc.themenblock_id = new.goal_ref
        and cc.status = 'gesperrt'
    ) then
      raise exception 'themenblock_gesperrt' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_challenge_block_freigegeben on challenges;
create trigger trg_challenge_block_freigegeben
  before insert or update on challenges
  for each row execute function public.challenge_block_freigegeben();
