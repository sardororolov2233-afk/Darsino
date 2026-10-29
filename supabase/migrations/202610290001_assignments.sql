-- Additive homework module. No existing users, lessons or objects are removed.
begin;
create table if not exists public.oqi_assignments (
  id uuid primary key, offering_id uuid not null references public.darsino_offerings(id),
  teacher_id uuid not null references public.darsino_profiles(id),
  title text not null check(char_length(title) between 3 and 150),
  description text not null default '' check(char_length(description)<=10000),
  subject text not null, due_at timestamptz not null,
  status text not null default 'draft' check(status in ('draft','published','archived')),
  recipient_ids uuid[] not null default '{}', file_ids uuid[] not null default '{}',
  revision integer not null default 1, published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists oqi_assignments_group_due on public.oqi_assignments(offering_id,status,due_at);
create table if not exists public.oqi_assignment_submissions (
  id uuid primary key, assignment_id uuid not null references public.oqi_assignments(id),
  student_id uuid not null references public.darsino_profiles(id), version integer not null,
  content text not null default '' check(char_length(content)<=10000), file_ids uuid[] not null default '{}',
  status text not null default 'submitted' check(status in ('submitted','accepted','changes_requested')),
  feedback text not null default '' check(char_length(feedback)<=5000),
  submitted_at timestamptz not null default now(), reviewed_at timestamptz,
  unique(assignment_id,student_id,version)
);
create index if not exists oqi_assignment_submissions_owner on public.oqi_assignment_submissions(student_id,submitted_at desc);
create table if not exists public.oqi_assignment_files (
  id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.oqi_assignments(id),
  owner_id uuid not null references public.darsino_profiles(id), scope text not null check(scope in ('task','answer')),
  name text not null, mime text not null, size_bytes bigint not null check(size_bytes between 1 and 10485760),
  object_path text not null unique, state text not null default 'pending' check(state in ('pending','ready','deleting','deleted')),
  created_at timestamptz not null default now()
);
create index if not exists oqi_assignment_files_owner on public.oqi_assignment_files(owner_id,created_at);
create table if not exists public.oqi_assignment_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.darsino_profiles(id),
  event_key text not null, assignment_id uuid not null references public.oqi_assignments(id),
  title text not null, body text not null, read boolean not null default false,
  created_at timestamptz not null default now(), unique(user_id,event_key)
);
create index if not exists oqi_assignment_events_user on public.oqi_assignment_events(user_id,created_at desc);

