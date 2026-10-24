-- Serialize changes to each tutor/student calendar, preserve private invite schedules,
-- and avoid profile/application/offering lock inversions across different actors.
begin;

-- Actor serialization does not modify profile primary keys. NO KEY UPDATE keeps
-- serialization while allowing concurrent FK KEY SHARE checks from notifications,
-- applications and enrollments belonging to the other actor.
do $schedule_core$
declare signature text; definition text; old_lock text;
begin
  old_lock:='select * into actor from public.darsino_profiles where id=me for update;';
  foreach signature in array array['public.darsino_mutate_core(jsonb)',
    'public.darsino_account_command(jsonb)','public.darsino_record_payment(jsonb)'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    if position(old_lock in definition)>0 then
      execute replace(definition,old_lock,
        'select * into actor from public.darsino_profiles where id=me for no key update;');
    elsif position('select * into actor from public.darsino_profiles where id=me for no key update;' in definition)=0 then
      raise exception 'Unexpected actor lock in %; scheduling upgrade was not applied.',signature;
    end if;
  end loop;
  definition:=pg_get_functiondef('public.darsino_mutate_core(jsonb)'::regprocedure);
  -- The authenticated outer mutation wrapper always builds the final snapshot.
  -- The private core needs to return only the command result ID, avoiding two
  -- complete marketplace/file/message aggregations for every core command.
  if position('return public.darsino_snapshot()||jsonb_build_object(''id'',new_id);' in definition)>0 then
    execute replace(definition,
      'return public.darsino_snapshot()||jsonb_build_object(''id'',new_id);',
      'return jsonb_build_object(''id'',new_id); -- OQI_SINGLE_SNAPSHOT_V1');
  elsif position('OQI_SINGLE_SNAPSHOT_V1' in definition)=0 then
    raise exception 'Unexpected marketplace return; scheduling upgrade was not applied.';
  end if;
end $schedule_core$;

create index if not exists darsino_active_student_calendar
  on public.darsino_enrollments(student_id,offering_id) where active;

create or replace function public.darsino_assert_student_available(
  p_student uuid,p_starts_at timestamptz,p_ends_at timestamptz,
  p_exclude_offering uuid default null,p_exclude_session uuid default null
) returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.darsino_assert(not exists(
    select 1 from public.darsino_enrollments e
    join public.darsino_sessions s on s.offering_id=e.offering_id
    where e.student_id=p_student and e.active and s.ends_at>now()
      and s.starts_at<p_ends_at and s.ends_at>p_starts_at
      and (p_exclude_offering is null or s.offering_id<>p_exclude_offering)
      and (p_exclude_session is null or s.id<>p_exclude_session)
  ),'O‘quvchining bu vaqtda boshqa darsi bor. Boshqa vaqtni tanlang.');
end $$;

-- Rename once. Keep implementations separate from the public dispatch functions:
-- replaying this migration after a later wrapper must preserve that later wrapper.
do $$ begin
  if to_regprocedure('public.darsino_mutate_schedule_base(jsonb)') is null then
    alter function public.darsino_mutate(jsonb) rename to darsino_mutate_schedule_base;
  end if;
  if to_regprocedure('public.darsino_snapshot_schedule_base()') is null then
    alter function public.darsino_snapshot() rename to darsino_snapshot_schedule_base;
  end if;
end $$;

create or replace function public.darsino_mutate_scheduling(command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  me uuid:=public.darsino_account_id(); op text:=command->>'type'; owner_id uuid;
  v_student_id uuid; v_offering_id uuid; v_session_id uuid; learner uuid; lesson record;
  application public.darsino_applications; invitation public.darsino_group_invitations;
  v_starts_at timestamptz; v_ends_at timestamptz; checking_group boolean:=false;
begin
  perform public.darsino_assert(command->>'actorId'=me::text,'Akkaunt o‘zgardi. Amalni qayta boshlang.');
  if op='decide' and command->>'decision'='approved' then
    select a.* into application from public.darsino_applications a
      where a.id=(command->>'requestId')::uuid and a.tutor_id=me;
    if found then
      owner_id:=me; v_student_id:=application.student_id; v_offering_id:=application.offering_id;
      v_starts_at:=application.starts_at; v_ends_at:=application.ends_at;
      checking_group:=v_offering_id is not null;
    end if;
  elsif op='group-invite-decide' and command->'accept'='true'::jsonb then
    select i.* into invitation from public.darsino_group_invitations i
      where i.id=(command->>'invitationId')::uuid and i.student_id=me;
    if found then
      owner_id:=invitation.tutor_id; v_student_id:=me; v_offering_id:=invitation.offering_id;
      checking_group:=true;
    end if;
  elsif op='update-session' then
    select o.tutor_id,s.offering_id,s.id into owner_id,v_offering_id,v_session_id
      from public.darsino_sessions s join public.darsino_offerings o on o.id=s.offering_id
      where s.id=(command->>'sessionId')::uuid and o.tutor_id=me;
    v_starts_at:=(command->>'startsAt')::timestamptz;
    v_ends_at:=(command->>'endsAt')::timestamptz;
  elsif op='offering' then
    owner_id:=me;
  elsif op='remove-participant' then
    select o.tutor_id,o.id into owner_id,v_offering_id from public.darsino_offerings o
      where o.id=(command->>'offeringId')::uuid and o.tutor_id=me;
    v_student_id:=(command->>'studentId')::uuid;
  end if;

  if owner_id is not null then
    -- Every membership/session writer takes owner first, then students in a
    -- stable order. Different tutors only contend when they share a learner.
    perform pg_advisory_xact_lock(hashtextextended('oqi:schedule:tutor:'||owner_id::text,0));
    if op='update-session' then
      -- Read after the tutor lock: a concurrently admitted learner cannot be
      -- missed by the locks or by the conflict check for this schedule change.
      for learner in select e.student_id from public.darsino_enrollments e
        where e.offering_id=v_offering_id and e.active order by e.student_id loop
        perform pg_advisory_xact_lock(hashtextextended('oqi:schedule:student:'||learner::text,0));
      end loop;
    elsif v_student_id is not null then
      perform pg_advisory_xact_lock(hashtextextended('oqi:schedule:student:'||v_student_id::text,0));
    end if;
    -- Match the existing payment actor -> offering order. FK checks from the
    -- opposite actor remain compatible with this non-key actor lock.
    perform 1 from public.darsino_profiles p where p.id=me for no key update;
    if v_offering_id is not null then
      perform 1 from public.darsino_offerings o where o.id=v_offering_id for update;
    end if;

    if checking_group then
      -- State may have changed while waiting; only still-pending admissions
      -- need calendar validation. Delegated RPCs own authorization/transitions.
      if (op='decide' and exists(select 1 from public.darsino_applications a where a.id=application.id and a.status='pending'))
        or (op='group-invite-decide' and exists(select 1 from public.darsino_group_invitations i where i.id=invitation.id and i.status='pending')) then
        for lesson in select s.starts_at,s.ends_at from public.darsino_sessions s
          where s.offering_id=v_offering_id and s.ends_at>now() loop
          perform public.darsino_assert_student_available(v_student_id,lesson.starts_at,lesson.ends_at,v_offering_id);
        end loop;
      end if;
    elsif op='decide' and application.status='pending' then
      perform public.darsino_assert_student_available(v_student_id,v_starts_at,v_ends_at);
    elsif op='update-session' then
      for learner in select e.student_id from public.darsino_enrollments e
        where e.offering_id=v_offering_id and e.active order by e.student_id loop
        perform public.darsino_assert_student_available(learner,v_starts_at,v_ends_at,null,v_session_id);
      end loop;
    end if;
  end if;
  return public.darsino_mutate_schedule_base(command);
end $$;

create or replace function public.darsino_snapshot_scheduling() returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); result jsonb; market jsonb; invited_sessions jsonb;
begin
  result:=public.darsino_snapshot_schedule_base(); market:=result->'market';
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'offeringId',s.offering_id,
    'title',o.data->>'title','startsAt',s.starts_at,'endsAt',s.ends_at,
    'location',o.data->>'location','mode',o.data->>'mode') order by s.starts_at,s.id),'[]'::jsonb)
    into invited_sessions
    from public.darsino_sessions s join public.darsino_offerings o on o.id=s.offering_id
    join public.darsino_tutors t on t.user_id=o.tutor_id
    join public.darsino_profiles p on p.id=t.user_id
    where s.ends_at>now() and t.verification='approved' and not p.is_suspended
      and not public.darsino_blocked(me,t.user_id)
      and exists(select 1 from public.darsino_group_invitations i
        where i.offering_id=o.id and i.student_id=me and i.status='pending' and i.expires_at>now())
      and not exists(select 1 from jsonb_array_elements(coalesce(market->'sessions','[]'::jsonb)) known
        where known->>'id'=s.id::text);
  market:=jsonb_set(market,'{sessions}',coalesce(market->'sessions','[]'::jsonb)||invited_sessions);
  return result||jsonb_build_object('market',market);
