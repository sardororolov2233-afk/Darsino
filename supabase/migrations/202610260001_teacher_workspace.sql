-- Group conversations and tutor-created mock tests. Existing marketplace data is retained.
begin;

create table if not exists public.oqi_group_messages (
  id uuid primary key, offering_id uuid not null references public.darsino_offerings(id),
  sender_id uuid not null references public.darsino_profiles(id),
  text text not null check(char_length(text) between 1 and 2000),
  announcement boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists oqi_group_messages_page on public.oqi_group_messages(offering_id,created_at desc,id desc);
create table if not exists public.oqi_group_reads (
  offering_id uuid not null references public.darsino_offerings(id),
  user_id uuid not null references public.darsino_profiles(id),
  read_until timestamptz not null default '-infinity', primary key(offering_id,user_id)
);
create table if not exists public.oqi_mock_tests (
  id uuid primary key, tutor_id uuid not null references public.darsino_profiles(id),
  offering_id uuid not null references public.darsino_offerings(id),
  title text not null check(char_length(title) between 3 and 150), subject text not null,
  source text not null check(source in ('file','manual','catalog')),
  file_id uuid unique references public.darsino_files(id),
  question_count integer not null check(question_count between 1 and 50),
  minutes integer not null check(minutes between 5 and 240),
  difficulty text not null check(difficulty in ('easy','medium','advanced')),
  scoring text not null check(scoring in ('uniform','dtm')),
  questions jsonb not null default '[]', answer_key jsonb not null,
  status text not null default 'draft' check(status in ('draft','published')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists oqi_mock_tests_group on public.oqi_mock_tests(offering_id,status,created_at desc);
create table if not exists public.oqi_mock_attempts (
  id uuid primary key default gen_random_uuid(), test_id uuid not null references public.oqi_mock_tests(id),
  student_id uuid not null references public.darsino_profiles(id), started_at timestamptz not null default now(),
  answers jsonb, correct_count integer, score numeric, max_score numeric, percentage integer,
  completed_at timestamptz, unique(test_id,student_id)
);
create index if not exists oqi_mock_attempts_student on public.oqi_mock_attempts(student_id,completed_at desc);

do $$ declare n text; begin
  foreach n in array array['oqi_group_messages','oqi_group_reads','oqi_mock_tests','oqi_mock_attempts'] loop
    execute format('alter table public.%I enable row level security',n);
    execute format('revoke all on table public.%I from public,anon,authenticated',n);
  end loop;
end $$;

create or replace function public.oqi_classroom_access(p_group uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public.darsino_authenticated() and exists(
    select 1 from public.darsino_offerings o join public.darsino_profiles p on p.id=o.tutor_id
    where o.id=p_group and not p.is_suspended and (o.tutor_id=auth.uid() or (
      exists(select 1 from public.darsino_tutors t where t.user_id=o.tutor_id and t.verification='approved')
      and not public.darsino_blocked(auth.uid(),o.tutor_id)
      and exists(select 1 from public.darsino_enrollments e where e.offering_id=o.id and e.student_id=auth.uid() and e.active))))
$$;
create or replace function public.oqi_group_message_json(m public.oqi_group_messages) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',m.id,'offeringId',m.offering_id,'senderId',m.sender_id,
    'senderName',(select name from public.darsino_profiles where id=m.sender_id),
    'text',m.text,'announcement',m.announcement,'createdAt',m.created_at)
$$;
create or replace function public.oqi_mock_test_json(t public.oqi_mock_tests) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',t.id,'tutorId',t.tutor_id,'offeringId',t.offering_id,'title',t.title,
    'subject',t.subject,'source',t.source,'fileId',t.file_id,'questionCount',t.question_count,
    'minutes',t.minutes,'difficulty',t.difficulty,'scoring',t.scoring,'questions',t.questions,
    'status',t.status,'createdAt',t.created_at,'updatedAt',t.updated_at)
    ||case when t.tutor_id=auth.uid() then jsonb_build_object('answerKey',t.answer_key) else '{}'::jsonb end
$$;
create or replace function public.oqi_mock_attempt_json(a public.oqi_mock_attempts) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',a.id,'testId',a.test_id,'studentId',a.student_id,
    'startedAt',a.started_at,'answers',a.answers,'correctCount',a.correct_count,'score',a.score,
    'maxScore',a.max_score,'percentage',a.percentage,'completedAt',a.completed_at)
$$;

create or replace function public.oqi_classroom_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); result jsonb;
begin
  select jsonb_build_object(
    'groups',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'title',o.data->>'title',
      'subject',o.data->>'subject','tutorId',o.tutor_id,
      'memberCount',(select count(*) from public.darsino_enrollments e where e.offering_id=o.id and e.active),
      'lastMessage',(select public.oqi_group_message_json(m) from public.oqi_group_messages m where m.offering_id=o.id order by m.created_at desc,m.id desc limit 1),
      'announcement',(select public.oqi_group_message_json(m) from public.oqi_group_messages m where m.offering_id=o.id and m.announcement order by m.created_at desc,m.id desc limit 1),
      'unread',(select count(*) from public.oqi_group_messages m where m.offering_id=o.id and m.sender_id<>me and m.created_at>coalesce((select r.read_until from public.oqi_group_reads r where r.offering_id=o.id and r.user_id=me),'-infinity'))
    ) order by o.id) from public.darsino_offerings o where o.data->>'type'='group' and public.oqi_classroom_access(o.id)),'[]'::jsonb),
    'tests',coalesce((select jsonb_agg(public.oqi_mock_test_json(t) order by t.created_at desc) from public.oqi_mock_tests t
      where t.tutor_id=me or (t.status='published' and public.oqi_classroom_access(t.offering_id))),'[]'::jsonb),
    'attempts',coalesce((select jsonb_agg(public.oqi_mock_attempt_json(a) order by a.started_at desc) from public.oqi_mock_attempts a
      join public.oqi_mock_tests t on t.id=a.test_id where t.tutor_id=me or (a.student_id=me and public.oqi_classroom_access(t.offering_id))),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.oqi_group_messages_read(p_group uuid,p_before uuid default null,p_limit integer default 50) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); boundary public.oqi_group_messages; result jsonb;
