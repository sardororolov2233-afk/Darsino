begin;

-- Only tutors' deliberately published teaching addresses are stored here.
-- A student's live GPS position is a query parameter, never a profile field.
create table if not exists public.oqi_tutor_locations (
  tutor_id uuid primary key references public.darsino_tutors(user_id),
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  label text not null check(char_length(trim(label)) between 3 and 200),
  updated_at timestamptz not null default now()
);
alter table public.oqi_tutor_locations enable row level security;
revoke all on public.oqi_tutor_locations from public,anon,authenticated;

create or replace function public.oqi_save_tutor_location(p_latitude double precision,p_longitude double precision,p_label text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); begin
  perform public.darsino_assert(exists(select 1 from public.darsino_tutors where user_id=me),'Faqat ustoz manzil saqlaydi.');
  perform public.darsino_assert(p_latitude between -90 and 90 and p_longitude between -180 and 180,'Koordinatalar noto‘g‘ri.');
  perform public.darsino_assert(char_length(trim(p_label)) between 3 and 200,'Manzil nomini kiriting.');
  insert into public.oqi_tutor_locations(tutor_id,latitude,longitude,label) values(me,p_latitude,p_longitude,trim(p_label))
  on conflict(tutor_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,label=excluded.label,updated_at=now();
end $$;
create or replace function public.oqi_own_tutor_location() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); begin
  return (select jsonb_build_object('tutorId',tutor_id,'latitude',latitude,'longitude',longitude,'label',label) from public.oqi_tutor_locations where tutor_id=me);
end $$;
create or replace function public.oqi_delete_tutor_location() returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); begin
  delete from public.oqi_tutor_locations where tutor_id=me;
end $$;
create or replace function public.oqi_nearby_tutors(p_tutor_ids uuid[],p_latitude double precision default null,p_longitude double precision default null,p_radius_km double precision default 25) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.darsino_account_id();
  perform public.darsino_assert(coalesce(cardinality(p_tutor_ids),0)<=200,'Juda ko‘p ustoz tanlandi.');
  perform public.darsino_assert((p_latitude is null and p_longitude is null) or (p_latitude between -90 and 90 and p_longitude between -180 and 180),'Koordinatalar noto‘g‘ri.');
  perform public.darsino_assert(p_radius_km between 1 and 100,'Masofa 1–100 km bo‘lishi kerak.');
  return coalesce((select jsonb_agg(jsonb_build_object('tutorId',x.tutor_id,'latitude',x.latitude,'longitude',x.longitude,'label',x.label,'distanceKm',x.distance_km) order by x.distance_km nulls last,x.tutor_id) from (
    select l.*,case when p_latitude is null then null else
      6371.0*2*asin(sqrt(least(1.0,greatest(0.0,power(sin(radians(l.latitude-p_latitude)/2),2)+cos(radians(p_latitude))*cos(radians(l.latitude))*power(sin(radians(l.longitude-p_longitude)/2),2))))) end distance_km
    from public.oqi_tutor_locations l join public.darsino_tutors t on t.user_id=l.tutor_id
    join public.darsino_profiles p on p.id=l.tutor_id
    where l.tutor_id=any(p_tutor_ids) and t.verification='approved' and p.onboarded and not p.is_suspended
  ) x where x.distance_km is null or x.distance_km<=p_radius_km),'[]'::jsonb);
end $$;

create table if not exists public.oqi_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.darsino_profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists oqi_ai_conversations_user on public.oqi_ai_conversations(user_id,created_at desc);
create table if not exists public.oqi_ai_requests (
  id uuid primary key,
  user_id uuid not null references public.darsino_profiles(id),
  conversation_id uuid not null references public.oqi_ai_conversations(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','completed','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists oqi_ai_requests_rate on public.oqi_ai_requests(user_id,created_at desc);
create table if not exists public.oqi_ai_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.oqi_ai_conversations(id) on delete cascade,
  request_id uuid not null references public.oqi_ai_requests(id) on delete cascade,
  role text not null check(role in ('user','assistant')),
  content text not null check(char_length(content) between 1 and 8000),
  created_at timestamptz not null default now(),
  unique(request_id,role)
);
create index if not exists oqi_ai_messages_conversation on public.oqi_ai_messages(conversation_id,id);
alter table public.oqi_ai_conversations enable row level security;
alter table public.oqi_ai_requests enable row level security;
alter table public.oqi_ai_messages enable row level security;
revoke all on public.oqi_ai_conversations,public.oqi_ai_requests,public.oqi_ai_messages from public,anon,authenticated;

create or replace function public.oqi_ai_history(p_conversation_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); conversation uuid; begin
  select id into conversation from public.oqi_ai_conversations where user_id=me and (p_conversation_id is null or id=p_conversation_id) order by created_at desc,id limit 1;
  perform public.darsino_assert(p_conversation_id is null or conversation is not null,'Suhbat topilmadi.');
  return jsonb_build_object('conversationId',conversation,'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id::text,'role',m.role,'content',m.content) order by m.id) from (
    select m.* from public.oqi_ai_messages m join public.oqi_ai_requests r on r.id=m.request_id
    where m.conversation_id=conversation and r.status='completed' order by m.id desc limit 100
  ) m),'[]'::jsonb));
