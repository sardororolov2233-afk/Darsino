begin;

-- Reassert the original API boundary when upgrading an existing project too.
do $$ declare t text; begin
  foreach t in array array['profiles','tutors','offerings','sessions','applications','enrollments','attendance','reviews','messages','notifications','favorites'] loop
    execute format('alter table public.darsino_%I enable row level security',t);
    execute format('revoke all on public.darsino_%I from public,anon,authenticated',t);
  end loop;
end $$;
create index if not exists darsino_offerings_tutor on public.darsino_offerings(tutor_id,published);
create index if not exists darsino_reviews_tutor on public.darsino_reviews(tutor_id,created_at desc);

-- Keep the already shipped command API; old implementations are owner-only helpers.
do $$ begin
  if to_regprocedure('public.darsino_snapshot_core()') is null then
    alter function public.darsino_snapshot() rename to darsino_snapshot_core;
  end if;
  if to_regprocedure('public.darsino_mutate_core(jsonb)') is null then
    alter function public.darsino_mutate(jsonb) rename to darsino_mutate_core;
  end if;
end $$;

create or replace function public.darsino_snapshot() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); result jsonb; market jsonb;
begin
  result:=public.darsino_snapshot_core(); market:=result->'market';
  market:=jsonb_set(market,'{users}',coalesce((
    select jsonb_agg(u.value||jsonb_build_object('avatarFileId',p.avatar_file_id) order by u.ordinality)
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
declare result jsonb; begin
  perform public.darsino_account_id();
  result:=public.darsino_mutate_core(command);
  if command->>'type'='moderate' then
    update public.darsino_tutor_documents set status=command->>'decision',reviewer_id=auth.uid(),
      review_note=trim(coalesce(command->>'note','')),reviewed_at=now()
    where tutor_id=(command->>'tutorId')::uuid and status='pending';
  end if;
  return public.darsino_snapshot()||jsonb_build_object('id',result->'id');
end $$;

create or replace function public.darsino_set_avatar(p_file_id uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); begin
  if p_file_id is not null then perform public.darsino_owned_file(p_file_id,'avatar'); end if;
  update public.darsino_profiles set avatar_file_id=p_file_id where id=me;
end $$;
create or replace function public.darsino_set_cover(p_offering_id uuid,p_file_id uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); f public.darsino_files; begin
  perform public.darsino_assert(exists(select 1 from public.darsino_offerings o join public.darsino_tutors t on t.user_id=o.tutor_id where o.id=p_offering_id and o.tutor_id=me and t.verification='approved'),'Faqat tasdiqlangan dars egasi muqovani o‘zgartiradi.');
  if p_file_id is not null then
    f:=public.darsino_owned_file(p_file_id,'cover');
    perform public.darsino_assert(f.offering_id=p_offering_id,'Fayl boshqa darsga tegishli.');
  end if;
  update public.darsino_offerings set cover_file_id=p_file_id where id=p_offering_id;
end $$;
create or replace function public.darsino_submit_document(p_file_id uuid,p_document_type text,p_label text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); f public.darsino_files; doc uuid; begin
  f:=public.darsino_owned_file(p_file_id,'verification');
  perform public.darsino_assert(p_document_type in ('certificate','diploma','other') and char_length(trim(p_label)) between 2 and 150,'Hujjat turi va nomini kiriting.');
  select id into doc from public.darsino_tutor_documents where file_id=f.id;
  if doc is not null then return doc; end if;
  insert into public.darsino_tutor_documents(tutor_id,file_id,document_type,label)
    values(me,f.id,p_document_type,trim(p_label)) returning id into doc;
  update public.darsino_tutors set verification='pending',moderation_note='' where user_id=me;
  insert into public.darsino_notifications(user_id,title,body)
    select id,'Yangi tasdiqlash hujjati',trim(p_label) from public.darsino_profiles where role='moderator' and not is_suspended;
  return doc;
end $$;
create or replace function public.darsino_send_file_message(p_file_id uuid,p_text text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); f public.darsino_files; message uuid; recipient uuid; clean text; begin
  f:=public.darsino_owned_file(p_file_id,'chat');
  select message_id into message from public.darsino_message_files where file_id=f.id;
  if message is not null then return message; end if;
  perform public.darsino_assert(public.darsino_can_message(f.conversation_id),'Suhbatga yozish huquqi yo‘q.');
  recipient:=case when split_part(f.conversation_id,':',2)::uuid=me then split_part(f.conversation_id,':',3)::uuid else split_part(f.conversation_id,':',2)::uuid end;
  clean:=coalesce(nullif(trim(p_text),''),f.original_name);
  perform public.darsino_assert(char_length(clean) between 1 and 2000,'Xabar uzunligi noto‘g‘ri.');
  insert into public.darsino_messages(conversation_id,sender_id,recipient_id,text) values(f.conversation_id,me,recipient,clean) returning id into message;
  insert into public.darsino_message_files(message_id,file_id) values(message,f.id);
  insert into public.darsino_notifications(user_id,title,body) values(recipient,'Yangi fayl',f.original_name);
  return message;
end $$;
create or replace function public.darsino_attach_lesson_file(p_file_id uuid,p_title text,p_session_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); f public.darsino_files; attachment uuid; begin
  f:=public.darsino_owned_file(p_file_id,'material');
  perform public.darsino_assert(exists(select 1 from public.darsino_offerings o join public.darsino_tutors t on t.user_id=o.tutor_id where o.id=f.offering_id and o.tutor_id=me and t.verification='approved'),'Faqat tasdiqlangan dars egasi material qo‘shadi.');
  perform public.darsino_assert(char_length(trim(p_title)) between 2 and 150,'Material nomini kiriting.');
  perform public.darsino_assert(p_session_id is null or exists(select 1 from public.darsino_sessions where id=p_session_id and offering_id=f.offering_id),'Dars va mashg‘ulot mos emas.');
  select id into attachment from public.darsino_lesson_files where file_id=f.id;
  if attachment is not null then return attachment; end if;
  insert into public.darsino_lesson_files(offering_id,session_id,file_id,title) values(f.offering_id,p_session_id,f.id,trim(p_title)) returning id into attachment;
  insert into public.darsino_notifications(user_id,title,body,offering_id)
    select student_id,'Yangi dars materiali',trim(p_title),f.offering_id from public.darsino_enrollments where offering_id=f.offering_id and active;
  return attachment;
end $$;
create or replace function public.darsino_manage_lesson_file(p_attachment_id uuid,p_published boolean default true,p_remove boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); target public.darsino_lesson_files; begin
  select lf.* into target from public.darsino_lesson_files lf join public.darsino_offerings o on o.id=lf.offering_id where lf.id=p_attachment_id and o.tutor_id=me for update of lf;
  perform public.darsino_assert(found,'Dars materiali topilmadi yoki sizga tegishli emas.');
  -- Serialize against deletion/attachment changes, just as the upload RPCs do.
  perform 1 from public.darsino_files where id=target.file_id for update;
  if p_remove then delete from public.darsino_lesson_files where id=target.id;
  else update public.darsino_lesson_files set published=p_published where id=target.id; end if;
end $$;

-- Reference values use the application's existing Uzbek strings; no fake live users.
create table if not exists public.darsino_catalog (
  kind text not null check(kind in ('subject','goal','area','mode')), value text not null,
  sort_order integer not null default 0, active boolean not null default true, primary key(kind,value)
);
insert into public.darsino_catalog(kind,value,sort_order) values
  ('subject','Ingliz tili',1),('subject','Matematika',2),('subject','Tarix',3),('subject','IT',4),('subject','Rus tili',5),('subject','Fizika',6),
  ('goal','IELTS / CEFR',1),('goal','Universitetga kirish',2),('goal','Maktab fanlari',3),('goal','Kasbiy rivojlanish',4),('goal','Erkin muloqot',5),
  ('mode','Onlayn',1),('mode','Oflayn',2),
  ('area','Yunusobod',1),('area','Mirzo Ulug‘bek',2),('area','Chilonzor',3),('area','Samarqand',4),('area','Boshqa hudud',5)
on conflict(kind,value) do nothing;
alter table public.darsino_catalog enable row level security;
revoke all on public.darsino_catalog from public,anon,authenticated;
create or replace function public.darsino_get_catalog() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.darsino_account_id();
  return (select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'value',value,'sortOrder',sort_order) order by kind,sort_order),'[]'::jsonb) from public.darsino_catalog where active);
