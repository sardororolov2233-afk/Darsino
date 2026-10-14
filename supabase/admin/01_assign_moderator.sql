-- Run separately in the Supabase SQL Editor AFTER this person signs in by SMS.
-- Replace NULL with the verified user's auth.users.id, in single quotes.
-- This is an administrator operation, never a client RPC or an Auth metadata role.
begin;
do $$
declare target uuid := null; -- Example syntax: '00000000-0000-4000-8000-000000000000'
begin
  if target is null then raise exception 'Replace target UUID with your verified moderator Auth user ID.'; end if;
  if not exists(select 1 from auth.users where id=target and phone_confirmed_at is not null and nullif(phone,'') is not null) then
    raise exception 'Moderator must first verify a phone number using Supabase Auth.';
  end if;
  -- Do not convert an active tutor/student account and orphan its existing role data.
  if exists(select 1 from public.darsino_tutors where user_id=target)
    or exists(select 1 from public.darsino_enrollments where student_id=target)
    or exists(select 1 from public.darsino_applications where student_id=target) then
    raise exception 'Use a separate account for the moderator.';
  end if;
  update public.darsino_profiles set role='moderator',name=coalesce(nullif(name,''),'Darsino moderatori'),onboarded=true
    where id=target and not is_suspended;
  if not found then raise exception 'Active profile not found. Apply the setup SQL first.'; end if;
end $$;
commit;
