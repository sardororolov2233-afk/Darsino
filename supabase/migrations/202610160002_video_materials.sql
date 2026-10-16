begin;

-- MVP: short videos and documents up to 20 MiB; all files remain private.
update storage.buckets set allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','video/mp4','video/webm'] where id='darsino-lesson-materials';

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
  ext:=case mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'application/pdf' then 'pdf' when 'video/mp4' then 'mp4' when 'video/webm' then 'webm'
    when 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' then 'docx'
    when 'application/vnd.openxmlformats-officedocument.presentationml.presentation' then 'pptx'
    when 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' then 'xlsx' end;
  f.id:=gen_random_uuid();
  insert into public.darsino_files(id,owner_id,purpose,bucket_id,object_path,original_name,mime_type,size_bytes,conversation_id,offering_id)
    values(f.id,me,p_purpose,bucket,me::text||'/'||f.id::text||'.'||ext,trim(p_original_name),mime,p_size_bytes,p_conversation_id,p_offering_id) returning * into f;
  return public.darsino_file_json(f);
end $$;


commit;
