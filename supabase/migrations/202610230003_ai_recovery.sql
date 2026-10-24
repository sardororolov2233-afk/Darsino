begin;

-- A retry must reuse a completed response, wait for a live request, or report a
-- terminal failure. A failed request ID never starts another billable attempt.
create or replace function public.oqi_ai_begin_request(p_request_id uuid,p_conversation_id uuid,p_message text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid; conversation uuid:=p_conversation_id; previous public.oqi_ai_requests;
begin
  begin
    me:=public.darsino_account_id();
  exception when sqlstate 'P0001' then
    raise exception using errcode='OQ403',message='AI yordamchidan foydalanish huquqingiz yo‘q.';
  end;
  -- Serialize both the rolling quotas and all new attempts for this account.
  perform 1 from public.darsino_profiles where id=me and role='student' and onboarded for update;
  if not found then
    raise exception using errcode='OQ403',message='AI yordamchi o‘quvchi akkaunti uchun.';
  end if;
  if p_request_id is null or coalesce(char_length(trim(p_message)),0) not between 1 and 2000 then
    raise exception using errcode='OQ400',message='Savol 1–2000 belgidan iborat bo‘lsin.';
  end if;
  select * into previous from public.oqi_ai_requests where id=p_request_id for update;
  if found then
    if previous.user_id<>me then
      raise exception using errcode='OQ403',message='So‘rov identifikatori band.';
    end if;
    if previous.status='completed' then
      return jsonb_build_object('status','completed','conversationId',previous.conversation_id,
        'reply',(select content from public.oqi_ai_messages where request_id=p_request_id and role='assistant'));
    elsif previous.status='failed' then
      return jsonb_build_object('status','failed','conversationId',previous.conversation_id);
    elsif previous.created_at<=now()-interval '60 seconds' then
      update public.oqi_ai_requests set status='failed',completed_at=now() where id=previous.id;
      return jsonb_build_object('status','expired','conversationId',previous.conversation_id);
    end if;
    return jsonb_build_object('status','pending','conversationId',previous.conversation_id);
  end if;
  update public.oqi_ai_requests set status='failed',completed_at=now()
    where user_id=me and status='pending' and created_at<=now()-interval '60 seconds';
  if exists(select 1 from public.oqi_ai_requests where user_id=me and status='pending') then
    raise exception using errcode='OQ429',message='Avvalgi javobni kuting.';
  end if;
  if (select count(*) from public.oqi_ai_requests where user_id=me and created_at>now()-interval '1 minute')>=5 then
    raise exception using errcode='OQ429',message='Bir daqiqada 5 ta savol mumkin. Biroz kuting.';
  end if;
  if (select count(*) from public.oqi_ai_requests where user_id=me and created_at>now()-interval '24 hours')>=30 then
    raise exception using errcode='OQ429',message='24 soatlik 30 ta savol limiti tugadi.';
  end if;
  if conversation is null then
    insert into public.oqi_ai_conversations(user_id) values(me) returning id into conversation;
  elsif not exists(select 1 from public.oqi_ai_conversations where id=conversation and user_id=me) then
    raise exception using errcode='OQ403',message='Suhbat topilmadi.';
  end if;
  insert into public.oqi_ai_requests(id,user_id,conversation_id) values(p_request_id,me,conversation);
  insert into public.oqi_ai_messages(conversation_id,request_id,role,content) values(conversation,p_request_id,'user',trim(p_message));
  return jsonb_build_object('status','reserved','conversationId',conversation,'messages',coalesce((select jsonb_agg(jsonb_build_object('role',m.role,'content',m.content) order by m.id) from (
    select m.* from public.oqi_ai_messages m join public.oqi_ai_requests r on r.id=m.request_id
    where m.conversation_id=conversation and (r.status='completed' or r.id=p_request_id) order by m.id desc limit 15
  ) m),'[]'::jsonb));
end $$;

revoke all on function public.oqi_ai_begin_request(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.oqi_ai_begin_request(uuid,uuid,text) to authenticated;

commit;
