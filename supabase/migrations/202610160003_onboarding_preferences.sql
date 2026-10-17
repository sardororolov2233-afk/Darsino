-- Preferences belong to the authenticated profile. Older clients can omit them.
begin;
alter table public.darsino_profiles add column if not exists study_mode text check(study_mode in ('Onlayn','Oflayn'));
alter table public.darsino_profiles add column if not exists study_support text check(study_support in ('Mustaqil','Ustoz bilan'));

create or replace function public.darsino_snapshot() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); result jsonb; market jsonb;
begin
  result:=public.darsino_snapshot_core(); market:=result->'market';
  market:=jsonb_set(market,'{users}',coalesce((
    select jsonb_agg(u.value||jsonb_build_object('avatarFileId',p.avatar_file_id,'email',case when p.id=me then p.email else '' end)||case when p.id=me then jsonb_strip_nulls(jsonb_build_object('studyMode',p.study_mode,'studySupport',p.study_support)) else '{}'::jsonb end order by u.ordinality)
    from jsonb_array_elements(market->'users') with ordinality u(value,ordinality)
    join public.darsino_profiles p on p.id=(u.value->>'id')::uuid),'[]'::jsonb));
  market:=jsonb_set(market,'{offerings}',coalesce((
    select jsonb_agg(o.value||jsonb_build_object('coverFileId',p.cover_file_id) order by o.ordinality)
    from jsonb_array_elements(market->'offerings') with ordinality o(value,ordinality)
    join public.darsino_offerings p on p.id=(o.value->>'id')::uuid),'[]'::jsonb));
  market:=jsonb_set(market,'{messages}',coalesce((
    select jsonb_agg(m.value||jsonb_build_object('attachmentIds',coalesce((select jsonb_agg(mf.file_id) from public.darsino_message_files mf where mf.message_id=(m.value->>'id')::uuid),'[]'::jsonb)) order by m.ordinality)
    from jsonb_array_elements(market->'messages') with ordinality m(value,ordinality)),'[]'::jsonb));
  market:=market||jsonb_build_object(
    'files',coalesce((select jsonb_agg(public.darsino_file_json(f) order by f.created_at) from public.darsino_files f where public.darsino_can_read_file(f.id)),'[]'::jsonb),
    'tutorDocuments',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'tutorId',d.tutor_id,'fileId',d.file_id,'documentType',d.document_type,'label',d.label,'status',d.status,'reviewNote',d.review_note,'createdAt',d.created_at,'reviewedAt',d.reviewed_at) order by d.created_at) from public.darsino_tutor_documents d where d.tutor_id=me or public.darsino_is_moderator()),'[]'::jsonb),
    'lessonFiles',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'offeringId',f.offering_id,'sessionId',f.session_id,'fileId',f.file_id,'title',f.title,'published',f.published,'createdAt',f.created_at) order by f.created_at) from public.darsino_lesson_files f join public.darsino_offerings o on o.id=f.offering_id where o.tutor_id=me or (f.published and public.darsino_class_access(f.offering_id))),'[]'::jsonb));
  return jsonb_build_object('market',market,'user',(select u from jsonb_array_elements(market->'users') u where u->>'id'=me::text));
end $$;

create or replace function public.darsino_mutate(command jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; prefs jsonb; begin
  perform public.darsino_account_id();
  if command->>'type'='profile' then
    prefs:=command->'profile';
    if prefs ? 'studyMode' or prefs ? 'studySupport' then
      perform public.darsino_assert(
        coalesce(prefs->>'studyMode','') in ('Onlayn','Oflayn') and
        coalesce(prefs->>'studySupport','') in ('Mustaqil','Ustoz bilan'),
        'Ta’lim shakli va tayyorgarlik usulini tanlang.');
    end if;
  end if;
  result:=public.darsino_mutate_core(command);
  if command->>'type'='profile' and (prefs ? 'studyMode' or prefs ? 'studySupport') then
    update public.darsino_profiles set study_mode=prefs->>'studyMode',study_support=prefs->>'studySupport' where id=auth.uid();
  end if;
  if command->>'type'='moderate' then
    update public.darsino_tutor_documents set status=command->>'decision',reviewer_id=auth.uid(),
      review_note=trim(coalesce(command->>'note','')),reviewed_at=now()
    where tutor_id=(command->>'tutorId')::uuid and status='pending';
  end if;
  return public.darsino_snapshot()||jsonb_build_object('id',result->'id');
end $$;

revoke all on function public.darsino_snapshot(),public.darsino_mutate(jsonb) from public,anon;
grant execute on function public.darsino_snapshot(),public.darsino_mutate(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