end $$;

-- Only these three tables are readable directly, solely for scoped Realtime events.
-- Write authority remains in the RPCs. Profiles/proofs are never published.
grant select on public.darsino_notifications,public.darsino_messages,public.darsino_enrollments to authenticated;
drop policy if exists darsino_notifications_read on public.darsino_notifications;
create policy darsino_notifications_read on public.darsino_notifications for select to authenticated
  using(public.darsino_authenticated() and user_id=(select auth.uid()));
drop policy if exists darsino_messages_read on public.darsino_messages;
create policy darsino_messages_read on public.darsino_messages for select to authenticated
  using(public.darsino_authenticated() and (sender_id=(select auth.uid()) or recipient_id=(select auth.uid())));
-- SECURITY DEFINER helper is necessary: clients cannot SELECT the offerings authority table.
create or replace function public.darsino_is_class_owner(class_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.darsino_authenticated() and exists(select 1 from public.darsino_offerings where id=class_id and tutor_id=auth.uid())
$$;
drop policy if exists darsino_enrollments_read on public.darsino_enrollments;
create policy darsino_enrollments_read on public.darsino_enrollments for select to authenticated
  using(public.darsino_authenticated() and (student_id=(select auth.uid()) or public.darsino_is_class_owner(offering_id)));
create index if not exists darsino_messages_recipient on public.darsino_messages(recipient_id,created_at);
do $$ declare t text; begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['darsino_notifications','darsino_messages','darsino_enrollments'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;

-- The renamed implementations and internal helpers must not be callable by clients.
do $$ declare f record; begin
  for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'darsino_%' loop
    execute format('revoke all on function %s from public,anon,authenticated',f.sig);
  end loop;
end $$;
grant execute on function public.darsino_snapshot(),public.darsino_mutate(jsonb),public.darsino_get_catalog(),
  public.darsino_prepare_upload(text,text,text,bigint,text,uuid),public.darsino_finalize_upload(uuid),public.darsino_get_file(uuid),
  public.darsino_begin_file_delete(uuid),public.darsino_forget_file(uuid),public.darsino_set_avatar(uuid),public.darsino_set_cover(uuid,uuid),
  public.darsino_submit_document(uuid,text,text),public.darsino_send_file_message(uuid,text),public.darsino_attach_lesson_file(uuid,text,uuid),
  public.darsino_manage_lesson_file(uuid,boolean,boolean),public.darsino_authenticated(),public.darsino_is_class_owner(uuid) to authenticated;
grant execute on function public.darsino_is_bucket(text),public.darsino_storage_read(text,text),
  public.darsino_storage_insert(text,text),public.darsino_storage_delete(text,text) to anon,authenticated;

comment on table public.darsino_files is 'Private Storage metadata. Upload/remove bytes with the Storage API, never SQL DELETE on storage.objects.';
comment on function public.darsino_prepare_upload(text,text,text,bigint,text,uuid) is 'Reserve an owner-scoped immutable object path, upload with upsert:false, then finalize.';
notify pgrst,'reload schema';
commit;