end $$;

do $$ begin
  -- A full installer replay may have just recreated an older public wrapper.
  -- Refresh that known predecessor, while leaving any later wrapper untouched.
  if to_regprocedure('public.darsino_mutate(jsonb)') is null or
    (select prosrc from pg_proc where oid=to_regprocedure('public.darsino_mutate(jsonb)'))=
    (select prosrc from pg_proc where oid='public.darsino_mutate_schedule_base(jsonb)'::regprocedure) then
    execute $create$create or replace function public.darsino_mutate(command jsonb) returns jsonb
      language sql security definer set search_path='' as 'select public.darsino_mutate_scheduling(command)'$create$;
  end if;
  if to_regprocedure('public.darsino_snapshot()') is null or
    (select prosrc from pg_proc where oid=to_regprocedure('public.darsino_snapshot()'))=
    (select prosrc from pg_proc where oid='public.darsino_snapshot_schedule_base()'::regprocedure) then
    execute $create$create or replace function public.darsino_snapshot() returns jsonb
      language sql security definer set search_path='' as 'select public.darsino_snapshot_scheduling()'$create$;
  end if;
end $$;

revoke all on function public.darsino_assert_student_available(uuid,timestamptz,timestamptz,uuid,uuid),
  public.darsino_mutate_schedule_base(jsonb),public.darsino_snapshot_schedule_base(),
  public.darsino_mutate_scheduling(jsonb),public.darsino_snapshot_scheduling(),
  public.darsino_mutate_core(jsonb),public.darsino_account_command(jsonb),public.darsino_record_payment(jsonb)
  from public,anon,authenticated;
revoke all on function public.darsino_mutate(jsonb),public.darsino_snapshot() from public,anon;
grant execute on function public.darsino_mutate(jsonb),public.darsino_snapshot() to authenticated;
notify pgrst,'reload schema';
commit;
