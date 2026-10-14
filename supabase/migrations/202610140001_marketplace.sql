-- Apply with the Supabase SQL editor or `supabase db push`.
-- The client can only call authenticated, scoped RPCs; it cannot edit authority columns.
begin;
create table public.darsino_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null default '', name text not null default '', city text not null default 'Toshkent',
  area text not null default 'Yunusobod', role text not null default 'student' check (role in ('student','tutor','moderator')),
  interests jsonb not null default '["Ingliz tili"]', goal text not null default 'IELTS / CEFR', onboarded boolean not null default false
);
create table public.darsino_tutors (
  user_id uuid primary key references public.darsino_profiles(id),
  verification text not null default 'pending' check (verification in ('pending','approved','rejected')),
  moderation_note text not null default '', data jsonb not null
);
create table public.darsino_offerings (
  id uuid primary key default gen_random_uuid(), tutor_id uuid not null references public.darsino_tutors(user_id),
  published boolean not null default true, capacity integer not null check (capacity between 1 and 100), data jsonb not null
);
create table public.darsino_sessions (
  id uuid primary key default gen_random_uuid(), offering_id uuid not null references public.darsino_offerings(id),
  starts_at timestamptz not null, ends_at timestamptz not null, check (ends_at > starts_at)
);
create table public.darsino_applications (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.darsino_profiles(id),
  tutor_id uuid not null references public.darsino_tutors(user_id), offering_id uuid references public.darsino_offerings(id),
  kind text not null check (kind in ('group','lesson')), status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  starts_at timestamptz, ends_at timestamptz, note text not null default '', data jsonb not null,
  created_at timestamptz not null default now(), check (offering_id is not null or (starts_at is not null and ends_at > starts_at))
);
create unique index darsino_pending_group on public.darsino_applications(student_id,offering_id) where status='pending' and offering_id is not null;
create unique index darsino_pending_individual on public.darsino_applications(student_id,tutor_id,starts_at) where status='pending' and offering_id is null;
create table public.darsino_enrollments (
  id uuid primary key default gen_random_uuid(), offering_id uuid not null references public.darsino_offerings(id),
  student_id uuid not null references public.darsino_profiles(id), active boolean not null default true,
  created_at timestamptz not null default now(), unique (offering_id,student_id)
);
create table public.darsino_attendance (
  session_id uuid not null references public.darsino_sessions(id), student_id uuid not null references public.darsino_profiles(id),
  status text not null check (status in ('present','absent')), primary key(session_id,student_id)
);
create table public.darsino_reviews (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.darsino_sessions(id),
  student_id uuid not null references public.darsino_profiles(id), tutor_id uuid not null references public.darsino_tutors(user_id),
  rating integer not null check (rating between 1 and 5), text text not null check (char_length(text) between 3 and 1000),
  created_at timestamptz not null default now(), unique(session_id,student_id)
);
create table public.darsino_messages (
  id uuid primary key default gen_random_uuid(), conversation_id text not null,
  sender_id uuid not null references public.darsino_profiles(id), recipient_id uuid not null references public.darsino_profiles(id),
  text text not null check (char_length(text) between 1 and 2000), created_at timestamptz not null default now()
);
create table public.darsino_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.darsino_profiles(id),
  title text not null, body text not null, read boolean not null default false,
  offering_id uuid references public.darsino_offerings(id), created_at timestamptz not null default now()
);
create table public.darsino_favorites (
  user_id uuid not null references public.darsino_profiles(id), tutor_id uuid not null references public.darsino_tutors(user_id), primary key(user_id,tutor_id)
);
create index darsino_sessions_offering on public.darsino_sessions(offering_id,starts_at);
create index darsino_applications_tutor on public.darsino_applications(tutor_id,status);
create index darsino_applications_student on public.darsino_applications(student_id);
create index darsino_enrollments_student on public.darsino_enrollments(student_id,active);
create index darsino_messages_members on public.darsino_messages(sender_id,recipient_id,created_at);
create index darsino_notifications_user on public.darsino_notifications(user_id,created_at);