create or replace function public.oqi_assignment_owner(p_group uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.darsino_authenticated() and exists(select 1 from public.darsino_offerings o join public.darsino_tutors t on t.user_id=o.tutor_id where o.id=p_group and o.tutor_id=auth.uid() and t.verification='approved')
$$;
create or replace function public.oqi_assignment_access(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.darsino_authenticated() and exists(select 1 from public.oqi_assignments a where a.id=p_id and public.oqi_classroom_access(a.offering_id) and
 (a.teacher_id=auth.uid() or (a.status<>'draft' and (cardinality(a.recipient_ids)=0 or auth.uid()=any(a.recipient_ids)))))
$$;
create or replace function public.oqi_assignment_file_access(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.darsino_authenticated() and exists(select 1 from public.oqi_assignment_files f where f.id=p_id and f.state='ready' and
 (f.owner_id=auth.uid() or (public.oqi_assignment_access(f.assignment_id) and (
 exists(select 1 from public.oqi_assignments a where a.id=f.assignment_id and f.id=any(a.file_ids)) or
 exists(select 1 from public.oqi_assignment_submissions s join public.oqi_assignments a on a.id=s.assignment_id where s.assignment_id=f.assignment_id and f.id=any(s.file_ids) and auth.uid() in (s.student_id,a.teacher_id))))))
$$;

-- RLS reads are also safe if an API client bypasses the application RPCs.
alter table public.oqi_assignments enable row level security;
alter table public.oqi_assignment_submissions enable row level security;
alter table public.oqi_assignment_files enable row level security;
alter table public.oqi_assignment_events enable row level security;
revoke all on public.oqi_assignments,public.oqi_assignment_submissions,public.oqi_assignment_files,public.oqi_assignment_events from public,anon,authenticated;
grant select on public.oqi_assignments,public.oqi_assignment_submissions,public.oqi_assignment_files,public.oqi_assignment_events to authenticated;
drop policy if exists oqi_assignments_read on public.oqi_assignments;
create policy oqi_assignments_read on public.oqi_assignments for select to authenticated using(public.oqi_assignment_access(id));
drop policy if exists oqi_submissions_read on public.oqi_assignment_submissions;
create policy oqi_submissions_read on public.oqi_assignment_submissions for select to authenticated using(public.oqi_assignment_access(assignment_id) and (student_id=auth.uid() or exists(select 1 from public.oqi_assignments a where a.id=assignment_id and a.teacher_id=auth.uid())));
drop policy if exists oqi_assignment_files_read on public.oqi_assignment_files;
create policy oqi_assignment_files_read on public.oqi_assignment_files for select to authenticated using(public.oqi_assignment_file_access(id) or (public.darsino_authenticated() and owner_id=auth.uid() and state in ('pending','deleting')));
drop policy if exists oqi_assignment_events_read on public.oqi_assignment_events;
create policy oqi_assignment_events_read on public.oqi_assignment_events for select to authenticated using(public.darsino_authenticated() and user_id=auth.uid());

create or replace function public.oqi_assignments_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id();
begin
 return jsonb_build_object(
 'assignments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'offeringId',a.offering_id,'teacherId',a.teacher_id,'title',a.title,'description',a.description,'subject',a.subject,'dueAt',a.due_at,'status',a.status,'recipientIds',case when a.teacher_id=me then to_jsonb(a.recipient_ids) else '[]'::jsonb end,'fileIds',a.file_ids,'revision',a.revision,'publishedAt',a.published_at,'createdAt',a.created_at) order by a.due_at) from public.oqi_assignments a where public.oqi_assignment_access(a.id)),'[]'::jsonb),
 'submissions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'assignmentId',s.assignment_id,'studentId',s.student_id,'version',s.version,'content',s.content,'fileIds',s.file_ids,'status',s.status,'feedback',s.feedback,'submittedAt',s.submitted_at,'reviewedAt',s.reviewed_at) order by s.version desc) from public.oqi_assignment_submissions s join public.oqi_assignments a on a.id=s.assignment_id where public.oqi_assignment_access(a.id) and me in (s.student_id,a.teacher_id)),'[]'::jsonb),
 'files',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'assignmentId',f.assignment_id,'ownerId',f.owner_id,'scope',f.scope,'name',f.name,'mime',f.mime,'sizeBytes',f.size_bytes,'objectPath',f.object_path,'state',f.state)) from public.oqi_assignment_files f where public.oqi_assignment_file_access(f.id) or (f.owner_id=me and f.state in ('pending','deleting'))),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'assignmentId',e.assignment_id,'title',e.title,'body',e.body,'read',e.read,'createdAt',e.created_at) order by e.created_at desc) from (select * from public.oqi_assignment_events where user_id=me order by created_at desc limit 100) e),'[]'::jsonb));
end $$;
create or replace function public.oqi_assignment_save(p_assignment jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); old public.oqi_assignments;
 target uuid:=(p_assignment->>'id')::uuid; grp uuid:=(p_assignment->>'offeringId')::uuid;
 recipients uuid[]:=array(select distinct value::uuid from jsonb_array_elements_text(coalesce(p_assignment->'recipientIds','[]')) order by value::uuid);
 files uuid[]:=array(select distinct value::uuid from jsonb_array_elements_text(coalesce(p_assignment->'fileIds','[]')) order by value::uuid);
 title_value text:=trim(p_assignment->>'title'); body text:=coalesce(p_assignment->>'description','');
 state text:=p_assignment->>'status'; due timestamptz:=(p_assignment->>'dueAt')::timestamptz;
 rev integer:=coalesce((p_assignment->>'revision')::integer,0);
