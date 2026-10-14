-- Read-only diagnostics for the Supabase SQL Editor. All "ok" values should be true.
select c.relname as table_name,c.relrowsecurity as ok
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relname like 'darsino_%' order by c.relname;

select id,not public as private_ok,file_size_limit,allowed_mime_types
from storage.buckets where id like 'darsino-%' order by id;

select t.name,exists(select 1 from pg_publication_tables p where p.pubname='supabase_realtime' and p.schemaname='public' and p.tablename=t.name) as ok
from unnest(array['darsino_notifications','darsino_messages','darsino_enrollments']) t(name);

select p.proname,not has_function_privilege('anon',p.oid,'execute') as anon_blocked_ok,
  has_function_privilege('authenticated',p.oid,'execute') as authenticated_allowed
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('darsino_snapshot','darsino_mutate','darsino_snapshot_core','darsino_mutate_core','darsino_owned_file','darsino_prepare_upload','darsino_finalize_upload','darsino_submit_document','darsino_send_file_message','darsino_attach_lesson_file') order by p.proname;
-- authenticated_allowed must be FALSE for *_core and owned_file; TRUE for public RPCs.

select c.relname,not has_table_privilege('authenticated',c.oid,'insert,update,delete,truncate') as writes_blocked_ok
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relname like 'darsino_%' order by c.relname;

select policyname,permissive,cmd,roles from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'darsino_%' order by policyname;
-- Expect 4 restrictive guards + SELECT/INSERT/DELETE policies (7 policies).
select exists(select 1 from pg_trigger where tgname='darsino_auth_profile' and not tgisinternal) as auth_trigger_ok;

-- Unfinished uploads: use the authenticated file service / Storage API to remove them.
-- Never DELETE storage.objects rows with SQL: that does not delete the binary object.
select id,owner_id,bucket_id,object_path,state,created_at
from public.darsino_files where state in ('pending','deleting') and created_at<now()-interval '1 day' order by created_at;
