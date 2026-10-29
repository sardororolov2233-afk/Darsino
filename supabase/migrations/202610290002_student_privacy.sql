-- Safer defaults apply only to students completing onboarding after this upgrade.
begin;
create or replace function public.oqi_student_privacy_defaults() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.onboarded and not old.onboarded and new.role='student' and auth.uid()=new.id and current_setting('role',true)='authenticated' then
  insert into public.darsino_account_settings(user_id,settings) values(new.id,'{"discoverable":false,"allowContactRequests":true,"showArea":false,"avatarVisibility":"contacts","messagePolicy":"contacts","invitePolicy":"contacts"}') on conflict(user_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.oqi_student_privacy_defaults() from public,anon,authenticated;
drop trigger if exists oqi_student_privacy_defaults on public.darsino_profiles;
create trigger oqi_student_privacy_defaults after update of onboarded on public.darsino_profiles for each row execute function public.oqi_student_privacy_defaults();
commit;