-- No direct table grants or permissive RLS policies: all access passes through scoped RPCs.
do $$ declare t text; begin
  foreach t in array array['profiles','tutors','offerings','sessions','applications','enrollments','attendance','reviews','messages','notifications','favorites'] loop
    execute format('alter table public.darsino_%I enable row level security',t);
    execute format('revoke all on table public.darsino_%I from anon, authenticated',t);
  end loop;
end $$;

create function public.darsino_assert(ok boolean, message text) returns void language plpgsql set search_path=public,pg_temp as $$
begin if ok is distinct from true then raise exception '%',message using errcode='P0001'; end if; end $$;
create function public.darsino_tutor_data(value jsonb) returns jsonb language plpgsql set search_path=public,pg_temp as $$
begin
  perform public.darsino_assert(jsonb_typeof(value->'subjects')='array' and jsonb_array_length(value->'subjects') between 1 and 20, 'Kamida bitta fanni tanlang.');
  perform public.darsino_assert(not exists(select 1 from jsonb_array_elements_text(value->'subjects') s where char_length(trim(s)) not between 1 and 80), 'Fan noto‘g‘ri.');
  perform public.darsino_assert((value->>'experience')::numeric between 0 and 60, 'Tajriba 0–60 yil oralig‘ida bo‘lsin.');
  perform public.darsino_assert(char_length(trim(value->>'specialty')) between 2 and 120 and char_length(trim(value->>'bio')) between 10 and 2000 and char_length(trim(value->>'proof')) between 5 and 2000, 'Mutaxassislik, tasdiqlash ma’lumoti va darslaringiz haqida yozing.');
  perform public.darsino_assert((value->>'price')::numeric > 0 and (value->>'price')::numeric <= 100000000, 'Narx noto‘g‘ri.');
  perform public.darsino_assert(jsonb_typeof(value->'modes')='array' and jsonb_array_length(value->'modes') between 1 and 2 and not exists(select 1 from jsonb_array_elements_text(value->'modes') m where m not in ('Onlayn','Oflayn')), 'Dars shaklini tanlang.');
  perform public.darsino_assert(jsonb_typeof(value->'availability')='array' and jsonb_array_length(value->'availability') between 1 and 24 and not exists(select 1 from jsonb_array_elements_text(value->'availability') t where t !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'), 'Jadval vaqti HH:MM shaklida bo‘lsin.');
  return jsonb_build_object('subjects',value->'subjects','specialty',trim(value->>'specialty'),'experience',(value->>'experience')::numeric,'proof',trim(value->>'proof'),'bio',trim(value->>'bio'),'price',(value->>'price')::numeric,'modes',value->'modes','availability',value->'availability');
end $$;

create function public.darsino_snapshot() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare me uuid := auth.uid(); actor public.darsino_profiles; result jsonb;
begin
  perform public.darsino_assert(me is not null, 'Avval akkauntga kiring.');
  insert into public.darsino_profiles(id,phone) select id,'+'||ltrim(coalesce(phone,''),'+') from auth.users where id=me on conflict(id) do nothing;
  select * into actor from public.darsino_profiles where id=me;
  perform public.darsino_assert(actor.id is not null, 'Akkaunt topilmadi.');
  select jsonb_build_object(
    'version',2,
    'users',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'phone',case when p.id=me then p.phone else '' end,'city',p.city,'area',p.area,'role',p.role,'interests',p.interests,'goal',case when p.id=me then p.goal else '' end,'onboarded',p.onboarded)) from public.darsino_profiles p where p.id=me or exists(select 1 from public.darsino_tutors t where t.user_id=p.id and (t.verification='approved' or actor.role='moderator')) or exists(select 1 from public.darsino_applications a where a.tutor_id=me and a.student_id=p.id) or exists(select 1 from public.darsino_enrollments e join public.darsino_offerings o on o.id=e.offering_id where o.tutor_id=me and e.student_id=p.id) or exists(select 1 from public.darsino_messages m where (m.sender_id=me and m.recipient_id=p.id) or (m.recipient_id=me and m.sender_id=p.id))), '[]'::jsonb),
    'tutorProfiles',coalesce((select jsonb_agg((case when t.user_id=me or actor.role='moderator' then t.data else (t.data-'proof')||jsonb_build_object('proof','') end)||jsonb_build_object('userId',t.user_id,'verification',t.verification,'moderationNote',case when t.user_id=me or actor.role='moderator' then t.moderation_note else '' end,'studentCount',(select count(distinct e.student_id) from public.darsino_enrollments e join public.darsino_offerings o on o.id=e.offering_id where o.tutor_id=t.user_id))) from public.darsino_tutors t where t.verification='approved' or t.user_id=me or actor.role='moderator'), '[]'::jsonb),
    'offerings',coalesce((select jsonb_agg(o.data||jsonb_build_object('id',o.id,'tutorId',o.tutor_id,'tutor',p.name,'capacity',o.capacity,'published',o.published,'reservedSeats',0,'enrolledCount',stats.n,'students',stats.n,'spots',greatest(0,o.capacity-stats.n))) from public.darsino_offerings o join public.darsino_profiles p on p.id=o.tutor_id join public.darsino_tutors t on t.user_id=o.tutor_id cross join lateral (select count(*)::int n from public.darsino_enrollments e where e.offering_id=o.id and e.active) stats where (o.published and t.verification='approved') or o.tutor_id=me or exists(select 1 from public.darsino_enrollments e where e.offering_id=o.id and e.student_id=me and e.active)), '[]'::jsonb),
    'sessions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'offeringId',s.offering_id,'title',o.data->>'title','startsAt',s.starts_at,'endsAt',s.ends_at,'location',o.data->>'location','mode',o.data->>'mode')) from public.darsino_sessions s join public.darsino_offerings o on o.id=s.offering_id join public.darsino_tutors t on t.user_id=o.tutor_id where (o.published and t.verification='approved') or o.tutor_id=me or exists(select 1 from public.darsino_enrollments e where e.offering_id=o.id and e.student_id=me and e.active)), '[]'::jsonb),
    'applications',coalesce((select jsonb_agg(a.data||jsonb_build_object('id',a.id,'studentId',a.student_id,'tutorId',a.tutor_id,'groupId',a.offering_id,'kind',a.kind,'status',a.status,'note',a.note,'startsAt',a.starts_at,'endsAt',a.ends_at,'createdAt',a.created_at,'conversationId','dm:'||a.student_id::text||':'||a.tutor_id::text) order by a.created_at desc) from public.darsino_applications a where a.student_id=me or a.tutor_id=me), '[]'::jsonb),
    'enrollments',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'offeringId',e.offering_id,'studentId',e.student_id,'active',e.active,'createdAt',e.created_at)) from public.darsino_enrollments e join public.darsino_offerings o on o.id=e.offering_id where e.student_id=me or o.tutor_id=me), '[]'::jsonb),
    'attendance',coalesce((select jsonb_agg(jsonb_build_object('sessionId',a.session_id,'studentId',a.student_id,'status',a.status)) from public.darsino_attendance a join public.darsino_sessions s on s.id=a.session_id join public.darsino_offerings o on o.id=s.offering_id where a.student_id=me or o.tutor_id=me), '[]'::jsonb),
    'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'sessionId',r.session_id,'studentId',r.student_id,'tutorId',r.tutor_id,'rating',r.rating,'text',r.text,'createdAt',r.created_at) order by r.created_at desc) from public.darsino_reviews r join public.darsino_tutors t on t.user_id=r.tutor_id where t.verification='approved' or r.student_id=me or r.tutor_id=me), '[]'::jsonb),
    'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'conversationId',m.conversation_id,'senderId',m.sender_id,'recipientId',m.recipient_id,'text',m.text,'time',to_char(m.created_at at time zone 'Asia/Tashkent','HH24:MI'),'mine',m.sender_id=me) order by m.created_at) from public.darsino_messages m where m.sender_id=me or m.recipient_id=me), '[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'userId',n.user_id,'title',n.title,'body',n.body,'read',n.read,'offeringId',n.offering_id,'createdAt',n.created_at) order by n.created_at desc) from public.darsino_notifications n where n.user_id=me), '[]'::jsonb),
    'favorites',jsonb_build_object(me::text,coalesce((select jsonb_agg(f.tutor_id) from public.darsino_favorites f where f.user_id=me),'[]'::jsonb))
  ) into result;
  return jsonb_build_object('market',result,'user',(select u from jsonb_array_elements(result->'users') u where u->>'id'=me::text));
