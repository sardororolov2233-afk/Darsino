-- Close account privacy and contact-policy bypasses without changing existing data.
begin;

create or replace function public.darsino_session_secure() returns boolean
language plpgsql stable security definer set search_path='' as $$
declare
  claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
  has_mfa boolean:=false; session_exists boolean; session_id uuid;
begin
  if auth.uid() is null or jsonb_typeof(claims)<>'object' then return false; end if;
  if to_regclass('auth.mfa_factors') is not null then
    execute 'select exists(select 1 from auth.mfa_factors where user_id=$1 and status=''verified'' and factor_type=''totp'')'
      into has_mfa using auth.uid();
  end if;
  if has_mfa and coalesce(claims->>'aal','aal1')<>'aal2' then return false; end if;
  -- Managed Auth always has sessions. Only lightweight database fixtures omit it.
  -- A missing claim must not turn off the revoked-session check in production.
  if to_regclass('auth.sessions') is not null then
    session_id:=nullif(claims->>'session_id','')::uuid;
    if session_id is null then return false; end if;
    execute 'select exists(select 1 from auth.sessions where id=$1 and user_id=$2)'
      into session_exists using session_id,auth.uid();
    if not session_exists then return false; end if;
  end if;
  return true;
exception when invalid_text_representation then return false;
end $$;

create or replace function public.darsino_can_read_file(file uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public.darsino_authenticated() and exists(
    select 1 from public.darsino_files f where f.id=file and
      case when f.purpose='avatar' then
        f.state<>'deleted' and (f.owner_id=auth.uid() or
          (f.state='ready' and
            exists(select 1 from public.darsino_profiles p where p.id=f.owner_id and p.avatar_file_id=f.id and not p.is_suspended) and
            public.darsino_policy_allows(f.owner_id,'avatarVisibility',auth.uid()) and
            (public.darsino_contacts_linked(f.owner_id,auth.uid()) or
             exists(select 1 from public.darsino_tutors where user_id=f.owner_id and verification='approved') or
             public.darsino_can_read_file_account_base(file))))
      else public.darsino_can_read_file_account_base(file) end)
$$;

do $$ begin
  if to_regprocedure('public.darsino_mutate_access_base(jsonb)') is null then
    alter function public.darsino_mutate(jsonb) rename to darsino_mutate_access_base;
  end if;
end $$;

create or replace function public.darsino_mutate(command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); peer uuid; op text:=command->>'type';
begin
  perform public.darsino_assert(command->>'actorId'=me::text,'Akkaunt o‘zgardi. Amalni qayta boshlang.');
  if op='request' then
    peer:=(command->'request'->>'tutorId')::uuid;
    perform public.darsino_assert(not public.darsino_blocked(me,peer),'Bu foydalanuvchi bilan aloqa cheklangan.');
  elsif op='decide' and command->>'decision'='approved' then
    select student_id into peer from public.darsino_applications
      where id=(command->>'requestId')::uuid and tutor_id=me;
    perform public.darsino_assert(not public.darsino_blocked(me,peer),'Bu foydalanuvchi bilan aloqa cheklangan.');
  end if;
  return public.darsino_mutate_access_base(command);
end $$;

create or replace function public.darsino_send_file_message(p_file_id uuid,p_text text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); f public.darsino_files; message uuid; recipient uuid; clean text;
begin
  f:=public.darsino_owned_file(p_file_id,'chat');
  select message_id into message from public.darsino_message_files where file_id=f.id;
  -- Upload retries return the existing send without another debit or notification.
  if message is not null then return message; end if;
  perform public.darsino_assert(public.darsino_can_message(f.conversation_id),'Suhbatga yozish huquqi yo‘q.');
  recipient:=case when split_part(f.conversation_id,':',2)::uuid=me then split_part(f.conversation_id,':',3)::uuid else split_part(f.conversation_id,':',2)::uuid end;
  clean:=coalesce(nullif(trim(p_text),''),f.original_name);
  perform public.darsino_assert(char_length(clean) between 1 and 2000,'Xabar uzunligi noto‘g‘ri.');
  perform public.darsino_account_rate('message',60,60);
  insert into public.darsino_messages(conversation_id,sender_id,recipient_id,text)
    values(f.conversation_id,me,recipient,clean) returning id into message;
  insert into public.darsino_message_files(message_id,file_id) values(message,f.id);
  -- A later notification trigger owns delivery when that feature is installed.
  if to_regprocedure('public.darsino_notify_new_message(uuid)') is null then
    insert into public.darsino_notifications(user_id,title,body) values(recipient,'Yangi fayl',f.original_name);
  end if;
  return message;
end $$;

revoke all on function public.darsino_mutate_access_base(jsonb),public.darsino_can_read_file(uuid),
  public.darsino_session_secure() from public,anon,authenticated;
revoke all on function public.darsino_mutate(jsonb),public.darsino_send_file_message(uuid,text) from public,anon,authenticated;
grant execute on function public.darsino_mutate(jsonb),public.darsino_send_file_message(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;
