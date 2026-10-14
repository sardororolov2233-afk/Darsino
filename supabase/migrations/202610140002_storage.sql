-- Additive upgrade: no existing marketplace data or Storage objects are deleted.
begin;

alter table public.darsino_profiles add column if not exists is_suspended boolean not null default false;

-- Roles are never copied from user-editable Auth metadata.
create or replace function public.darsino_sync_auth_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.darsino_profiles(id,phone)
    values(new.id,case when new.phone_confirmed_at is not null then '+'||ltrim(coalesce(new.phone,''),'+') else '' end)
    on conflict(id) do update set phone=excluded.phone;
  return new;
end $$;
drop trigger if exists darsino_auth_profile on auth.users;
create trigger darsino_auth_profile after insert or update of phone,phone_confirmed_at on auth.users
  for each row execute function public.darsino_sync_auth_profile();
insert into public.darsino_profiles(id,phone)
  select id,case when phone_confirmed_at is not null then '+'||ltrim(coalesce(phone,''),'+') else '' end
  from auth.users on conflict(id) do update set phone=excluded.phone;

create or replace function public.darsino_authenticated() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u join public.darsino_profiles p on p.id=u.id
    where u.id=auth.uid() and u.phone_confirmed_at is not null and nullif(u.phone,'') is not null and not p.is_suspended)
$$;
create or replace function public.darsino_account_id() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.darsino_assert(public.darsino_authenticated(),'Tasdiqlangan telefon bilan kiring. Akkaunt faol bo‘lishi kerak.');
  return auth.uid();