end $$;

create function public.darsino_mutate(command jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  me uuid:=auth.uid(); actor public.darsino_profiles; teacher public.darsino_tutors;
  op text:=command->>'type'; value jsonb; lesson jsonb; target uuid; new_id uuid;
  offering public.darsino_offerings; application public.darsino_applications; session public.darsino_sessions;
  start_time timestamptz; end_time timestamptz; cap integer; decision text; student uuid; tutor uuid; clean text; v_note text;
begin
  perform public.darsino_assert(me is not null, 'Avval akkauntga kiring.');
  perform public.darsino_assert(command->>'actorId'=me::text,'Akkaunt o‘zgardi. Amalni qayta boshlang.');
  insert into public.darsino_profiles(id,phone) select id,'+'||ltrim(coalesce(phone,''),'+') from auth.users where id=me on conflict(id) do nothing;
  -- Serializes commands from one actor, including profile edits and individual approvals.
  select * into actor from public.darsino_profiles where id=me for update;
  select * into teacher from public.darsino_tutors where user_id=me;
  if op in ('offering','decide','attendance','remove-participant','update-session','offering-visibility') then
    perform public.darsino_assert(actor.role='tutor' and teacher.verification='approved','Profil moderator tomonidan tasdiqlanishi kerak.');
  end if;
  if op in ('request','cancel','review') then perform public.darsino_assert(actor.role='student' and actor.onboarded,'Ushbu amal o‘quvchi uchun.'); end if;
  case op
  when 'profile' then
    value:=command->'profile';
    perform public.darsino_assert(char_length(trim(value->>'name')) between 2 and 100 and char_length(trim(value->>'city')) between 2 and 100 and char_length(trim(value->>'area')) between 2 and 100 and char_length(trim(value->>'goal')) between 1 and 200 and jsonb_typeof(value->'interests')='array' and jsonb_array_length(value->'interests') between 1 and 20, 'Ism, shahar, hudud, fan va maqsadni to‘ldiring.');
    perform public.darsino_assert(command->>'role' is null or command->>'role' in ('student','tutor'),'Rol noto‘g‘ri.');
    perform public.darsino_assert(not exists(select 1 from jsonb_array_elements_text(value->'interests') s where char_length(trim(s)) not between 1 and 80),'Fan noto‘g‘ri.');
    if not actor.onboarded then actor.role:=coalesce(command->>'role',actor.role); end if;
    if actor.role='tutor' and not actor.onboarded then perform public.darsino_assert(command->'tutor' is not null, 'Repetitor profilini to‘ldiring.'); end if;
    update public.darsino_profiles set name=trim(value->>'name'),city=trim(value->>'city'),area=trim(value->>'area'),goal=trim(value->>'goal'),interests=value->'interests',role=actor.role,onboarded=true where id=me;
    if actor.role='tutor' and command->'tutor' is not null then
      value:=public.darsino_tutor_data(command->'tutor');
      insert into public.darsino_tutors(user_id,data) values(me,value) on conflict(user_id) do update set data=excluded.data,verification='pending',moderation_note='';
      insert into public.darsino_notifications(user_id,title,body) select id,'Yangi repetitor arizasi',trim(command->'profile'->>'name') from public.darsino_profiles where role='moderator';
    end if;
  when 'tutor-profile' then
    perform public.darsino_assert(actor.role='tutor','Repetitor hisobiga kiring.');
    value:=public.darsino_tutor_data(command->'profile');
    insert into public.darsino_tutors(user_id,data) values(me,value) on conflict(user_id) do update set data=excluded.data,verification='pending',moderation_note='';
    insert into public.darsino_notifications(user_id,title,body) select id,'Repetitor profili tekshiruvda',actor.name from public.darsino_profiles where role='moderator';
  when 'moderate' then
    perform public.darsino_assert(actor.role='moderator','Faqat moderator profilni tasdiqlaydi.');
    target:=(command->>'tutorId')::uuid; decision:=command->>'decision'; v_note:=trim(coalesce(command->>'note',''));
    perform public.darsino_assert(decision in ('approved','rejected') and (decision='approved' or char_length(v_note)>=3),'Qaror va rad etish sababini kiriting.');
    perform 1 from public.darsino_tutors where user_id=target and verification='pending' for update;
    perform public.darsino_assert(found,'Tekshiriladigan profil topilmadi.');
    update public.darsino_tutors set verification=decision,moderation_note=v_note where user_id=target;
    insert into public.darsino_notifications(user_id,title,body) values(target,case when decision='approved' then 'Profilingiz tasdiqlandi' else 'Profilni tuzatish kerak' end,case when v_note='' then 'Endi dars va guruh yaratishingiz mumkin.' else v_note end);
  when 'offering' then
    value:=command->'offering';
    perform public.darsino_assert(char_length(trim(value->>'title')) between 3 and 150 and teacher.data->'subjects' ? (value->>'subject'),'Dars nomi va profilingizdagi fanni tanlang.');
    perform public.darsino_assert(value->>'type' in ('group','individual') and value->>'mode' in ('Onlayn','Oflayn') and teacher.data->'modes' ? (value->>'mode'),'Dars shakli noto‘g‘ri.');
    perform public.darsino_assert(char_length(trim(value->>'area')) between 2 and 100 and char_length(trim(value->>'location')) between 3 and 500 and (value->>'price')::numeric > 0 and (value->>'price')::numeric <= 100000000,'Hudud, manzil va narxni kiriting.');
    cap:=case when value->>'type'='individual' then 1 else (value->>'capacity')::integer end;
    perform public.darsino_assert(cap between 1 and 100 and jsonb_typeof(value->'sessions')='array' and jsonb_array_length(value->'sessions') between 1 and 50,'O‘rinlar soni 1–100, darslar 1–50 ta bo‘lsin.');
    perform public.darsino_assert(jsonb_typeof(coalesce(value->'benefits','[]'::jsonb))='array' and jsonb_array_length(coalesce(value->'benefits','[]'::jsonb))<=20 and not exists(select 1 from jsonb_array_elements(coalesce(value->'benefits','[]'::jsonb)) b where jsonb_typeof(b)<>'string' or char_length(b::text)>502),'Guruh tavsifi noto‘g‘ri.');
    select (s->>'startsAt')::timestamptz,(s->>'endsAt')::timestamptz into start_time,end_time from jsonb_array_elements(value->'sessions') s order by (s->>'startsAt')::timestamptz limit 1;
    insert into public.darsino_offerings(tutor_id,capacity,data) values(me,cap,jsonb_build_object('title',trim(value->>'title'),'subject',value->>'subject','type',value->>'type','price',(value->>'price')::numeric,'mode',value->>'mode','area',trim(value->>'area'),'location',trim(value->>'location'),'days',coalesce(value->>'days','Jadval bo‘yicha'),'time',to_char(start_time at time zone 'Asia/Tashkent','HH24:MI'),'benefits',coalesce(value->'benefits','[]'::jsonb),'lessons',jsonb_array_length(value->'sessions'),'duration',extract(epoch from end_time-start_time)/60)) returning id into new_id;
    for lesson in select s from jsonb_array_elements(value->'sessions') s loop
      start_time:=(lesson->>'startsAt')::timestamptz; end_time:=(lesson->>'endsAt')::timestamptz;
      perform public.darsino_assert(start_time>now() and end_time>start_time and end_time<=start_time+interval '12 hours','Kelajakdagi sana va to‘g‘ri davomiylikni tanlang.');
      perform public.darsino_assert(not exists(select 1 from public.darsino_sessions s join public.darsino_offerings o on o.id=s.offering_id where o.tutor_id=me and s.starts_at<end_time and s.ends_at>start_time),'Bu vaqtda boshqa darsingiz bor.');
      insert into public.darsino_sessions(offering_id,starts_at,ends_at) values(new_id,start_time,end_time);
    end loop;
  when 'request' then
    value:=command->'request'; tutor:=(value->>'tutorId')::uuid; target:=nullif(value->>'groupId','')::uuid;
    perform public.darsino_assert(value->>'kind' in ('group','lesson') and exists(select 1 from public.darsino_tutors where user_id=tutor and verification='approved'),'Tasdiqlangan ustoz va darsni tanlang.');
    if target is not null then
      select * into offering from public.darsino_offerings where id=target and tutor_id=tutor and published for update;
      perform public.darsino_assert(offering.id is not null,'Ochiq guruh topilmadi.');
      perform public.darsino_assert(exists(select 1 from public.darsino_sessions where offering_id=target and starts_at>now()),'Guruhning kelajakdagi darsi yo‘q.');
      perform public.darsino_assert(not exists(select 1 from public.darsino_enrollments where offering_id=target and student_id=me and active),'Siz bu guruhga qo‘shilgansiz.');
      perform public.darsino_assert((select count(*) from public.darsino_enrollments where offering_id=target and active)<offering.capacity,'Guruhda bo‘sh o‘rin qolmagan.');
      select id into new_id from public.darsino_applications where student_id=me and offering_id=target and status='pending';
      value:=jsonb_build_object('title',offering.data->>'title','subtitle',offering.data->>'subject','time',(offering.data->>'days')||' · '||(offering.data->>'time'),'price',offering.data->'price');
    else
      perform public.darsino_assert(value->>'kind'='lesson','Guruhni tanlang.');
      start_time:=(value->>'startsAt')::timestamptz; end_time:=(value->>'endsAt')::timestamptz;
      perform public.darsino_assert(start_time>now() and end_time>start_time and end_time<=start_time+interval '12 hours','Kelajakdagi dars vaqtini tanlang.');
      select id into new_id from public.darsino_applications where student_id=me and tutor_id=tutor and starts_at=start_time and offering_id is null and status='pending';
      perform public.darsino_assert(exists(select 1 from public.darsino_tutors t where t.user_id=tutor and (nullif(value->>'subtitle','') is null or t.data->'subjects' ? (value->>'subtitle'))),'Ustozning fanini tanlang.');
      value:=(select jsonb_build_object('title',p.name||' · individual dars','subtitle',coalesce(nullif(value->>'subtitle',''),t.data->'subjects'->>0),'time',to_char(start_time at time zone 'Asia/Tashkent','DD.MM.YYYY HH24:MI'),'price',t.data->'price') from public.darsino_tutors t join public.darsino_profiles p on p.id=t.user_id where t.user_id=tutor);
    end if;
    if new_id is null then
      insert into public.darsino_applications(student_id,tutor_id,offering_id,kind,starts_at,ends_at,data) values(me,tutor,target,case when target is null then 'lesson' else command->'request'->>'kind' end,start_time,end_time,value) returning id into new_id;
      insert into public.darsino_notifications(user_id,title,body,offering_id) values(tutor,'Yangi o‘quvchi arizasi',actor.name||' · '||(value->>'title'),target);
    end if;
  when 'decide' then
    target:=(command->>'requestId')::uuid; decision:=command->>'decision'; v_note:=trim(coalesce(command->>'note',''));
    perform public.darsino_assert(decision in ('approved','rejected') and (decision='approved' or char_length(v_note)>=3),'Qaror va rad etish sababini kiriting.');
    select * into application from public.darsino_applications where id=target and tutor_id=me for update;
    perform public.darsino_assert(application.id is not null,'Bu arizani boshqarish huquqingiz yo‘q.');
    perform public.darsino_assert(application.status='pending','Arizaga allaqachon javob berilgan.');
    if decision='approved' then
      if application.offering_id is null then
        perform public.darsino_assert(application.starts_at>now(),'Dars vaqti o‘tib ketgan.');
        perform public.darsino_assert(not exists(select 1 from public.darsino_sessions s join public.darsino_offerings o on o.id=s.offering_id where o.tutor_id=me and s.starts_at<application.ends_at and s.ends_at>application.starts_at),'Bu vaqtda boshqa darsingiz bor.');
        insert into public.darsino_offerings(tutor_id,published,capacity,data) values(me,false,1,jsonb_build_object('title',application.data->>'title','subject',application.data->>'subtitle','type','individual','price',application.data->'price','mode',teacher.data->'modes'->>0,'area',actor.area,'location',case when teacher.data->'modes'->>0='Onlayn' then 'Onlayn dars — havolani ustoz yuboradi' else actor.area end,'days','Individual dars','time',to_char(application.starts_at at time zone 'Asia/Tashkent','HH24:MI'),'benefits','[]'::jsonb,'lessons',1,'duration',extract(epoch from application.ends_at-application.starts_at)/60)) returning id into application.offering_id;
        insert into public.darsino_sessions(offering_id,starts_at,ends_at) values(application.offering_id,application.starts_at,application.ends_at);
      end if;
      -- Lock the same offering for every approval, even when requests belong to different students.
      select * into offering from public.darsino_offerings where id=application.offering_id and tutor_id=me for update;
      perform public.darsino_assert(offering.id is not null and exists(select 1 from public.darsino_sessions where offering_id=offering.id and starts_at>now()),'Guruhning kelajakdagi darsi yo‘q.');
      perform public.darsino_assert((select count(*) from public.darsino_enrollments where offering_id=offering.id and active)<offering.capacity,'Guruhdagi oxirgi o‘rin band bo‘ldi.');
      perform public.darsino_assert(not exists(select 1 from public.darsino_enrollments where offering_id=offering.id and student_id=application.student_id and active),'O‘quvchi allaqachon guruhda.');
      insert into public.darsino_enrollments(offering_id,student_id) values(offering.id,application.student_id) on conflict(offering_id,student_id) do update set active=true,created_at=now();
    end if;
    update public.darsino_applications set status=decision,note=v_note,offering_id=application.offering_id where id=target;
    insert into public.darsino_notifications(user_id,title,body,offering_id) values(application.student_id,case when decision='approved' then 'Arizangiz tasdiqlandi' else 'Arizangiz rad etildi' end,case when v_note='' then application.data->>'title' else v_note end,application.offering_id);
  when 'cancel' then
    target:=(command->>'requestId')::uuid;
    select * into application from public.darsino_applications where id=target and student_id=me for update;
    perform public.darsino_assert(application.id is not null and application.status='pending','Faqat o‘zingizning kutilayotgan arizangiz bekor qilinadi.');
    update public.darsino_applications set status='cancelled' where id=target;
    insert into public.darsino_notifications(user_id,title,body,offering_id) values(application.tutor_id,'Ariza bekor qilindi',actor.name,application.offering_id);
  when 'attendance' then
    target:=(command->>'sessionId')::uuid; student:=(command->>'studentId')::uuid;
    select s.* into session from public.darsino_sessions s join public.darsino_offerings o on o.id=s.offering_id where s.id=target and o.tutor_id=me;
    perform public.darsino_assert(session.id is not null and session.starts_at<=now(),'Faqat boshlangan o‘z darsingizda davomat belgilanadi.');
    perform public.darsino_assert(exists(select 1 from public.darsino_enrollments where offering_id=session.offering_id and student_id=student and active),'O‘quvchi bu darsda qatnashmaydi.');
    insert into public.darsino_attendance(session_id,student_id,status) values(target,student,command->>'status') on conflict(session_id,student_id) do update set status=excluded.status;
  when 'review' then
    target:=(command->>'sessionId')::uuid; clean:=trim(command->>'text');
    select * into session from public.darsino_sessions where id=target;
    perform public.darsino_assert(session.id is not null and session.ends_at<now() and exists(select 1 from public.darsino_attendance where session_id=target and student_id=me and status='present'),'Fikr uchun tugagan darsda qatnashgan bo‘lishingiz kerak.');
    select tutor_id into tutor from public.darsino_offerings where id=session.offering_id;
    insert into public.darsino_reviews(session_id,student_id,tutor_id,rating,text) values(target,me,tutor,(command->>'rating')::integer,clean);
  when 'message' then
    clean:=trim(command->>'text');
    perform public.darsino_assert(command->>'conversationId' ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$','Suhbat noto‘g‘ri.');
    student:=split_part(command->>'conversationId',':',2)::uuid; tutor:=split_part(command->>'conversationId',':',3)::uuid;
    perform public.darsino_assert(me in (student,tutor) and exists(select 1 from public.darsino_profiles where id=student and role='student' and onboarded) and exists(select 1 from public.darsino_tutors where user_id=tutor and verification='approved'),'Suhbatda qatnashish huquqingiz yo‘q.');
    insert into public.darsino_messages(conversation_id,sender_id,recipient_id,text) values(command->>'conversationId',me,case when me=student then tutor else student end,clean);
  when 'favorite' then
    target:=(command->>'id')::uuid;
    perform public.darsino_assert(exists(select 1 from public.darsino_tutors where user_id=target and verification='approved'),'Repetitor topilmadi.');
    delete from public.darsino_favorites where user_id=me and tutor_id=target;
    if not found then insert into public.darsino_favorites(user_id,tutor_id) values(me,target); end if;
  when 'read-notifications' then update public.darsino_notifications set read=true where user_id=me;
  when 'update-session' then
    target:=(command->>'sessionId')::uuid; start_time:=(command->>'startsAt')::timestamptz; end_time:=(command->>'endsAt')::timestamptz;
    select s.* into session from public.darsino_sessions s join public.darsino_offerings o on o.id=s.offering_id where s.id=target and o.tutor_id=me for update of s;
    perform public.darsino_assert(session.id is not null and session.starts_at>now() and start_time>now() and end_time>start_time and end_time<=start_time+interval '12 hours','Faqat kelgusi dars vaqtini o‘zgartiring.');
    perform public.darsino_assert(not exists(select 1 from public.darsino_sessions s join public.darsino_offerings o on o.id=s.offering_id where s.id<>target and o.tutor_id=me and s.starts_at<end_time and s.ends_at>start_time),'Bu vaqtda boshqa darsingiz bor.');
    update public.darsino_sessions set starts_at=start_time,ends_at=end_time where id=target;
    update public.darsino_offerings set data=jsonb_set(data,'{time}',to_jsonb((select to_char(min(starts_at) at time zone 'Asia/Tashkent','HH24:MI') from public.darsino_sessions where offering_id=session.offering_id))) where id=session.offering_id;
    insert into public.darsino_notifications(user_id,title,body,offering_id) select e.student_id,'Dars vaqti o‘zgardi',(o.data->>'title')||' · yangi jadvalni tekshiring.',o.id from public.darsino_enrollments e join public.darsino_offerings o on o.id=e.offering_id where o.id=session.offering_id and e.active;
  when 'offering-visibility' then
    target:=(command->>'offeringId')::uuid;
    perform public.darsino_assert(jsonb_typeof(command->'published')='boolean','E’lon holati noto‘g‘ri.');
    update public.darsino_offerings set published=(command->>'published')::boolean where id=target and tutor_id=me;
    perform public.darsino_assert(found,'Bu darsni boshqarish huquqingiz yo‘q.');
  when 'remove-participant' then
    target:=(command->>'offeringId')::uuid; student:=(command->>'studentId')::uuid;
    select * into offering from public.darsino_offerings where id=target and tutor_id=me for update;
    perform public.darsino_assert(offering.id is not null,'Bu darsni boshqarish huquqingiz yo‘q.');
    update public.darsino_enrollments set active=false where offering_id=target and student_id=student and active;
    perform public.darsino_assert(found,'Qatnashchi topilmadi.');
    insert into public.darsino_notifications(user_id,title,body,offering_id) values(student,'Guruh tarkibi o‘zgardi',(offering.data->>'title')||' guruhi bo‘yicha ustozga yozing.',target);
  else raise exception 'Amal topilmadi.';
  end case;
  return public.darsino_snapshot()||jsonb_build_object('id',new_id);
end $$;
revoke all on function public.darsino_assert(boolean,text),public.darsino_tutor_data(jsonb),public.darsino_snapshot(),public.darsino_mutate(jsonb) from public,anon;
grant execute on function public.darsino_snapshot(),public.darsino_mutate(jsonb) to authenticated;
commit;
