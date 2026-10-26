-- Read-only diagnostics for the Supabase SQL Editor. All "ok" values should be true.
select c.relname as table_name,c.relrowsecurity as ok
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and (c.relname like 'darsino_%' or c.relname like 'oqi_%') order by c.relname;

select id,not public as private_ok,file_size_limit,allowed_mime_types
from storage.buckets where id like 'darsino-%' order by id;

select t.name,exists(select 1 from pg_publication_tables p where p.pubname='supabase_realtime' and p.schemaname='public' and p.tablename=t.name) as ok
from unnest(array['darsino_notifications','darsino_messages','darsino_enrollments','darsino_group_invitations','darsino_contact_requests','oqi_group_messages']) t(name);

select p.proname,not has_function_privilege('anon',p.oid,'execute') as anon_blocked_ok,
  has_function_privilege('authenticated',p.oid,'execute') as authenticated_allowed
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('darsino_snapshot','darsino_mutate','darsino_snapshot_core','darsino_mutate_core','darsino_owned_file','darsino_prepare_upload','darsino_finalize_upload','darsino_submit_document','darsino_send_file_message','darsino_attach_lesson_file','darsino_mutate_access_base','darsino_mutate_schedule_base','darsino_mutate_idempotent_base','darsino_mutate_scheduling','darsino_notify_new_message','darsino_prune_mutation_receipts','oqi_classroom_access','oqi_classroom_snapshot','oqi_group_messages_read','oqi_group_message_send','oqi_group_mark_read','oqi_mock_test_save','oqi_mock_begin','oqi_mock_submit','darsino_mutate_tutor_base','darsino_snapshot_tutor_base','darsino_submit_document_tutor_base','oqi_mock_test_json','oqi_mock_attempt_json','oqi_group_message_json') order by p.proname;
-- authenticated_allowed must be FALSE for *_core, *_base, owned_file, scheduling,
-- notify_new_message, prune_mutation_receipts and oqi_*_json helpers; TRUE for public user RPCs.

select c.relname,not has_table_privilege('authenticated',c.oid,'insert,update,delete,truncate') as writes_blocked_ok
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and (c.relname like 'darsino_%' or c.relname like 'oqi_%') order by c.relname;

select policyname,permissive,cmd,roles from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'darsino_%' order by policyname;
-- Expect 4 restrictive guards + SELECT/INSERT/DELETE policies (7 policies).
select exists(select 1 from pg_trigger where tgname='darsino_auth_profile' and not tgisinternal) as auth_trigger_ok;

-- Unfinished uploads: use the authenticated file service / Storage API to remove them.
-- Never DELETE storage.objects rows with SQL: that does not delete the binary object.
select id,owner_id,bucket_id,object_path,state,created_at
from public.darsino_files where state in ('pending','deleting') and created_at<now()-interval '1 day' order by created_at;

-- Reservation usage must remain charged while bytes exist or uploads are pending.
select owner_id,sum(reserved_size_bytes) as reserved_bytes,
  sum(reserved_size_bytes)<=2147483648 as within_quota
from public.darsino_files where state<>'deleted' group by owner_id order by owner_id;
select p.proname,p.provolatile='v' as upload_lock_enabled
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='darsino_storage_insert';

-- Historical inconsistent states need Storage API cleanup, never SQL deletion.
select f.id,f.bucket_id,f.object_path
from public.darsino_files f join storage.objects o on o.bucket_id=f.bucket_id and o.name=f.object_path
where f.state='deleted';

select count(*) as receipt_count,min(created_at) as oldest_receipt
from public.darsino_mutation_receipts;
-- Schedule service/admin-only darsino_prune_mutation_receipts() according to
-- retention policy. This read-only healthcheck never runs cleanup itself.

-- New tutor applications must have a usable private certificate and contact number.
select a.tutor_id,t.verification,f.state='ready' and f.owner_id=a.tutor_id and f.purpose='verification' as certificate_ok,
  a.contact_phone ~ '^\+[1-9][0-9]{8,14}$' as phone_format_ok
from public.oqi_tutor_applications a join public.darsino_tutors t on t.user_id=a.tutor_id
join public.darsino_files f on f.id=a.certificate_file_id;
