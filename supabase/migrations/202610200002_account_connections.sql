-- Account preferences, consent-based contacts and tutor group invitations.
begin;
alter table public.darsino_profiles add column if not exists public_id text;
update public.darsino_profiles set public_id='oqi_'||substring(replace(id::text,'-','') from 1 for 16) where public_id is null;
alter table public.darsino_profiles alter column public_id set default ('oqi_'||substring(replace(gen_random_uuid()::text,'-','') from 1 for 16));
alter table public.darsino_profiles alter column public_id set not null;
create unique index if not exists darsino_public_id_unique on public.darsino_profiles(lower(public_id));

create table if not exists public.darsino_account_settings (
  user_id uuid primary key references public.darsino_profiles(id),
  settings jsonb not null default '{}'::jsonb check(jsonb_typeof(settings)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.darsino_contacts (
  user_id uuid not null references public.darsino_profiles(id),
  peer_id uuid not null references public.darsino_profiles(id),
  created_at timestamptz not null default now(),
  primary key(user_id,peer_id), check(user_id<>peer_id)
);
create table if not exists public.darsino_contact_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.darsino_profiles(id),
  recipient_id uuid not null references public.darsino_profiles(id),
  status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(), check(sender_id<>recipient_id)
);
create unique index if not exists darsino_contact_pending on public.darsino_contact_requests(least(sender_id,recipient_id),greatest(sender_id,recipient_id)) where status='pending';
create index if not exists darsino_contact_recipient on public.darsino_contact_requests(recipient_id,status);
create table if not exists public.darsino_user_blocks (
  user_id uuid not null references public.darsino_profiles(id),
  peer_id uuid not null references public.darsino_profiles(id),
  primary key(user_id,peer_id), check(user_id<>peer_id)
);
create table if not exists public.darsino_group_invitations (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.darsino_offerings(id),
  tutor_id uuid not null references public.darsino_tutors(user_id),
  student_id uuid not null references public.darsino_profiles(id),
  status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '7 days'
);
create unique index if not exists darsino_group_invite_pending on public.darsino_group_invitations(offering_id,student_id) where status='pending';
create index if not exists darsino_group_invite_student on public.darsino_group_invitations(student_id,status);
create table if not exists public.darsino_account_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.darsino_profiles(id),
  target_id uuid not null references public.darsino_profiles(id),
  reason text not null check(char_length(reason) between 10 and 1000),
  created_at timestamptz not null default now(), check(reporter_id<>target_id)
);
create table if not exists public.darsino_account_limits (
  user_id uuid not null references public.darsino_profiles(id),
  bucket text not null, window_start timestamptz not null, used integer not null,
  primary key(user_id,bucket)
);
create table if not exists public.darsino_private_state (
  user_id uuid not null references public.darsino_profiles(id),
  kind text not null check(kind in ('learning','teacher')),
  data jsonb not null check(jsonb_typeof(data)='object'),
  revision integer not null default 1, updated_at timestamptz not null default now(),
  primary key(user_id,kind)
);
do $$ declare t text; begin
  foreach t in array array['account_settings','contacts','contact_requests','user_blocks','group_invitations','account_reports','account_limits','private_state'] loop
    execute format('alter table public.darsino_%I enable row level security',t);
    execute format('revoke all on public.darsino_%I from public,anon,authenticated',t);
  end loop;
end $$;