begin
  perform public.darsino_assert(public.oqi_classroom_access(p_group),'Bu guruh suhbatiga ruxsat yo‘q.');
  if p_before is not null then
    select * into boundary from public.oqi_group_messages where id=p_before and offering_id=p_group;
    perform public.darsino_assert(found,'Xabar sahifasi topilmadi.');
  end if;
  select coalesce(jsonb_agg(public.oqi_group_message_json(m) order by m.created_at,m.id),'[]'::jsonb) into result from (
    select m.* from public.oqi_group_messages m where m.offering_id=p_group
      and (p_before is null or (m.created_at,m.id)<(boundary.created_at,boundary.id))
    order by m.created_at desc,m.id desc limit greatest(1,least(coalesce(p_limit,50),100))) m;
  return result;
end $$;
create or replace function public.oqi_group_message_send(p_group uuid,p_id uuid,p_text text,p_announcement boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); message public.oqi_group_messages; clean text:=trim(p_text);
begin
  perform public.darsino_assert(public.oqi_classroom_access(p_group),'Bu guruh suhbatiga ruxsat yo‘q.');
  perform public.darsino_assert(p_id is not null and char_length(clean) between 1 and 2000,'Xabar 1–2000 belgi bo‘lsin.');
  perform public.darsino_assert(exists(select 1 from public.darsino_profiles where id=me and onboarded),'Avval profilingizni to‘ldiring.');
  perform public.darsino_assert(not exists(select 1 from public.darsino_offerings where id=p_group and tutor_id=me) or exists(select 1 from public.darsino_tutors where user_id=me and verification='approved'),'Tasdiqlangan ustoz profili kerak.');
  perform public.darsino_assert(not p_announcement or exists(select 1 from public.darsino_offerings where id=p_group and tutor_id=me),'E’lonni faqat guruh ustozi yuboradi.');
  perform 1 from public.darsino_profiles where id=me for no key update;
  perform pg_advisory_xact_lock(hashtextextended('oqi-group-message:'||p_id::text,0));
  select * into message from public.oqi_group_messages where id=p_id;
  if found then
    perform public.darsino_assert(message.sender_id=me and message.offering_id=p_group and message.text=clean and message.announcement=p_announcement,'Xabar kaliti boshqa amal uchun ishlatilgan.');
    return public.oqi_group_message_json(message);
  end if;
  perform public.darsino_account_rate('message',60,60);
  insert into public.oqi_group_messages(id,offering_id,sender_id,text,announcement)
    values(p_id,p_group,me,clean,p_announcement) returning * into message;
  return public.oqi_group_message_json(message);
