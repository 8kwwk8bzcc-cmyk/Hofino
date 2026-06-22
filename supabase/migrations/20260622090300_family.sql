-- Hofino – Family: das Kind gibt eine Eltern-Verknüpfung frei (oder lehnt ab).
-- Eltern legen die Verknüpfung als 'pending' an (RLS pcl_parent_writes); nur das
-- betroffene Kind darf den Status ändern – das erzwingt diese SECURITY-DEFINER-Funktion.
create or replace function public.respond_to_parent_link(p_parent uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_child uuid := public.caller_profile_id();
begin
  if v_child is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  update parent_child_links
    set status = case when p_approve then 'approved' else 'declined' end
    where parent_profile_id = p_parent and child_profile_id = v_child and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_link'); end if;
  return jsonb_build_object('ok', true, 'status', case when p_approve then 'approved' else 'declined' end);
end $$;
grant execute on function public.respond_to_parent_link(uuid, boolean) to authenticated;