end $$;

create or replace function public.oqi_ai_begin_request(p_request_id uuid,p_conversation_id uuid,p_message text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); conversation uuid:=p_conversation_id; previous public.oqi_ai_requests; begin
  -- Serialize per account: concurrent Edge instances share one atomic quota.
  perform 1 from public.darsino_profiles where id=me and role='student' and onboarded for update;
  perform public.darsino_assert(found,'AI yordamchi o‘quvchi akkaunti uchun.');
  perform public.darsino_assert(p_request_id is not null and char_length(trim(p_message)) between 1 and 2000,'Savol 1–2000 belgidan iborat bo‘lsin.');
  select * into previous from public.oqi_ai_requests where id=p_request_id;
  if found then
    perform public.darsino_assert(previous.user_id=me,'So‘rov identifikatori band.');
    perform public.darsino_assert(previous.status='completed','Bu so‘rov bajarilmoqda yoki yakunlanmagan. Qayta urinib ko‘ring.');
    return jsonb_build_object('conversationId',previous.conversation_id,'reply',(select content from public.oqi_ai_messages where request_id=p_request_id and role='assistant'));
  end if;
  update public.oqi_ai_requests set status='failed',completed_at=now() where user_id=me and status='pending' and created_at<now()-interval '60 seconds';
  perform public.darsino_assert(not exists(select 1 from public.oqi_ai_requests where user_id=me and status='pending'),'Avvalgi javobni kuting.');
  perform public.darsino_assert((select count(*) from public.oqi_ai_requests where user_id=me and created_at>now()-interval '1 minute')<5,'Bir daqiqada 5 ta savol mumkin. Biroz kuting.');
  perform public.darsino_assert((select count(*) from public.oqi_ai_requests where user_id=me and created_at>now()-interval '24 hours')<30,'24 soatlik 30 ta savol limiti tugadi.');
  if conversation is null then
    insert into public.oqi_ai_conversations(user_id) values(me) returning id into conversation;
  else
    perform public.darsino_assert(exists(select 1 from public.oqi_ai_conversations where id=conversation and user_id=me),'Suhbat topilmadi.');
  end if;
  insert into public.oqi_ai_requests(id,user_id,conversation_id) values(p_request_id,me,conversation);
  insert into public.oqi_ai_messages(conversation_id,request_id,role,content) values(conversation,p_request_id,'user',trim(p_message));
  return jsonb_build_object('conversationId',conversation,'messages',coalesce((select jsonb_agg(jsonb_build_object('role',m.role,'content',m.content) order by m.id) from (
    select m.* from public.oqi_ai_messages m join public.oqi_ai_requests r on r.id=m.request_id
    where m.conversation_id=conversation and (r.status='completed' or r.id=p_request_id) order by m.id desc limit 15
  ) m),'[]'::jsonb));
end $$;

-- The app cannot forge assistant replies. Only the server credential can finish.
create or replace function public.oqi_ai_finish_request(p_user_id uuid,p_request_id uuid,p_reply text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.oqi_ai_requests; begin
  select * into r from public.oqi_ai_requests where id=p_request_id and user_id=p_user_id for update;
  perform public.darsino_assert(found and r.status='pending','Faol AI so‘rovi topilmadi.');
  if p_reply is null then
    update public.oqi_ai_requests set status='failed',completed_at=now() where id=r.id;
  else
    perform public.darsino_assert(char_length(trim(p_reply)) between 1 and 8000,'AI javobi bo‘sh yoki juda uzun.');
    insert into public.oqi_ai_messages(conversation_id,request_id,role,content) values(r.conversation_id,r.id,'assistant',trim(p_reply));
    update public.oqi_ai_requests set status='completed',completed_at=now() where id=r.id;
  end if;
end $$;

revoke all on function public.oqi_save_tutor_location(double precision,double precision,text),public.oqi_own_tutor_location(),public.oqi_delete_tutor_location(),public.oqi_nearby_tutors(uuid[],double precision,double precision,double precision),public.oqi_ai_history(uuid),public.oqi_ai_begin_request(uuid,uuid,text),public.oqi_ai_finish_request(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.oqi_save_tutor_location(double precision,double precision,text),public.oqi_own_tutor_location(),public.oqi_delete_tutor_location(),public.oqi_nearby_tutors(uuid[],double precision,double precision,double precision),public.oqi_ai_history(uuid),public.oqi_ai_begin_request(uuid,uuid,text) to authenticated;
grant execute on function public.oqi_ai_finish_request(uuid,uuid,text) to service_role;

commit;