end $$;
create or replace function public.oqi_group_mark_read(p_group uuid,p_until timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id();
begin
  perform public.darsino_assert(public.oqi_classroom_access(p_group),'Bu guruh suhbatiga ruxsat yo‘q.');
  perform public.darsino_assert(p_until is not null,'O‘qilgan xabar vaqti kerak.');
  insert into public.oqi_group_reads(offering_id,user_id,read_until) values(p_group,me,least(now(),p_until))
    on conflict(offering_id,user_id) do update set read_until=greatest(oqi_group_reads.read_until,excluded.read_until);
end $$;

create or replace function public.oqi_mock_test_save(p_test jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); old public.oqi_mock_tests; saved public.oqi_mock_tests;
  group_id uuid:=(p_test->>'offeringId')::uuid; test_id uuid:=(p_test->>'id')::uuid;
  file uuid:=nullif(p_test->>'fileId','')::uuid; n integer:=(p_test->>'questionCount')::integer;
  mins integer:=(p_test->>'minutes')::integer; state text:=p_test->>'status';
  source_kind text:=p_test->>'source'; questions jsonb:=coalesce(p_test->'questions','[]'); keys jsonb:=p_test->'answerKey';
  item jsonb; i integer; was_published boolean:=false;
begin
  perform public.darsino_assert(jsonb_typeof(p_test)='object' and octet_length(p_test::text)<=180000,'Test ma’lumoti juda katta.');
  perform public.darsino_assert(exists(select 1 from public.darsino_offerings o join public.darsino_tutors t on t.user_id=o.tutor_id where o.id=group_id and o.tutor_id=me and t.verification='approved'),'O‘z guruhingiz va tasdiqlangan ustoz profili kerak.');
  perform public.darsino_assert(test_id is not null and char_length(trim(p_test->>'title')) between 3 and 150,'Test nomini kiriting.');
  perform public.darsino_assert(n between 1 and 50 and mins between 5 and 240,'Savollar soni 1–50, vaqt 5–240 daqiqa bo‘lsin.');
  perform public.darsino_assert(state in ('draft','published') and source_kind in ('file','manual','catalog') and p_test->>'difficulty' in ('easy','medium','advanced'),'Test parametrlari noto‘g‘ri.');
  perform public.darsino_assert(p_test->>'scoring' in ('uniform','dtm') and (p_test->>'scoring'<>'dtm' or n=30),'DTM ball tizimi 30 savol uchun.');
  perform public.darsino_assert(exists(select 1 from public.darsino_tutors where user_id=me and data->'subjects' ? (p_test->>'subject')),'Profilingizdagi fanni tanlang.');
  perform public.darsino_assert(jsonb_typeof(keys)='array' and jsonb_array_length(keys)=n,'Har bir savolning javob kalitini kiriting.');
  for item in select * from jsonb_array_elements(keys) loop
    perform public.darsino_assert(item='null'::jsonb and state='draft' or (jsonb_typeof(item)='number' and item::text ~ '^[0-3]$'),'Javoblar A–D oralig‘ida bo‘lsin.');
  end loop;
  if source_kind<>'file' then
    perform public.darsino_assert(jsonb_typeof(questions)='array' and jsonb_array_length(questions)=n,'Savollar matnini kiriting.');
    for item in select * from jsonb_array_elements(questions) loop
      perform public.darsino_assert(jsonb_typeof(item)='object' and char_length(trim(item->>'prompt')) between 1 and 2000 and jsonb_typeof(item->'options')='array' and jsonb_array_length(item->'options')=4,'Savol va to‘rtta javob variantini kiriting.');
      perform public.darsino_assert(not exists(select 1 from jsonb_array_elements(item->'options') v where jsonb_typeof(v)<>'string' or char_length(trim(v#>>'{}')) not between 1 and 500),'Javob variantlari bo‘sh bo‘lmasin.');
    end loop;
    -- A client cannot smuggle a correct answer into student-visible question JSON.
    select jsonb_agg(jsonb_build_object('prompt',q->'prompt','options',q->'options')) into questions from jsonb_array_elements(questions) q;
  else
    questions:='[]';
    perform public.darsino_assert(state='draft' or file is not null,'Savollar faylini yuklang.');
  end if;
  if file is not null then
    perform public.darsino_assert(exists(select 1 from public.darsino_files f where f.id=file and f.owner_id=me and f.purpose='material' and f.offering_id=group_id and f.state='ready' and f.mime_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),'Shu guruh uchun tayyor PDF yoki DOCX fayl kerak.');
  end if;
  perform 1 from public.darsino_profiles where id=me for no key update;
  perform pg_advisory_xact_lock(hashtextextended('oqi-mock-test:'||test_id::text,0));
  select * into old from public.oqi_mock_tests where id=test_id for update;
  if found then
    perform public.darsino_assert(old.tutor_id=me and old.offering_id=group_id,'Boshqa ustoz testini o‘zgartirib bo‘lmaydi.');
    was_published:=old.status='published';
    if exists(select 1 from public.oqi_mock_attempts a where a.test_id=old.id) then
      perform public.darsino_assert((old.title,old.subject,old.source,old.file_id,old.question_count,old.minutes,old.difficulty,old.scoring,old.questions,old.answer_key,old.status)
        is not distinct from (trim(p_test->>'title'),p_test->>'subject',source_kind,file,n,mins,p_test->>'difficulty',p_test->>'scoring',questions,keys,state),'Ishlash boshlangan testni o‘zgartirib bo‘lmaydi.');
      return public.oqi_mock_test_json(old);
    end if;
  end if;
  perform public.darsino_account_rate('mock-test-save',60,60);
  insert into public.oqi_mock_tests(id,tutor_id,offering_id,title,subject,source,file_id,question_count,minutes,difficulty,scoring,questions,answer_key,status)
    values(test_id,me,group_id,trim(p_test->>'title'),p_test->>'subject',source_kind,file,n,mins,p_test->>'difficulty',p_test->>'scoring',questions,keys,state)
    on conflict(id) do update set title=excluded.title,subject=excluded.subject,source=excluded.source,file_id=excluded.file_id,
      question_count=excluded.question_count,minutes=excluded.minutes,difficulty=excluded.difficulty,scoring=excluded.scoring,
      questions=excluded.questions,answer_key=excluded.answer_key,status=excluded.status,updated_at=now()
    returning * into saved;
  if old.file_id is not null and (old.file_id is distinct from file or state='draft') then
    update public.darsino_lesson_files set published=false where file_id=old.file_id;
  end if;
  if file is not null and state='published' then
    insert into public.darsino_lesson_files(offering_id,file_id,title,published) values(group_id,file,saved.title,true)
      on conflict(file_id) do update set title=excluded.title,published=true;
  end if;
  if state='published' and not was_published then
    insert into public.darsino_notifications(user_id,title,body,offering_id)
      select e.student_id,'Yangi mock test',saved.title,group_id from public.darsino_enrollments e where e.offering_id=group_id and e.active;
  end if;
  return public.oqi_mock_test_json(saved);
end $$;

create or replace function public.oqi_mock_begin(p_test uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); t public.oqi_mock_tests; a public.oqi_mock_attempts;
begin
  select * into t from public.oqi_mock_tests where id=p_test for share;
  perform public.darsino_assert(found and t.status='published' and public.oqi_classroom_access(t.offering_id) and exists(select 1 from public.darsino_profiles where id=me and role='student' and onboarded),'Bu testni ishlashga ruxsat yo‘q.');
  perform public.darsino_account_rate('mock-begin',30,60);
  insert into public.oqi_mock_attempts(test_id,student_id) values(t.id,me) on conflict(test_id,student_id) do nothing;
  select * into a from public.oqi_mock_attempts where test_id=t.id and student_id=me;
  return public.oqi_mock_attempt_json(a);
end $$;
create or replace function public.oqi_mock_submit(p_test uuid,p_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); t public.oqi_mock_tests; a public.oqi_mock_attempts;
  i integer; correct integer:=0; points numeric:=0; maximum numeric:=0; weight numeric; answer jsonb;
begin
  select * into t from public.oqi_mock_tests where id=p_test for share;
  perform public.darsino_assert(found and t.status='published' and public.oqi_classroom_access(t.offering_id),'Bu testga ruxsat yo‘q.');
  select * into a from public.oqi_mock_attempts where test_id=p_test and student_id=me for update;
  perform public.darsino_assert(found,'Avval testni boshlang.');
  if a.completed_at is not null then
    perform public.darsino_assert(a.answers=p_answers,'Natija saqlangan. Javoblarni qayta o‘zgartirib bo‘lmaydi.');
    return public.oqi_mock_attempt_json(a);
  end if;
  perform public.darsino_assert(now()<=a.started_at+make_interval(mins=>t.minutes)+interval '20 seconds','Test vaqti yakunlandi.');
  perform public.darsino_assert(jsonb_typeof(p_answers)='array' and jsonb_array_length(p_answers)=t.question_count,'Javoblar soni testga mos bo‘lsin.');
  for i in 0..t.question_count-1 loop
    answer:=p_answers->i;
    perform public.darsino_assert(answer='null'::jsonb or (jsonb_typeof(answer)='number' and answer::text ~ '^[0-3]$'),'Javoblar A–D oralig‘ida bo‘lsin.');
    weight:=case when t.scoring='dtm' then case when i<10 then 1.1 when i<20 then 2.1 else 3.1 end else 1 end;
    maximum:=maximum+weight;
    if answer<>'null'::jsonb and answer=t.answer_key->i then correct:=correct+1; points:=points+weight; end if;
  end loop;
  update public.oqi_mock_attempts set answers=p_answers,correct_count=correct,score=points,max_score=maximum,
    percentage=round(100*points/maximum),completed_at=now() where id=a.id returning * into a;
  insert into public.darsino_notifications(user_id,title,body,offering_id) values(t.tutor_id,'Mock test topshirildi',t.title,t.offering_id);
  return public.oqi_mock_attempt_json(a);
end $$;

drop policy if exists oqi_group_messages_read on public.oqi_group_messages;
create policy oqi_group_messages_read on public.oqi_group_messages for select to authenticated using(public.oqi_classroom_access(offering_id));
grant select on public.oqi_group_messages to authenticated;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='oqi_group_messages') then
    alter publication supabase_realtime add table public.oqi_group_messages;
  end if;
end $$;

revoke all on function public.oqi_classroom_access(uuid),public.oqi_group_message_json(public.oqi_group_messages),public.oqi_mock_test_json(public.oqi_mock_tests),public.oqi_mock_attempt_json(public.oqi_mock_attempts),public.oqi_classroom_snapshot(),public.oqi_group_messages_read(uuid,uuid,integer),public.oqi_group_message_send(uuid,uuid,text,boolean),public.oqi_group_mark_read(uuid,timestamptz),public.oqi_mock_test_save(jsonb),public.oqi_mock_begin(uuid),public.oqi_mock_submit(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.oqi_classroom_access(uuid),public.oqi_classroom_snapshot(),public.oqi_group_messages_read(uuid,uuid,integer),public.oqi_group_message_send(uuid,uuid,text,boolean),public.oqi_group_mark_read(uuid,timestamptz),public.oqi_mock_test_save(jsonb),public.oqi_mock_begin(uuid),public.oqi_mock_submit(uuid,jsonb) to authenticated;

commit;