create or replace function public.darsino_account_preferences(target uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select '{"language":"uz","discoverable":true,"allowContactRequests":true,"showArea":true,"avatarVisibility":"everyone","messagePolicy":"everyone","invitePolicy":"everyone","lessonReminders":true}'::jsonb||
    coalesce((select settings from public.darsino_account_settings where user_id=target),'{}'::jsonb)
$$;
create or replace function public.darsino_blocked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.darsino_user_blocks where (user_id=a and peer_id=b) or (user_id=b and peer_id=a))
$$;
create or replace function public.darsino_contacts_linked(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.darsino_contacts where user_id=a and peer_id=b)
$$;
create or replace function public.darsino_policy_allows(target uuid,field text,sender uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select not public.darsino_blocked(target,sender) and
    ((public.darsino_account_preferences(target)->>field)='everyone' or
     ((public.darsino_account_preferences(target)->>field)='contacts' and public.darsino_contacts_linked(target,sender)))
$$;
create or replace function public.darsino_account_rate(bucket_name text,maximum integer,seconds integer) returns void
language plpgsql security definer set search_path='' as $$
declare used_now integer; window_now timestamptz:=to_timestamp(floor(extract(epoch from now())/seconds)*seconds);
begin
  insert into public.darsino_account_limits(user_id,bucket,window_start,used)
    values(auth.uid(),bucket_name,window_now,1)
    on conflict(user_id,bucket) do update set window_start=excluded.window_start,
      used=case when darsino_account_limits.window_start=excluded.window_start then darsino_account_limits.used+1 else 1 end
    returning used into used_now;
  perform public.darsino_assert(used_now<=maximum,'So‘rovlar limiti tugadi. Keyinroq urinib ko‘ring.');
end $$;

-- Enforce verified TOTP factors in every RPC and private Storage policy as well as UI.
-- Managed Auth tables are optional in the test fixture, never created or modified here.
create or replace function public.darsino_session_secure() returns boolean
language plpgsql stable security definer set search_path='' as $$
declare claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
  has_mfa boolean:=false; session_exists boolean;
begin
  if to_regclass('auth.mfa_factors') is not null then
    execute 'select exists(select 1 from auth.mfa_factors where user_id=$1 and status=''verified'' and factor_type=''totp'')'
      into has_mfa using auth.uid();
  end if;
  if has_mfa and coalesce(claims->>'aal','aal1')<>'aal2' then return false; end if;
  if nullif(claims->>'session_id','') is not null and to_regclass('auth.sessions') is not null then
    execute 'select exists(select 1 from auth.sessions where id::text=$1 and user_id=$2)'
      into session_exists using claims->>'session_id',auth.uid();
    if not session_exists then return false; end if;
  end if;
  return true;
exception when invalid_text_representation then return false;
end $$;
create or replace function public.darsino_authenticated() returns boolean
language sql stable security definer set search_path='' as $$
  select public.darsino_session_secure() and exists(
    select 1 from auth.users u join public.darsino_profiles p on p.id=u.id
    where u.id=auth.uid() and u.email_confirmed_at is not null
      and nullif(trim(u.email),'') is not null and not p.is_suspended)
$$;

create or replace function public.darsino_public_user(target uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id',p.id,'publicId',p.public_id,'name',p.name,'role',p.role,'onboarded',p.onboarded,
    'phone',case when p.id=auth.uid() then p.phone else '' end,
    'email',case when p.id=auth.uid() then p.email else '' end,
    'goal',case when p.id=auth.uid() then p.goal else '' end,'interests',p.interests,
    'city',case when p.id=auth.uid() or (public.darsino_account_preferences(p.id)->>'showArea')::boolean then p.city else '' end,
    'area',case when p.id=auth.uid() or (public.darsino_account_preferences(p.id)->>'showArea')::boolean then p.area else '' end,
    'avatarFileId',case when p.id=auth.uid() or public.darsino_policy_allows(p.id,'avatarVisibility',auth.uid()) then p.avatar_file_id else null end)||
    case when p.id=auth.uid() then jsonb_strip_nulls(jsonb_build_object('studyMode',p.study_mode,'studySupport',p.study_support)) else '{}'::jsonb end
  from public.darsino_profiles p where p.id=target
$$;
create or replace function public.darsino_can_message(conversation text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare a uuid; b uuid; me uuid:=auth.uid(); recipient uuid; linked boolean; legacy boolean;
begin
  if not public.darsino_authenticated() or conversation !~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$' then return false; end if;
  a:=split_part(conversation,':',2)::uuid; b:=split_part(conversation,':',3)::uuid;
  if a=b or me not in (a,b) then return false; end if;
  recipient:=case when a=me then b else a end;
  if (select count(*) from public.darsino_profiles p where p.id in (a,b) and p.onboarded and not p.is_suspended and
    (p.role<>'tutor' or exists(select 1 from public.darsino_tutors t where t.user_id=p.id and t.verification='approved')))<>2 then return false; end if;
  linked:=public.darsino_contacts_linked(a,b);
  legacy:=exists(select 1 from public.darsino_profiles where id=a and role='student') and
    exists(select 1 from public.darsino_profiles where id=b and role='tutor');
  return (linked or legacy) and public.darsino_policy_allows(recipient,'messagePolicy',me);
exception when invalid_text_representation then return false;
end $$;

do $$ begin
  if to_regprocedure('public.darsino_snapshot_account_base()') is null then
    alter function public.darsino_snapshot() rename to darsino_snapshot_account_base;
  end if;
  if to_regprocedure('public.darsino_mutate_account_base(jsonb)') is null then
    alter function public.darsino_mutate(jsonb) rename to darsino_mutate_account_base;
  end if;
  if to_regprocedure('public.darsino_can_read_file_account_base(uuid)') is null then
    alter function public.darsino_can_read_file(uuid) rename to darsino_can_read_file_account_base;
  end if;
end $$;
create or replace function public.darsino_can_read_file(file uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public.darsino_authenticated() and exists(
    select 1 from public.darsino_files f where f.id=file and
      case when f.purpose='avatar' then
        f.state<>'deleted' and (f.owner_id=auth.uid() or
          (f.state='ready' and public.darsino_policy_allows(f.owner_id,'avatarVisibility',auth.uid()) and
            (public.darsino_contacts_linked(f.owner_id,auth.uid()) or
             exists(select 1 from public.darsino_tutors where user_id=f.owner_id and verification='approved') or
             public.darsino_can_read_file_account_base(file))))
      else public.darsino_can_read_file_account_base(file) end)
$$;
create or replace function public.darsino_snapshot() returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); result jsonb; market jsonb; people jsonb;
begin
  result:=public.darsino_snapshot_account_base(); market:=result->'market';
  select coalesce(jsonb_agg(public.darsino_public_user(p.id) order by p.id),'[]'::jsonb) into people
  from public.darsino_profiles p where p.id in (
    select (u->>'id')::uuid from jsonb_array_elements(market->'users') u
    union select peer_id from public.darsino_contacts where user_id=me
    union select case when sender_id=me then recipient_id else sender_id end from public.darsino_contact_requests where me in (sender_id,recipient_id)
    union select case when tutor_id=me then student_id else tutor_id end from public.darsino_group_invitations where me in (tutor_id,student_id)
    union select peer_id from public.darsino_user_blocks where user_id=me
  );
  market:=jsonb_set(market,'{users}',people);
  market:=jsonb_set(market,'{files}',coalesce((
    select jsonb_agg(f) from jsonb_array_elements(market->'files') f where public.darsino_can_read_file((f->>'id')::uuid)),'[]'::jsonb));
  market:=market||jsonb_build_object(
    'accountSettings',jsonb_build_object(me::text,public.darsino_account_preferences(me)),
    'contacts',coalesce((select jsonb_agg(jsonb_build_object('userId',user_id,'peerId',peer_id,'createdAt',created_at)) from public.darsino_contacts where user_id=me),'[]'::jsonb),
    'contactRequests',coalesce((select jsonb_agg(jsonb_build_object('id',id,'senderId',sender_id,'recipientId',recipient_id,'status',status,'createdAt',created_at) order by created_at desc) from public.darsino_contact_requests where me in (sender_id,recipient_id)),'[]'::jsonb),
    'blocks',coalesce((select jsonb_agg(jsonb_build_object('userId',user_id,'peerId',peer_id)) from public.darsino_user_blocks where user_id=me),'[]'::jsonb),
    'groupInvitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'offeringId',offering_id,'tutorId',tutor_id,'studentId',student_id,'status',status,'createdAt',created_at,'expiresAt',expires_at) order by created_at desc) from public.darsino_group_invitations where me in (tutor_id,student_id)),'[]'::jsonb),
    'accountReports',coalesce((select jsonb_agg(jsonb_build_object('id',id,'reporterId',reporter_id,'targetId',target_id,'reason',reason,'createdAt',created_at) order by created_at desc) from public.darsino_account_reports where reporter_id=me or public.darsino_is_moderator()),'[]'::jsonb)
  );
  -- Private invited groups must be visible before accepting, without exposing other members.
  market:=jsonb_set(market,'{offerings}',coalesce(market->'offerings','[]'::jsonb)||coalesce((
    select jsonb_agg(o.data||jsonb_build_object('id',o.id,'tutorId',o.tutor_id,'tutor',p.name,'capacity',o.capacity,
      'published',o.published,'reservedSeats',0,'students',(select count(*) from public.darsino_enrollments e where e.offering_id=o.id and e.active),
      'spots',o.capacity-(select count(*) from public.darsino_enrollments e where e.offering_id=o.id and e.active)))
    from public.darsino_offerings o join public.darsino_profiles p on p.id=o.tutor_id
    where exists(select 1 from public.darsino_group_invitations i where i.offering_id=o.id and i.student_id=me and i.status='pending' and i.expires_at>now())
      and not exists(select 1 from jsonb_array_elements(market->'offerings') x where x->>'id'=o.id::text)),'[]'::jsonb));
  return jsonb_build_object('market',market,'user',public.darsino_public_user(me));
end $$;

create or replace function public.darsino_find_account(p_public_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); target uuid; clean text:=lower(trim(p_public_id));
begin
  perform public.darsino_assert(exists(select 1 from public.darsino_profiles where id=me and onboarded),'Avval profilingizni to‘ldiring.');
  perform public.darsino_account_rate('lookup',30,60);
  perform public.darsino_assert(clean ~ '^[a-z][a-z0-9_]{4,23}$','ID noto‘g‘ri.');
  select p.id into target from public.darsino_profiles p where p.public_id=clean and p.onboarded and not p.is_suspended
    and ((public.darsino_account_preferences(p.id)->>'discoverable')::boolean or p.id=me or public.darsino_contacts_linked(me,p.id))
    and not public.darsino_blocked(me,p.id);
  if target is null then return null; end if;
  return public.darsino_public_user(target);
end $$;

create or replace function public.darsino_account_command(command jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); actor public.darsino_profiles; target public.darsino_profiles;
  op text:=command->>'type'; peer uuid; group_row public.darsino_offerings;
  invitation public.darsino_group_invitations; request public.darsino_contact_requests;
  value jsonb; new_id uuid; setting_name text; public_name text; accepted boolean; clean text;
begin
  perform public.darsino_assert(command->>'actorId'=me::text,'Akkaunt o‘zgardi. Amalni qayta boshlang.');
  select * into actor from public.darsino_profiles where id=me for update;
  perform public.darsino_assert(actor.onboarded,'Avval profilingizni to‘ldiring.');
  if op='account-settings' then
    value:=command->'settings'; public_name:=command->>'publicId';
    perform public.darsino_assert(jsonb_typeof(value)='object' and public_name ~ '^[a-z][a-z0-9_]{4,23}$','ID yoki sozlamalar noto‘g‘ri.');
    perform public.darsino_assert(value->>'language' in ('uz','ru','en','kk','ky'),'Tilni tanlang.');
    foreach setting_name in array array['discoverable','showArea','lessonReminders','allowContactRequests'] loop
      perform public.darsino_assert(jsonb_typeof(value->setting_name)='boolean','Sozlamalar noto‘g‘ri.');
    end loop;
    foreach setting_name in array array['avatarVisibility','messagePolicy','invitePolicy'] loop
      perform public.darsino_assert(value->>setting_name in ('everyone','contacts','nobody'),'Maxfiylik sozlamasi noto‘g‘ri.');
    end loop;
    value:=jsonb_build_object('language',value->'language','discoverable',value->'discoverable','showArea',value->'showArea',
      'lessonReminders',value->'lessonReminders','allowContactRequests',value->'allowContactRequests','avatarVisibility',value->'avatarVisibility','messagePolicy',value->'messagePolicy','invitePolicy',value->'invitePolicy');
    perform public.darsino_assert(not exists(select 1 from public.darsino_profiles where public_id=public_name and id<>me),'Bu ID band.');
    update public.darsino_profiles set public_id=public_name where id=me;
    insert into public.darsino_account_settings(user_id,settings) values(me,value)
      on conflict(user_id) do update set settings=excluded.settings,updated_at=now();
  elsif op in ('contact-request','contact-remove','block-user','report-user') then
    peer:=(command->>'peerId')::uuid;
    select * into target from public.darsino_profiles where id=peer and onboarded and not is_suspended and id<>me;
    perform public.darsino_assert(found,'Foydalanuvchi topilmadi.');
    perform pg_advisory_xact_lock(hashtext(least(me,peer)::text||greatest(me,peer)::text)::bigint);
    if op='contact-request' then
      perform public.darsino_assert(not public.darsino_blocked(peer,me) and (public.darsino_account_preferences(peer)->>'allowContactRequests')::boolean,'Foydalanuvchi bu amalni maxfiylik sozlamalarida cheklagan.');
      perform public.darsino_assert((public.darsino_account_preferences(peer)->>'discoverable')::boolean or public.darsino_contacts_linked(me,peer),'Foydalanuvchi topilmadi.');
      perform public.darsino_assert(not public.darsino_contacts_linked(me,peer),'Bu foydalanuvchi kontaktlaringizda.');
      select id into new_id from public.darsino_contact_requests where least(sender_id,recipient_id)=least(me,peer) and greatest(sender_id,recipient_id)=greatest(me,peer) and status='pending';
      if new_id is null then
        perform public.darsino_account_rate('contact',10,86400);
        insert into public.darsino_contact_requests(sender_id,recipient_id) values(me,peer) returning id into new_id;
        insert into public.darsino_notifications(user_id,title,body) values(peer,'Kontakt taklifi',actor.name);
      end if;
    elsif op='contact-remove' then
      delete from public.darsino_contacts where (user_id=me and peer_id=peer) or (user_id=peer and peer_id=me);
    elsif op='block-user' then
      perform public.darsino_assert(jsonb_typeof(command->'blocked')='boolean','Blok holati noto‘g‘ri.');
      if (command->>'blocked')::boolean then
        insert into public.darsino_user_blocks(user_id,peer_id) values(me,peer) on conflict do nothing;
        delete from public.darsino_contacts where (user_id=me and peer_id=peer) or (user_id=peer and peer_id=me);
        update public.darsino_contact_requests set status='cancelled' where status='pending' and least(sender_id,recipient_id)=least(me,peer) and greatest(sender_id,recipient_id)=greatest(me,peer);
        update public.darsino_group_invitations set status='cancelled' where status='pending' and ((tutor_id=me and student_id=peer) or (student_id=me and tutor_id=peer));
      else delete from public.darsino_user_blocks where user_id=me and peer_id=peer; end if;
    else
      clean:=trim(command->>'reason');
      perform public.darsino_assert(char_length(clean) between 10 and 1000,'Sababni 10–1000 belgida yozing.');
      perform public.darsino_account_rate('report',5,86400);
      insert into public.darsino_account_reports(reporter_id,target_id,reason) values(me,peer,clean) returning id into new_id;
      insert into public.darsino_notifications(user_id,title,body) select id,'Yangi shikoyat',clean from public.darsino_profiles where role='moderator' and not is_suspended;
    end if;
  elsif op='contact-decide' then
    perform public.darsino_assert(jsonb_typeof(command->'accept')='boolean','Qaror noto‘g‘ri.');
    accepted:=(command->>'accept')::boolean;
    select * into request from public.darsino_contact_requests where id=(command->>'requestId')::uuid and recipient_id=me;
    perform public.darsino_assert(found,'Kontakt taklifi topilmadi.');
    perform pg_advisory_xact_lock(hashtext(least(me,request.sender_id)::text||greatest(me,request.sender_id)::text)::bigint);
    select * into request from public.darsino_contact_requests where id=request.id for update;
    if request.status=(case when accepted then 'accepted' else 'declined' end) then return request.id; end if;
    perform public.darsino_assert(request.status='pending' and not public.darsino_blocked(me,request.sender_id) and exists(select 1 from public.darsino_profiles where id=request.sender_id and onboarded and not is_suspended),'Taklifga allaqachon javob berilgan.');
    update public.darsino_contact_requests set status=case when accepted then 'accepted' else 'declined' end where id=request.id;
    if accepted then
      insert into public.darsino_contacts(user_id,peer_id) values(me,request.sender_id),(request.sender_id,me) on conflict do nothing;
      insert into public.darsino_notifications(user_id,title,body) values(request.sender_id,'Kontakt taklifi qabul qilindi',actor.name);
    end if;
    new_id:=request.id;
  elsif op='group-invite' then
    perform public.darsino_assert(actor.role='tutor' and exists(select 1 from public.darsino_tutors where user_id=me and verification='approved'),'Tasdiqlangan ustoz profili kerak.');
    peer:=(command->>'studentId')::uuid;
    select * into target from public.darsino_profiles where id=peer and onboarded and role='student' and not is_suspended;
    perform public.darsino_assert(found,'O‘quvchini tanlang.');
    select * into group_row from public.darsino_offerings where id=(command->>'offeringId')::uuid and tutor_id=me and data->>'type'='group' for update;
    perform public.darsino_assert(found,'Guruh topilmadi.');
    perform public.darsino_assert(public.darsino_policy_allows(peer,'invitePolicy',me),'Foydalanuvchi bu amalni maxfiylik sozlamalarida cheklagan.');
    perform public.darsino_assert(public.darsino_contacts_linked(me,peer) or exists(select 1 from public.darsino_enrollments e join public.darsino_offerings o on o.id=e.offering_id where o.tutor_id=me and e.student_id=peer and e.active),'Avval o‘quvchi bilan kontakt o‘rnating.');
    perform public.darsino_assert(exists(select 1 from public.darsino_sessions where offering_id=group_row.id and starts_at>now()),'Guruhning kelajakdagi darsi yo‘q.');
    perform public.darsino_assert(not exists(select 1 from public.darsino_enrollments where offering_id=group_row.id and student_id=peer and active),'O‘quvchi allaqachon guruhda.');
    perform public.darsino_assert((select count(*) from public.darsino_enrollments where offering_id=group_row.id and active)<group_row.capacity,'Guruhda bo‘sh o‘rin qolmagan.');
    update public.darsino_group_invitations set status='cancelled' where offering_id=group_row.id and student_id=peer and status='pending' and expires_at<=now();
    select id into new_id from public.darsino_group_invitations where offering_id=group_row.id and student_id=peer and status='pending';
    if new_id is null then
      perform public.darsino_account_rate('invite',50,86400);
      insert into public.darsino_group_invitations(offering_id,tutor_id,student_id) values(group_row.id,me,peer) returning id into new_id;
      insert into public.darsino_notifications(user_id,title,body,offering_id) values(peer,'Guruhga taklif',actor.name||' · '||(group_row.data->>'title'),group_row.id);
    end if;
  elsif op in ('group-invite-decide','group-invite-cancel') then
    select * into invitation from public.darsino_group_invitations where id=(command->>'invitationId')::uuid and
      ((op='group-invite-decide' and student_id=me) or (op='group-invite-cancel' and tutor_id=me));
    perform public.darsino_assert(found,'Guruh taklifi topilmadi.');
    select * into group_row from public.darsino_offerings where id=invitation.offering_id for update;
    select * into invitation from public.darsino_group_invitations where id=invitation.id for update;
    if op='group-invite-cancel' then
      perform public.darsino_assert(invitation.status='pending','Taklifga allaqachon javob berilgan.');
      update public.darsino_group_invitations set status='cancelled' where id=invitation.id;
    else
      perform public.darsino_assert(jsonb_typeof(command->'accept')='boolean','Qaror noto‘g‘ri.');
      accepted:=(command->>'accept')::boolean;
      if invitation.status=(case when accepted then 'accepted' else 'declined' end) then return invitation.id; end if;
      perform public.darsino_assert(invitation.status='pending','Taklifga allaqachon javob berilgan.');
      if accepted then
        perform public.darsino_assert(actor.role='student' and invitation.expires_at>now(),'Taklif muddati tugagan.');
        perform public.darsino_assert(not public.darsino_blocked(me,invitation.tutor_id) and exists(select 1 from public.darsino_tutors t join public.darsino_profiles p on p.id=t.user_id where t.user_id=invitation.tutor_id and t.verification='approved' and not p.is_suspended),'Tasdiqlangan ustoz profili kerak.');
        perform public.darsino_assert(exists(select 1 from public.darsino_sessions where offering_id=group_row.id and starts_at>now()),'Guruhning kelajakdagi darsi yo‘q.');
        if not exists(select 1 from public.darsino_enrollments where offering_id=group_row.id and student_id=me and active) then
          perform public.darsino_assert((select count(*) from public.darsino_enrollments where offering_id=group_row.id and active)<group_row.capacity,'Guruhdagi oxirgi o‘rin band bo‘ldi.');
          insert into public.darsino_enrollments(offering_id,student_id) values(group_row.id,me)
            on conflict(offering_id,student_id) do update set active=true,created_at=now();
        end if;
        update public.darsino_applications set status='approved' where offering_id=group_row.id and student_id=me and status='pending';
        insert into public.darsino_notifications(user_id,title,body,offering_id) values
          (invitation.tutor_id,'Guruh taklifi qabul qilindi',actor.name||' · '||(group_row.data->>'title'),group_row.id),
          (me,'Guruhga qo‘shildingiz',group_row.data->>'title',group_row.id);
      end if;
      update public.darsino_group_invitations set status=case when accepted then 'accepted' else 'declined' end where id=invitation.id;
    end if;
    new_id:=invitation.id;
  else raise exception 'Amal topilmadi.';
  end if;
  return new_id;
end $$;

create or replace function public.darsino_mutate(command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); op text:=command->>'type'; new_id uuid; clean text; recipient uuid; result jsonb;
begin
  perform public.darsino_assert(command->>'actorId'=me::text,'Akkaunt o‘zgardi. Amalni qayta boshlang.');
  if op in ('account-settings','contact-request','contact-decide','contact-remove','block-user','group-invite','group-invite-decide','group-invite-cancel','report-user') then
    new_id:=public.darsino_account_command(command);
    return public.darsino_snapshot()||jsonb_build_object('id',new_id);
  elsif op='message' then
    perform public.darsino_assert((command->>'conversationId') ~ '^dm:[0-9a-f-]{36}:[0-9a-f-]{36}$' and
      me::text in (split_part(command->>'conversationId',':',2),split_part(command->>'conversationId',':',3)),
      'Suhbatda qatnashish huquqingiz yo‘q.');
    perform public.darsino_assert(public.darsino_can_message(command->>'conversationId'),'Bu foydalanuvchiga yozish cheklangan.');
    clean:=trim(command->>'text');
    perform public.darsino_assert(char_length(clean) between 1 and 2000,'Xabar 1–2000 belgi bo‘lsin.');
    perform public.darsino_account_rate('message',60,60);
    recipient:=case when split_part(command->>'conversationId',':',2)::uuid=me then split_part(command->>'conversationId',':',3)::uuid else split_part(command->>'conversationId',':',2)::uuid end;
    insert into public.darsino_messages(conversation_id,sender_id,recipient_id,text) values(command->>'conversationId',me,recipient,clean) returning id into new_id;
    return public.darsino_snapshot()||jsonb_build_object('id',new_id);
  end if;
  result:=public.darsino_mutate_account_base(command);
  return result;
end $$;

create or replace function public.darsino_private_state_read(p_kind text,p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); result jsonb;
begin
  perform public.darsino_assert(p_actor_id=me,'Akkaunt o‘zgardi. Amalni qayta boshlang.');
  perform public.darsino_assert(p_kind in ('learning','teacher'),'Ma’lumot turi noto‘g‘ri.');
  select jsonb_build_object('data',data,'revision',revision) into result from public.darsino_private_state where user_id=me and kind=p_kind;
  return coalesce(result,jsonb_build_object('data',null,'revision',0));
end $$;
create or replace function public.darsino_private_state_write(p_kind text,p_data jsonb,p_revision integer,p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); updated integer;
begin
  perform public.darsino_assert(p_actor_id=me,'Akkaunt o‘zgardi. Amalni qayta boshlang.');
  perform public.darsino_assert(p_kind in ('learning','teacher') and jsonb_typeof(p_data)='object' and octet_length(p_data::text)<=262144,'Ma’lumot hajmi yoki turi noto‘g‘ri.');
  perform public.darsino_assert(p_kind<>'teacher' or exists(select 1 from public.darsino_profiles where id=me and role='tutor'),'Bu bo‘lim ustozlar uchun.');
  perform public.darsino_account_rate('workspace',120,60);
  insert into public.darsino_private_state(user_id,kind,data) values(me,p_kind,p_data)
    on conflict(user_id,kind) do update set data=excluded.data,revision=darsino_private_state.revision+1,updated_at=now()
      where darsino_private_state.revision=p_revision
    returning revision into updated;
  perform public.darsino_assert(updated is not null and updated=p_revision+1,'WORKSPACE_CONFLICT');
  return jsonb_build_object('data',p_data,'revision',updated);
end $$;

create or replace function public.darsino_own_sessions() returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); result jsonb;
begin
  if to_regclass('auth.sessions') is null then return '[]'::jsonb; end if;
  execute 'select coalesce(jsonb_agg(jsonb_build_object(''id'',id,''createdAt'',created_at,''updatedAt'',updated_at,''userAgent'',user_agent,''current'',id::text=$2) order by created_at desc),''[]''::jsonb) from auth.sessions where user_id=$1'
    into result using me,coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'session_id';
  return result;
end $$;

-- Rejoining keeps the stored monthly ledger editable even when enrollment.created_at changes.
create or replace function public.darsino_record_payment(command jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid:=public.darsino_account_id(); actor public.darsino_profiles;
  offering public.darsino_offerings; member public.darsino_enrollments;
  previous public.darsino_payments; billing_month text:=command->>'month';
  target uuid; due numeric; is_paid boolean; sent integer:=0;
  month_names text[]:=array['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
  label text;
begin
  perform public.darsino_assert(command->>'actorId'=me::text,'Akkaunt o‘zgardi. Amalni qayta boshlang.');
  select * into actor from public.darsino_profiles where id=me for update;
  perform public.darsino_assert(actor.role='tutor' and actor.onboarded and exists(select 1 from public.darsino_tutors where user_id=me and verification='approved'),'Profil moderator tomonidan tasdiqlanishi kerak.');
  perform public.darsino_assert(billing_month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$','Hisobot oyi noto‘g‘ri.');
  select * into offering from public.darsino_offerings where id=(command->>'offeringId')::uuid and tutor_id=me for update;
  perform public.darsino_assert(found,'Bu guruhni boshqarish huquqingiz yo‘q.');
  label:=month_names[substring(billing_month from 6 for 2)::integer]||' '||substring(billing_month from 1 for 4);
  target:=nullif(command->>'studentId','')::uuid;
  if command->>'type'='payment' then
    perform public.darsino_assert(jsonb_typeof(command->'paid')='boolean','To‘lov holati noto‘g‘ri.');
    select * into previous from public.darsino_payments where offering_id=offering.id and student_id=target and month=billing_month;
    select * into member from public.darsino_enrollments where offering_id=offering.id and student_id=target for update;
    perform public.darsino_assert(found and (previous.offering_id is not null or (member.active and to_char(member.created_at at time zone 'Asia/Tashkent','YYYY-MM')<=billing_month)),'O‘quvchi bu oyda guruhda qatnashmaydi.');
    due:=coalesce(previous.amount,(offering.data->>'price')::numeric);
    perform public.darsino_assert(due>0 and due<=100000000,'Bepul guruh uchun to‘lov belgilanmaydi.');
    is_paid:=(command->>'paid')::boolean;
    if previous.paid=is_paid or (previous.offering_id is null and not is_paid) then return; end if;
    insert into public.darsino_payments(offering_id,student_id,month,amount,paid,paid_at)
      values(offering.id,target,billing_month,due,is_paid,case when is_paid then now() end)
      on conflict(offering_id,student_id,month) do update set paid=excluded.paid,paid_at=excluded.paid_at,updated_at=now();
    insert into public.darsino_notifications(user_id,title,body,offering_id)
      values(target,case when is_paid then 'To‘lov qayd etildi' else 'To‘lov belgisi o‘zgartirildi' end,
      (offering.data->>'title')||' · '||label||' · '||due::text||' so‘m. '||case when is_paid then 'Ustoz to‘ladi deb belgiladi.' else 'Ustoz to‘lov belgisini bekor qildi.' end,offering.id);
  elsif command->>'type'='payment-reminder' then
    perform public.darsino_assert(target is null or exists(select 1 from public.darsino_enrollments where offering_id=offering.id and student_id=target and active and to_char(created_at at time zone 'Asia/Tashkent','YYYY-MM')<=billing_month),'Faol o‘quvchi topilmadi.');
    for member in select * from public.darsino_enrollments where offering_id=offering.id and active and (target is null or student_id=target) and to_char(created_at at time zone 'Asia/Tashkent','YYYY-MM')<=billing_month order by student_id for update loop
      select * into previous from public.darsino_payments where offering_id=offering.id and student_id=member.student_id and month=billing_month;
      due:=coalesce(previous.amount,(offering.data->>'price')::numeric);
      if due<=0 or coalesce(previous.paid,false) or previous.reminded_at>now()-interval '24 hours' then continue; end if;
      insert into public.darsino_payments(offering_id,student_id,month,amount,reminded_at)
        values(offering.id,member.student_id,billing_month,due,now())
        on conflict(offering_id,student_id,month) do update set reminded_at=now(),updated_at=now();
      insert into public.darsino_notifications(user_id,title,body,offering_id)
        values(member.student_id,'Oylik to‘lov eslatmasi',(offering.data->>'title')||' · '||label||' uchun '||due::text||' so‘m to‘lovni amalga oshirishingizni so‘raymiz. To‘lagan bo‘lsangiz, ustozingizga xabar bering.',offering.id);
      sent:=sent+1;
    end loop;
    perform public.darsino_assert(sent>0,'Yuboriladigan eslatma yo‘q. To‘lov qilingan yoki oxirgi 24 soatda eslatilgan.');
  else
    raise exception 'To‘lov amali noto‘g‘ri.';
  end if;
end $$;

revoke all on function public.darsino_snapshot_account_base(),public.darsino_mutate_account_base(jsonb),
  public.darsino_can_read_file_account_base(uuid),public.darsino_account_preferences(uuid),
  public.darsino_blocked(uuid,uuid),public.darsino_contacts_linked(uuid,uuid),
  public.darsino_policy_allows(uuid,text,uuid),public.darsino_account_rate(text,integer,integer),
  public.darsino_session_secure(),public.darsino_public_user(uuid),public.darsino_account_command(jsonb),
  public.darsino_record_payment(jsonb),public.darsino_can_message(text),public.darsino_can_read_file(uuid)
  from public,anon,authenticated;
revoke all on function public.darsino_find_account(text),public.darsino_private_state_read(text,uuid),
  public.darsino_private_state_write(text,jsonb,integer,uuid),public.darsino_own_sessions(),
  public.darsino_snapshot(),public.darsino_mutate(jsonb) from public,anon;
grant execute on function public.darsino_find_account(text),public.darsino_private_state_read(text,uuid),
  public.darsino_private_state_write(text,jsonb,integer,uuid),public.darsino_own_sessions(),
  public.darsino_snapshot(),public.darsino_mutate(jsonb),public.darsino_authenticated() to authenticated;

-- Realtime invalidates only the authenticated recipient's scoped snapshot.
grant select on public.darsino_group_invitations,public.darsino_contact_requests to authenticated;
drop policy if exists darsino_group_invite_read on public.darsino_group_invitations;
create policy darsino_group_invite_read on public.darsino_group_invitations for select to authenticated
  using(public.darsino_authenticated() and auth.uid() in (tutor_id,student_id));
drop policy if exists darsino_contact_request_read on public.darsino_contact_requests;
create policy darsino_contact_request_read on public.darsino_contact_requests for select to authenticated
  using(public.darsino_authenticated() and auth.uid() in (sender_id,recipient_id));
do $$ declare t text; begin
  foreach t in array array['darsino_group_invitations','darsino_contact_requests'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