begin
 perform public.darsino_assert(octet_length(p_assignment::text)<=20000 and target is not null and public.oqi_assignment_owner(grp),'O‘z guruhingiz va tasdiqlangan ustoz profili kerak.');
 perform public.darsino_assert(char_length(title_value) between 3 and 150 and char_length(body)<=10000 and state in ('draft','published') and due is not null and isfinite(due),'Vazifa nomi, muddat va tavsifni tekshiring.');
 perform public.darsino_assert(cardinality(recipients)<=100 and cardinality(files)<=5,'Ko‘pi bilan 100 o‘quvchi va 5 fayl tanlang.');
 perform public.darsino_assert(exists(select 1 from public.darsino_offerings where id=grp and data->>'subject'=p_assignment->>'subject'),'Guruh fanini tanlang.');
 perform public.darsino_assert(not exists(select 1 from unnest(recipients) r where not exists(select 1 from public.darsino_enrollments e where e.offering_id=grp and e.student_id=r and e.active)),'Faqat guruhingizdagi o‘quvchini tanlang.');
 perform pg_advisory_xact_lock(hashtextextended('oqi-assignment:'||target::text,0));
 select * into old from public.oqi_assignments where id=target for update;
 if found then
  perform public.darsino_assert(old.teacher_id=me and old.offering_id=grp,'Boshqa ustoz vazifasini o‘zgartirib bo‘lmaydi.');
  if (old.title,old.description,old.subject,old.due_at,old.status,old.recipient_ids,old.file_ids) is not distinct from (title_value,body,p_assignment->>'subject',due,state,recipients,files) then return target; end if;
  perform public.darsino_assert(old.status='draft' and old.revision=rev,'Vazifa o‘zgargan yoki allaqachon e’lon qilingan. Yangilang.');
 else
  perform public.darsino_assert(rev=0,'Vazifa topilmadi.');
 end if;
 perform 1 from public.oqi_assignment_files where id=any(files) order by id for update;
 perform public.darsino_assert(not exists(select 1 from unnest(files) f where not exists(select 1 from public.oqi_assignment_files x where x.id=f and x.owner_id=me and x.assignment_id=target and x.scope='task' and x.state='ready')),'Vazifaga tegishli tayyor fayllarni tanlang.');
 if state='published' then perform public.darsino_assert(due>now(),'Muddat kelajakda bo‘lsin.'); end if;
 perform public.darsino_account_rate('assignment-save',60,60);
 insert into public.oqi_assignments(id,offering_id,teacher_id,title,description,subject,due_at,status,recipient_ids,file_ids,published_at)
 values(target,grp,me,title_value,body,p_assignment->>'subject',due,state,recipients,files,case when state='published' then now() end)
 on conflict(id) do update set title=excluded.title,description=excluded.description,subject=excluded.subject,due_at=excluded.due_at,status=excluded.status,recipient_ids=excluded.recipient_ids,file_ids=excluded.file_ids,revision=oqi_assignments.revision+1,published_at=excluded.published_at,updated_at=now();
 if state='published' then
  insert into public.oqi_assignment_events(user_id,event_key,assignment_id,title,body)
  select e.student_id,'published:'||target,target,'Yangi uy vazifasi',title_value from public.darsino_enrollments e where e.offering_id=grp and e.active and (cardinality(recipients)=0 or e.student_id=any(recipients)) on conflict(user_id,event_key) do nothing;
 end if;
 return target;
end $$;
create or replace function public.oqi_assignment_submit(p_id uuid,p_assignment uuid,p_content text,p_files uuid[] default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); a public.oqi_assignments; prior public.oqi_assignment_submissions; latest public.oqi_assignment_submissions;
 content_value text:=trim(coalesce(p_content,'')); files uuid[]:=array(select distinct v from unnest(coalesce(p_files,'{}')) v order by v);
begin
 perform public.darsino_assert(public.oqi_assignment_access(p_assignment),'Bu vazifaga ruxsat yo‘q.');
 select * into a from public.oqi_assignments where id=p_assignment for update;
 perform public.darsino_assert(a.teacher_id<>me and exists(select 1 from public.darsino_profiles where id=me and role='student'),'Faqat o‘quvchi javob topshiradi.');
 perform public.darsino_assert(p_id is not null and char_length(content_value)<=10000 and (char_length(content_value)>0 or cardinality(files)>0) and cardinality(files)<=5,'Javob yozing yoki 5 tagacha fayl biriktiring.');
 perform pg_advisory_xact_lock(hashtextextended('oqi-submission:'||p_id::text,0));
 select * into prior from public.oqi_assignment_submissions where id=p_id;
 if found then
  perform public.darsino_assert(prior.student_id=me and prior.assignment_id=p_assignment and prior.content=content_value and prior.file_ids=files,'Javob kaliti boshqa amal uchun ishlatilgan.'); return p_id;
 end if;
 perform public.darsino_assert(a.status='published','Vazifa topshirish uchun ochiq emas.');
 perform 1 from public.oqi_assignment_files where id=any(files) order by id for update;
 perform public.darsino_assert(not exists(select 1 from unnest(files) f where not exists(select 1 from public.oqi_assignment_files x where x.id=f and x.owner_id=me and x.assignment_id=p_assignment and x.scope='answer' and x.state='ready')),'Faqat o‘z javob fayllaringizni biriktiring.');
 select * into latest from public.oqi_assignment_submissions where assignment_id=p_assignment and student_id=me order by version desc limit 1;
 perform public.darsino_assert(latest.id is null or latest.status='changes_requested','Javob tekshiruvda yoki qabul qilingan.');
 perform public.darsino_account_rate('assignment-submit',60,30);
 insert into public.oqi_assignment_submissions(id,assignment_id,student_id,version,content,file_ids) values(p_id,p_assignment,me,coalesce(latest.version,0)+1,content_value,files);
 insert into public.oqi_assignment_events(user_id,event_key,assignment_id,title,body) values(a.teacher_id,'submitted:'||p_id,p_assignment,'Uy vazifasi topshirildi',a.title) on conflict(user_id,event_key) do nothing;
 return p_id;