end $$;
create or replace function public.darsino_is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.darsino_authenticated() and exists(select 1 from public.darsino_profiles where id=auth.uid() and role='moderator')
$$;
create or replace function public.darsino_class_access(class_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.darsino_authenticated() and exists(select 1 from public.darsino_offerings o where o.id=class_id and
    (o.tutor_id=auth.uid() or exists(select 1 from public.darsino_enrollments e where e.offering_id=o.id and e.student_id=auth.uid() and e.active)))
$$;
create or replace function public.darsino_can_message(conversation text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.darsino_authenticated() and exists(
    select 1 from public.darsino_profiles s cross join public.darsino_tutors t
    join public.darsino_profiles tp on tp.id=t.user_id
    where s.role='student' and s.onboarded and tp.role='tutor' and t.verification='approved'
    and not s.is_suspended and not tp.is_suspended
    and conversation='dm:'||s.id::text||':'||t.user_id::text and auth.uid() in (s.id,t.user_id))
$$;

create table if not exists public.darsino_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.darsino_profiles(id),
  purpose text not null check(purpose in ('avatar','verification','chat','material','cover')),
  bucket_id text not null check(bucket_id in ('darsino-avatars','darsino-verifications','darsino-chat-files','darsino-lesson-materials','darsino-group-covers')),
  object_path text not null, original_name text not null check(char_length(original_name) between 1 and 180),
  mime_type text not null, size_bytes bigint not null check(size_bytes > 0),
  state text not null default 'pending' check(state in ('pending','ready','deleting','deleted')),
  conversation_id text, offering_id uuid references public.darsino_offerings(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(bucket_id,object_path),
  check((purpose='chat')=(conversation_id is not null)),
  check((purpose in ('material','cover'))=(offering_id is not null))
);
create index if not exists darsino_files_owner on public.darsino_files(owner_id,state,created_at);
create index if not exists darsino_files_class on public.darsino_files(offering_id) where offering_id is not null;
create table if not exists public.darsino_tutor_documents (
  id uuid primary key default gen_random_uuid(), tutor_id uuid not null references public.darsino_tutors(user_id),
  file_id uuid not null unique references public.darsino_files(id),
  document_type text not null check(document_type in ('certificate','diploma','other')),
  label text not null check(char_length(label) between 2 and 150),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  reviewer_id uuid references public.darsino_profiles(id), review_note text not null default '',
  created_at timestamptz not null default now(), reviewed_at timestamptz
);
create index if not exists darsino_documents_tutor on public.darsino_tutor_documents(tutor_id,status);
create table if not exists public.darsino_message_files (
  message_id uuid not null references public.darsino_messages(id),
  file_id uuid not null unique references public.darsino_files(id), primary key(message_id,file_id)
);
create table if not exists public.darsino_lesson_files (
  id uuid primary key default gen_random_uuid(), offering_id uuid not null references public.darsino_offerings(id),
  session_id uuid references public.darsino_sessions(id), file_id uuid not null unique references public.darsino_files(id),
  title text not null check(char_length(title) between 2 and 150), published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists darsino_lesson_files_class on public.darsino_lesson_files(offering_id,published);
alter table public.darsino_profiles add column if not exists avatar_file_id uuid references public.darsino_files(id);
alter table public.darsino_offerings add column if not exists cover_file_id uuid references public.darsino_files(id);
do $$ declare t text; begin
  foreach t in array array['files','tutor_documents','message_files','lesson_files'] loop
    execute format('alter table public.darsino_%I enable row level security',t);
    execute format('revoke all on public.darsino_%I from public,anon,authenticated',t);
  end loop;
end $$;

-- All five buckets are private. Bucket limits also apply at the Storage API layer.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('darsino-avatars','darsino-avatars',false,2097152,array['image/jpeg','image/png','image/webp']),
  ('darsino-verifications','darsino-verifications',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']),
  ('darsino-chat-files','darsino-chat-files',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']),
  ('darsino-lesson-materials','darsino-lesson-materials',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('darsino-group-covers','darsino-group-covers',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.darsino_is_bucket(bucket text) returns boolean
language sql immutable set search_path = '' as $$
  select bucket=any(array['darsino-avatars','darsino-verifications','darsino-chat-files','darsino-lesson-materials','darsino-group-covers'])
$$;
create or replace function public.darsino_can_read_file(file uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.darsino_authenticated() and exists(select 1 from public.darsino_files f where f.id=file and f.state<>'deleted' and (
    f.owner_id=auth.uid() or (f.state='ready' and (
      (f.purpose='verification' and public.darsino_is_moderator())
      or (f.purpose='avatar' and exists(select 1 from public.darsino_profiles p where p.avatar_file_id=f.id and (
        exists(select 1 from public.darsino_tutors t where t.user_id=p.id and (t.verification='approved' or public.darsino_is_moderator()))
        or exists(select 1 from public.darsino_messages m where (m.sender_id=auth.uid() and m.recipient_id=p.id) or (m.recipient_id=auth.uid() and m.sender_id=p.id))
        or exists(select 1 from public.darsino_applications a where a.tutor_id=auth.uid() and a.student_id=p.id)
        or exists(select 1 from public.darsino_enrollments e join public.darsino_offerings o on o.id=e.offering_id where e.student_id=p.id and o.tutor_id=auth.uid())
      )))
      or (f.purpose='cover' and exists(select 1 from public.darsino_offerings o join public.darsino_tutors t on t.user_id=o.tutor_id where o.cover_file_id=f.id and ((o.published and t.verification='approved') or public.darsino_class_access(o.id))))
      or (f.purpose='chat' and exists(select 1 from public.darsino_message_files mf join public.darsino_messages m on m.id=mf.message_id where mf.file_id=f.id and auth.uid() in (m.sender_id,m.recipient_id)))
      or (f.purpose='material' and exists(select 1 from public.darsino_lesson_files lf where lf.file_id=f.id and lf.published and public.darsino_class_access(lf.offering_id)))
    ))
  ))
$$;
create or replace function public.darsino_storage_read(bucket text,path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.darsino_files f where f.bucket_id=bucket and f.object_path=path and public.darsino_can_read_file(f.id))
$$;
create or replace function public.darsino_storage_insert(bucket text,path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.darsino_authenticated() and exists(select 1 from public.darsino_files f
    where f.bucket_id=bucket and f.object_path=path and f.owner_id=auth.uid() and f.state='pending'
    and f.created_at>now()-interval '1 hour')
$$;
create or replace function public.darsino_storage_delete(bucket text,path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.darsino_authenticated() and exists(select 1 from public.darsino_files f
    where f.bucket_id=bucket and f.object_path=path and f.owner_id=auth.uid() and f.state='deleting')
$$;

-- Restrictive guards keep another application's broad policies from opening these buckets.
-- Do not ALTER managed storage.objects or delete its rows directly; Storage API owns bytes.
drop policy if exists darsino_storage_select_guard on storage.objects;
create policy darsino_storage_select_guard on storage.objects as restrictive for select to public
  using(not public.darsino_is_bucket(bucket_id) or (current_user='authenticated' and public.darsino_storage_read(bucket_id,name)));
drop policy if exists darsino_storage_insert_guard on storage.objects;
create policy darsino_storage_insert_guard on storage.objects as restrictive for insert to public
  with check(not public.darsino_is_bucket(bucket_id) or (current_user='authenticated' and public.darsino_storage_insert(bucket_id,name)));
drop policy if exists darsino_storage_update_guard on storage.objects;
create policy darsino_storage_update_guard on storage.objects as restrictive for update to public
  using(not public.darsino_is_bucket(bucket_id)) with check(not public.darsino_is_bucket(bucket_id));
drop policy if exists darsino_storage_delete_guard on storage.objects;
create policy darsino_storage_delete_guard on storage.objects as restrictive for delete to public
  using(not public.darsino_is_bucket(bucket_id) or (current_user='authenticated' and public.darsino_storage_delete(bucket_id,name)));
drop policy if exists darsino_storage_select on storage.objects;
create policy darsino_storage_select on storage.objects for select to authenticated
  using(public.darsino_is_bucket(bucket_id) and public.darsino_storage_read(bucket_id,name));
drop policy if exists darsino_storage_insert on storage.objects;
create policy darsino_storage_insert on storage.objects for insert to authenticated
  with check(public.darsino_is_bucket(bucket_id) and public.darsino_storage_insert(bucket_id,name));
drop policy if exists darsino_storage_delete on storage.objects;
create policy darsino_storage_delete on storage.objects for delete to authenticated
  using(public.darsino_is_bucket(bucket_id) and public.darsino_storage_delete(bucket_id,name));

create or replace function public.darsino_file_json(f public.darsino_files) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('id',f.id,'ownerId',f.owner_id,'purpose',f.purpose,'bucketId',f.bucket_id,
    'objectPath',f.object_path,'originalName',f.original_name,'mimeType',f.mime_type,'sizeBytes',f.size_bytes,
    'state',f.state,'conversationId',f.conversation_id,'offeringId',f.offering_id,'createdAt',f.created_at)
$$;
create or replace function public.darsino_prepare_upload(
  p_purpose text,p_original_name text,p_mime_type text,p_size_bytes bigint,
  p_conversation_id text default null,p_offering_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid:=public.darsino_account_id(); f public.darsino_files; bucket text; lim bigint; ext text;
  mime text:=lower(trim(p_mime_type));
begin
  perform 1 from public.darsino_profiles where id=me for update;
  perform public.darsino_assert(p_purpose in ('avatar','verification','chat','material','cover'),'Fayl maqsadi noto‘g‘ri.');
  perform public.darsino_assert(char_length(trim(p_original_name)) between 1 and 180 and p_original_name !~ '[[:cntrl:]/\\]','Fayl nomi noto‘g‘ri.');
  bucket:=case p_purpose when 'avatar' then 'darsino-avatars' when 'verification' then 'darsino-verifications'
    when 'chat' then 'darsino-chat-files' when 'material' then 'darsino-lesson-materials' when 'cover' then 'darsino-group-covers' end;
  select file_size_limit into lim from storage.buckets where id=bucket and mime=any(allowed_mime_types);
  perform public.darsino_assert(lim is not null and p_size_bytes between 1 and lim,'Fayl turi yoki hajmi ruxsat etilmagan.');
  perform public.darsino_assert((p_purpose='chat')=(p_conversation_id is not null) and (p_purpose in ('material','cover'))=(p_offering_id is not null),'Fayl bog‘lanishi noto‘g‘ri.');
  if p_purpose='verification' then
    perform public.darsino_assert(exists(select 1 from public.darsino_tutors where user_id=me),'Repetitor profilini to‘ldiring.');
  elsif p_purpose='chat' then
    perform public.darsino_assert(public.darsino_can_message(p_conversation_id),'Suhbatga yozish huquqi yo‘q.');
  elsif p_purpose in ('material','cover') then
    perform public.darsino_assert(exists(select 1 from public.darsino_offerings o join public.darsino_tutors t on t.user_id=o.tutor_id where o.id=p_offering_id and o.tutor_id=me and t.verification='approved'),'Faqat tasdiqlangan dars egasi fayl yuklaydi.');
  end if;
  perform public.darsino_assert((select count(*) from public.darsino_files where owner_id=me and state='pending' and created_at>now()-interval '1 hour')<20,'Yuklanayotgan fayllar soni ko‘p. Avval ularni yakunlang.');
  perform public.darsino_assert((select count(*) from public.darsino_files where owner_id=me and state<>'deleted')<1000
    and (select coalesce(sum(size_bytes),0) from public.darsino_files where owner_id=me and state<>'deleted')+p_size_bytes<=2147483648,'Akkaunt fayl limiti tugadi.');
  ext:=case mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'application/pdf' then 'pdf'
    when 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then 'docx'
    when 'application/vnd.openxmlformats-officedocument.presentationml.presentation' then 'pptx'
    when 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' then 'xlsx' end;
  f.id:=gen_random_uuid();
  insert into public.darsino_files(id,owner_id,purpose,bucket_id,object_path,original_name,mime_type,size_bytes,conversation_id,offering_id)
    values(f.id,me,p_purpose,bucket,me::text||'/'||f.id::text||'.'||ext,trim(p_original_name),mime,p_size_bytes,p_conversation_id,p_offering_id) returning * into f;
  return public.darsino_file_json(f);
end $$;

create or replace function public.darsino_finalize_upload(p_file_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); f public.darsino_files; meta jsonb;
begin
  select * into f from public.darsino_files where id=p_file_id and owner_id=me for update;
  perform public.darsino_assert(found and f.state in ('pending','ready'),'Yuklash topilmadi yoki o‘chirish boshlangan.');
  select metadata into meta from storage.objects where bucket_id=f.bucket_id and name=f.object_path;
  perform public.darsino_assert(found and (meta->>'size')::bigint=f.size_bytes and lower(meta->>'mimetype')=f.mime_type,'Storage fayli, MIME turi yoki haqiqiy hajmi mos emas.');
  update public.darsino_files set state='ready',updated_at=now() where id=f.id returning * into f;
  return public.darsino_file_json(f);
end $$;

-- All attachment operations lock this row. Delete reservation and attachment cannot race.
create or replace function public.darsino_owned_file(p_file_id uuid,p_purpose text) returns public.darsino_files
language plpgsql security definer set search_path = '' as $$
declare f public.darsino_files; begin
  select * into f from public.darsino_files where id=p_file_id and owner_id=public.darsino_account_id() for update;
  perform public.darsino_assert(found and f.state='ready' and f.purpose=p_purpose,'Tayyor fayl topilmadi yoki bu fayl sizga tegishli emas.');
  return f;
end $$;
create or replace function public.darsino_get_file(p_file_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare f public.darsino_files; begin
  perform public.darsino_assert(public.darsino_can_read_file(p_file_id),'Faylni ko‘rish huquqi yo‘q.');
  select * into f from public.darsino_files where id=p_file_id;
  return public.darsino_file_json(f);
end $$;
create or replace function public.darsino_begin_file_delete(p_file_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); f public.darsino_files; begin
  select * into f from public.darsino_files where id=p_file_id and owner_id=me for update;
  perform public.darsino_assert(found and f.state<>'deleted','Fayl topilmadi.');
  perform public.darsino_assert(not exists(select 1 from public.darsino_profiles where avatar_file_id=f.id)
    and not exists(select 1 from public.darsino_offerings where cover_file_id=f.id)
    and not exists(select 1 from public.darsino_message_files where file_id=f.id)
    and not exists(select 1 from public.darsino_lesson_files where file_id=f.id)
    and not exists(select 1 from public.darsino_tutor_documents where file_id=f.id and status<>'rejected'),
    'Bog‘langan faylni o‘chirib bo‘lmaydi. Avval bog‘lanishni olib tashlang.');
  update public.darsino_files set state='deleting',updated_at=now() where id=f.id returning * into f;
  return public.darsino_file_json(f);
end $$;
create or replace function public.darsino_forget_file(p_file_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); f public.darsino_files; begin
  select * into f from public.darsino_files where id=p_file_id and owner_id=me for update;
  perform public.darsino_assert(found and f.state in ('deleting','deleted'),'Avval faylni o‘chirishga ajrating.');
  perform public.darsino_assert(not exists(select 1 from storage.objects where bucket_id=f.bucket_id and name=f.object_path),'Avval faylni Storage API orqali o‘chiring.');
  update public.darsino_files set state='deleted',updated_at=now() where id=f.id;
end $$;

-- Revoke default PUBLIC execute, including the trigger and privileged helper functions.
do $$ declare f record; begin
  for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'darsino_%' loop
    execute format('revoke all on function %s from public,anon,authenticated',f.sig);
  end loop;
end $$;
grant execute on function public.darsino_snapshot(),public.darsino_mutate(jsonb) to authenticated;
grant execute on function public.darsino_prepare_upload(text,text,text,bigint,text,uuid),public.darsino_finalize_upload(uuid),
  public.darsino_get_file(uuid),public.darsino_begin_file_delete(uuid),public.darsino_forget_file(uuid) to authenticated;
-- Policies apply to anonymous access too; helpers return false without a confirmed session.
grant execute on function public.darsino_is_bucket(text),public.darsino_storage_read(text,text),
  public.darsino_storage_insert(text,text),public.darsino_storage_delete(text,text) to anon,authenticated;

commit;
