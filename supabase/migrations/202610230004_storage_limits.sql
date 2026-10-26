begin;

-- Storage can populate object metadata after reserving an upload. Charge the
-- bucket's maximum before accepting bytes instead of trusting the client's size
-- or depending on metadata being available in the Storage INSERT policy.
alter table public.darsino_files add column if not exists reserved_size_bytes bigint;
update public.darsino_files f set reserved_size_bytes=
  case when f.state in ('pending','deleting') then
    greatest(f.size_bytes,coalesce((select b.file_size_limit from storage.buckets b where b.id=f.bucket_id),f.size_bytes))
  else f.size_bytes end
where f.reserved_size_bytes is null;
alter table public.darsino_files alter column reserved_size_bytes set not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.darsino_files'::regclass and conname='darsino_files_reserved_size_valid') then
    alter table public.darsino_files add constraint darsino_files_reserved_size_valid check(reserved_size_bytes>=size_bytes);
  end if;
end $$;

create or replace function public.darsino_prepare_upload(
  p_purpose text,p_original_name text,p_mime_type text,p_size_bytes bigint,
  p_conversation_id text default null,p_offering_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid:=public.darsino_account_id(); f public.darsino_files; bucket text; lim bigint; ext text;
  mime text:=lower(trim(p_mime_type));
begin
  -- Serialize allocation with other upload reservations for this account.
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
    and (select coalesce(sum(reserved_size_bytes),0) from public.darsino_files where owner_id=me and state<>'deleted')+lim<=2147483648,'Akkaunt fayl limiti tugadi.');
  ext:=case mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'application/pdf' then 'pdf' when 'video/mp4' then 'mp4' when 'video/webm' then 'webm'
    when 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then 'docx'
    when 'application/vnd.openxmlformats-officedocument.presentationml.presentation' then 'pptx'
    when 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' then 'xlsx' end;
  f.id:=gen_random_uuid();
  insert into public.darsino_files(id,owner_id,purpose,bucket_id,object_path,original_name,mime_type,size_bytes,reserved_size_bytes,conversation_id,offering_id)
    values(f.id,me,p_purpose,bucket,me::text||'/'||f.id::text||'.'||ext,trim(p_original_name),mime,p_size_bytes,lim,p_conversation_id,p_offering_id) returning * into f;
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
  -- Release unused capacity only after the stored object has passed validation.
  -- Deletion keeps this persisted charge until forget_file marks it deleted.
  update public.darsino_files set state='ready',reserved_size_bytes=f.size_bytes,updated_at=now() where id=f.id returning * into f;
  return public.darsino_file_json(f);
end $$;

comment on column public.darsino_files.reserved_size_bytes is 'Account quota charge: bucket maximum until Storage metadata is verified, then actual size; retained while deleting and excluded only when deleted.';

commit;
