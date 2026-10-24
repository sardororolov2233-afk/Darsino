-- Read-only deployment preflight. Run separately as the project administrator.
-- Every statement is SELECT; this script creates no objects and repairs nothing.
-- Row counts contain no user records, filenames, message contents or credentials.
-- Counts respect the executing role's privileges/RLS; run as administrator for
-- complete counts. COUNT(*) can take time on an established large database.
--
-- Interpret the evidence together, never infer a schema version from counts or
-- object names alone. Core objects without CLI history are compatible with SQL
-- Editor setup OR another unrecorded setup process. History rows do not prove
-- that live definitions match the repository. Review definitions/history before
-- choosing a deployment route; never repair migration history automatically.

select 'managed_schemas' as section,
  current_user as executing_role,
  to_regnamespace('auth') is not null as auth_schema_present,
  to_regclass('auth.users') is not null as auth_users_present,
  to_regprocedure('auth.uid()') is not null as auth_uid_present,
  to_regnamespace('storage') is not null as storage_schema_present,
  to_regclass('storage.buckets') is not null as storage_buckets_present,
  to_regclass('storage.objects') is not null as storage_objects_present;

select 'core_relations' as section, name,
  to_regclass(format('public.%I',name)) is not null as present
from unnest(array[
  'darsino_profiles','darsino_tutors','darsino_offerings','darsino_sessions',
  'darsino_applications','darsino_enrollments','darsino_attendance',
  'darsino_reviews','darsino_messages','darsino_notifications','darsino_favorites'
]) expected(name)
order by name;

-- These are presence markers to guide a definition review, not version claims.
select 'feature_objects' as section, kind, name,
  case when kind='relation' then to_regclass(name) is not null
    else to_regprocedure(name) is not null end as present
from (values
  ('relation','public.darsino_files'),
  ('relation','public.darsino_account_settings'),
  ('relation','public.darsino_private_state'),
  ('relation','public.darsino_mutation_receipts'),
  ('relation','public.oqi_tutor_locations'),
  ('relation','public.oqi_ai_requests'),
  ('function','public.darsino_snapshot()'),
  ('function','public.darsino_mutate(jsonb)'),
  ('function','public.darsino_session_secure()'),
  ('function','public.darsino_mutate_scheduling(jsonb)'),
  ('function','public.darsino_notify_new_message(uuid)'),
  ('function','public.darsino_prune_mutation_receipts(timestamp with time zone)')
) expected(kind,name)
order by kind,name;

-- Optional Supabase CLI history is inspected by name before any dynamic read.
-- SELECT-only query_to_xml avoids referencing absent relations at parse time.
with history as (
  select to_regclass('supabase_migrations.schema_migrations') as relation
)
select 'migration_history' as section,
  to_regnamespace('supabase_migrations') is not null as schema_present,
  relation is not null as table_present,
  coalesce(has_table_privilege(relation,'SELECT'),false) as can_read,
  exists(select 1 from pg_attribute where attrelid=relation and attname='version' and not attisdropped) as version_column_present,
  exists(select 1 from pg_attribute where attrelid=relation and attname='name' and not attisdropped) as name_column_present,
  case when relation is not null and has_table_privilege(relation,'SELECT') then
    ((xpath('/table/row/row_count/text()',query_to_xml(
      'select count(*) as row_count from supabase_migrations.schema_migrations',false,false,'')))[1]::text)::bigint
    else null end as row_count
from history;

-- Never read the optional statements column: migration SQL may contain secrets.
with history as (
  select to_regclass('supabase_migrations.schema_migrations') as relation
), readable as (
  select relation,
    relation is not null and has_table_privilege(relation,'SELECT') and
      exists(select 1 from pg_attribute where attrelid=relation and attname='version' and not attisdropped) as allowed,
    exists(select 1 from pg_attribute where attrelid=relation and attname='name' and not attisdropped) as has_name
  from history
)
select 'migration_versions' as section, entry.version, entry.name
from readable cross join lateral xmltable('/table/row' passing query_to_xml(
  case when allowed then
    'select version::text as version,'||case when has_name then 'name::text' else 'null::text' end||
      ' as name from supabase_migrations.schema_migrations order by version::text'
    else 'select null::text as version,null::text as name where false' end,
  false,false,'') columns version text path 'version',name text path 'name') entry;

-- Only counts are returned. Unknown/partial application tables are safe to count:
-- no application column names or assumptions are needed.
select 'app_table_counts' as section, n.nspname as schema_name,c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  has_table_privilege(c.oid,'SELECT') as can_read,
  row_security_active(c.oid) as count_is_rls_scoped,
  case when has_table_privilege(c.oid,'SELECT') then
    ((xpath('/table/row/row_count/text()',query_to_xml(
      format('select count(*) as row_count from %I.%I',n.nspname,c.relname),false,false,'')))[1]::text)::bigint
    else null end as row_count
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition
  and (left(c.relname,8)='darsino_' or left(c.relname,4)='oqi_')
order by c.relname;

select 'realtime_publication' as section,pubname,puballtables,pubinsert,pubupdate,pubdelete,pubtruncate
from pg_publication where pubname='supabase_realtime';

select 'realtime_tables' as section,pubname,schemaname,tablename
from pg_publication_tables where pubname='supabase_realtime'
order by schemaname,tablename;

-- PostgreSQL publications contain tables, not functions. RPCs are inventoried
-- separately by signature and grants; function bodies and user data are omitted.
select 'app_functions' as section,n.nspname as schema_name,p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,p.prosecdef as security_definer,
  exists(select 1 from unnest(coalesce(p.proconfig,array[]::text[])) setting
    where left(setting,12)='search_path=') as explicit_search_path,
  case when to_regrole('anon') is not null then has_function_privilege('anon',p.oid,'EXECUTE') else null end as anon_execute,
  case when to_regrole('authenticated') is not null then has_function_privilege('authenticated',p.oid,'EXECUTE') else null end as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f'
  and (left(p.proname,8)='darsino_' or left(p.proname,4)='oqi_')
order by p.proname,arguments;