end $$;
create or replace function public.oqi_assignment_review(p_submission uuid,p_status text,p_feedback text) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); s public.oqi_assignment_submissions; a public.oqi_assignments; note text:=trim(coalesce(p_feedback,''));
begin
 select * into s from public.oqi_assignment_submissions where id=p_submission;
 select * into a from public.oqi_assignments where id=s.assignment_id for update;
 perform public.darsino_assert(a.teacher_id=me and public.oqi_assignment_owner(a.offering_id),'Faqat guruh ustozi javobni tekshiradi.');
 select * into s from public.oqi_assignment_submissions where id=p_submission for update;
 perform public.darsino_assert(p_status in ('accepted','changes_requested') and char_length(note)<=5000 and (p_status<>'changes_requested' or char_length(note)>0),'Qayta ishlash uchun izoh yozing.');
 if s.status=p_status and s.feedback=note then return; end if;
 perform public.darsino_assert(s.status='submitted','Bu javob allaqachon tekshirilgan.');
 update public.oqi_assignment_submissions set status=p_status,feedback=note,reviewed_at=now() where id=p_submission;
 insert into public.oqi_assignment_events(user_id,event_key,assignment_id,title,body) values(s.student_id,'reviewed:'||p_submission,a.id,case when p_status='accepted' then 'Vazifangiz qabul qilindi' else 'Vazifani qayta ishlang' end,a.title) on conflict(user_id,event_key) do nothing;
end $$;
create or replace function public.oqi_assignment_archive(p_assignment uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.darsino_assert(exists(select 1 from public.oqi_assignments a where a.id=p_assignment and public.oqi_assignment_owner(a.offering_id)),'Faqat o‘z vazifangizni yoping.');
 update public.oqi_assignments set status='archived',revision=revision+1,updated_at=now() where id=p_assignment and status<>'archived';
end $$;
create or replace function public.oqi_assignment_events_read() returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); begin update public.oqi_assignment_events set read=true where user_id=me and not read; end $$;

-- A separate private bucket prevents assignment answers becoming public material.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('oqi-homework','oqi-homework',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.oqi_assignment_file_prepare(p_assignment uuid,p_scope text,p_name text,p_mime text,p_size bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); f public.oqi_assignment_files; target uuid:=gen_random_uuid(); a public.oqi_assignments;
begin
 select * into a from public.oqi_assignments where id=p_assignment;
 perform public.darsino_assert(public.oqi_assignment_access(p_assignment) and ((p_scope='task' and a.status='draft' and public.oqi_assignment_owner(a.offering_id)) or (p_scope='answer' and a.status='published' and a.teacher_id<>me and exists(select 1 from public.darsino_profiles where id=me and role='student'))),'Fayl yuklashga ruxsat yo‘q.');
 perform public.darsino_assert(p_mime in ('application/pdf','image/jpeg','image/png','image/webp') and p_size between 1 and 10485760 and char_length(p_name) between 1 and 160,'PDF yoki rasm, 10 MB gacha fayl tanlang.');
 perform 1 from public.darsino_profiles where id=me for no key update;
 perform public.darsino_assert((select count(*) from public.oqi_assignment_files where owner_id=me and created_at>now()-interval '1 hour')<40 and (select coalesce(sum(case when state in ('pending','deleting') then 10485760 else size_bytes end),0) from public.oqi_assignment_files where owner_id=me and state<>'deleted')+10485760<=104857600,'Uy vazifasi fayllari limiti tugadi.');
 insert into public.oqi_assignment_files(id,assignment_id,owner_id,scope,name,mime,size_bytes,object_path) values(target,p_assignment,me,p_scope,p_name,p_mime,p_size,me::text||'/'||target::text) returning * into f;
 return jsonb_build_object('id',f.id,'assignmentId',f.assignment_id,'ownerId',f.owner_id,'scope',f.scope,'name',f.name,'mime',f.mime,'sizeBytes',f.size_bytes,'objectPath',f.object_path,'state',f.state);
end $$;
create or replace function public.oqi_assignment_file_ready(p_file uuid) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); f public.oqi_assignment_files;
begin
 select * into f from public.oqi_assignment_files where id=p_file and owner_id=me for update;
 perform public.darsino_assert(found,'Fayl topilmadi.');
 perform public.darsino_assert(exists(select 1 from storage.objects o where o.bucket_id='oqi-homework' and o.name=f.object_path and o.owner_id=me::text and (o.metadata->>'size')::bigint=f.size_bytes and o.metadata->>'mimetype'=f.mime),'Fayl yuklanishi tugamagan.');
 update public.oqi_assignment_files set state='ready' where id=p_file;
