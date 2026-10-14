-- Email OTP, Google and Apple replace phone-only registration. Existing UUIDs,
-- lessons, enrollments and Storage paths are preserved.
begin;
alter table public.darsino_profiles add column if not exists email text not null default '';
create index if not exists darsino_profiles_email on public.darsino_profiles(lower(email)) where email<>'';

create or replace function public.darsino_sync_auth_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.darsino_profiles(id,phone,email)
    values(new.id,
      case when new.phone_confirmed_at is not null and nullif(new.phone,'') is not null then '+'||ltrim(new.phone,'+') else '' end,
      case when new.email_confirmed_at is not null then lower(coalesce(new.email,'')) else '' end)
    on conflict(id) do update set phone=excluded.phone,email=excluded.email;
  return new;
end $$;
drop trigger if exists darsino_auth_profile on auth.users;
create trigger darsino_auth_profile after insert or update of phone,phone_confirmed_at,email,email_confirmed_at on auth.users
  for each row execute function public.darsino_sync_auth_profile();
insert into public.darsino_profiles(id,phone,email)
  select id,case when phone_confirmed_at is not null and nullif(phone,'') is not null then '+'||ltrim(phone,'+') else '' end,
    case when email_confirmed_at is not null then lower(coalesce(email,'')) else '' end
  from auth.users on conflict(id) do update set phone=excluded.phone,email=excluded.email;

create or replace function public.darsino_authenticated() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u join public.darsino_profiles p on p.id=u.id
    where u.id=auth.uid() and u.email_confirmed_at is not null and nullif(trim(u.email),'') is not null and not p.is_suspended)
$$;
create or replace function public.darsino_account_id() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.darsino_assert(public.darsino_authenticated(),'Tasdiqlangan email, Google yoki Apple akkaunti bilan kiring. Akkaunt faol bo‘lishi kerak.');
  return auth.uid();
end $$;

create or replace function public.darsino_snapshot() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); result jsonb; market jsonb;
begin
  result:=public.darsino_snapshot_core(); market:=result->'market';
  market:=jsonb_set(market,'{users}',coalesce((
    select jsonb_agg(u.value||jsonb_build_object('avatarFileId',p.avatar_file_id,'email',case when p.id=me then p.email else '' end) order by u.ordinality)
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

revoke all on function public.darsino_sync_auth_profile(),public.darsino_account_id() from public,anon,authenticated;
revoke all on function public.darsino_authenticated(),public.darsino_snapshot() from public,anon;
grant execute on function public.darsino_authenticated(),public.darsino_snapshot() to authenticated;
notify pgrst,'reload schema';
commit;
