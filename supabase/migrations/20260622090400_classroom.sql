-- Hofino – Classroom: Klasse anlegen (eindeutiger Code) und beitreten.
-- Beides serverseitig: Code-Generierung + Eindeutigkeit; Schüler dürfen per RLS nicht
-- selbst in class_members schreiben, daher Beitritt über SECURITY-DEFINER-Funktion.

create or replace function public.create_class(p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_teacher uuid := public.caller_profile_id();
  v_role user_role;
  v_code text;
  v_id uuid;
  v_try int := 0;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- ohne O/0/I/1
begin
  if v_teacher is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  select role into v_role from profiles where id = v_teacher;
  if v_role <> 'teacher' then return jsonb_build_object('ok', false, 'reason', 'not_teacher'); end if;
  if coalesce(trim(p_name), '') = '' then return jsonb_build_object('ok', false, 'reason', 'no_name'); end if;

  loop
    v_try := v_try + 1;
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    end loop;
    begin
      insert into classes (teacher_profile_id, name, class_code) values (v_teacher, p_name, v_code)
        returning id into v_id;
      exit;
    exception when unique_violation then
      if v_try > 10 then return jsonb_build_object('ok', false, 'reason', 'code_gen_failed'); end if;
    end;
  end loop;

  return jsonb_build_object('ok', true, 'class_id', v_id, 'class_code', v_code);
end $$;
grant execute on function public.create_class(text) to authenticated;

create or replace function public.join_class(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := public.caller_profile_id();
  v_class classes;
begin
  if v_profile is null then return jsonb_build_object('ok', false, 'reason', 'no_profile'); end if;
  select * into v_class from classes where class_code = upper(trim(p_code));
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  insert into class_members (class_id, child_profile_id) values (v_class.id, v_profile)
    on conflict do nothing;
  return jsonb_build_object('ok', true, 'class_name', v_class.name);
end $$;
grant execute on function public.join_class(text) to authenticated;