end $$;
create or replace function public.oqi_homework_upload_allowed(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.darsino_authenticated() and exists(select 1 from public.oqi_assignment_files f join public.oqi_assignments a on a.id=f.assignment_id where f.object_path=p_path and f.owner_id=auth.uid() and f.state='pending' and f.created_at>now()-interval '1 hour' and public.oqi_assignment_access(f.assignment_id) and ((f.scope='task' and a.status='draft') or (f.scope='answer' and a.status='published')))
$$;
drop policy if exists oqi_homework_upload on storage.objects;
create policy oqi_homework_upload on storage.objects for insert to authenticated with check(bucket_id='oqi-homework' and public.oqi_homework_upload_allowed(name));
drop policy if exists oqi_homework_download on storage.objects;
create policy oqi_homework_download on storage.objects for select to authenticated using(bucket_id='oqi-homework' and exists(select 1 from public.oqi_assignment_files f where f.object_path=storage.objects.name and (public.oqi_assignment_file_access(f.id) or (f.owner_id=auth.uid() and f.state='deleting'))));
create or replace function public.oqi_assignment_file_remove_begin(p_file uuid) returns text
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); f public.oqi_assignment_files;
begin
 select * into f from public.oqi_assignment_files where id=p_file and owner_id=me for update;
 perform public.darsino_assert(found,'Fayl topilmadi.');
 perform public.darsino_assert(not exists(select 1 from public.oqi_assignments a where p_file=any(a.file_ids)) and not exists(select 1 from public.oqi_assignment_submissions s where p_file=any(s.file_ids)),'Biriktirilgan yoki topshirilgan faylni o‘chirib bo‘lmaydi.');
 if f.state<>'deleted' then update public.oqi_assignment_files set state='deleting' where id=p_file; end if;
 return f.object_path;
end $$;
create or replace function public.oqi_assignment_file_remove_end(p_file uuid) returns void
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); f public.oqi_assignment_files;
begin
 select * into f from public.oqi_assignment_files where id=p_file and owner_id=me for update;
 perform public.darsino_assert(found and f.state in ('deleting','deleted'),'Avval faylni o‘chirishni boshlang.');
 perform public.darsino_assert(not exists(select 1 from storage.objects o where o.bucket_id='oqi-homework' and o.name=f.object_path),'Storage faylini avval o‘chiring.');
 update public.oqi_assignment_files set state='deleted' where id=p_file;
end $$;
create or replace function public.oqi_homework_remove_allowed(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.darsino_authenticated() and exists(select 1 from public.oqi_assignment_files where object_path=p_path and owner_id=auth.uid() and state='deleting')
$$;
drop policy if exists oqi_homework_remove on storage.objects;
create policy oqi_homework_remove on storage.objects for delete to authenticated using(bucket_id='oqi-homework' and public.oqi_homework_remove_allowed(name));
-- No public bucket, overwrite policy or public signed URLs.
do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('oqi_assignment_owner','oqi_assignment_access','oqi_assignment_file_access','oqi_assignments_snapshot','oqi_assignment_save','oqi_assignment_submit','oqi_assignment_review','oqi_assignment_archive','oqi_assignment_events_read','oqi_assignment_file_prepare','oqi_assignment_file_ready','oqi_homework_upload_allowed','oqi_assignment_file_remove_begin','oqi_assignment_file_remove_end','oqi_homework_remove_allowed') loop
 execute format('revoke all on function %s from public,anon',f.sig); execute format('grant execute on function %s to authenticated',f.sig);
 end loop;
end $$;
commit;
