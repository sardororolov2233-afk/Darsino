begin;

-- Keep the reservation alive through the Storage INSERT transaction. Otherwise
-- deletion could observe no committed object, release its quota, and then leave
-- an object orphaned when an already-authorized upload commits afterward.
create or replace function public.darsino_storage_insert(bucket text,path text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare f public.darsino_files;
begin
  if not public.darsino_authenticated() then return false; end if;
  -- Filter ownership before acquiring a lock: guessing another account's object
  -- path must not let an unauthorized caller block its upload or deletion.
  select * into f from public.darsino_files
    where bucket_id=bucket and object_path=path and owner_id=auth.uid()
    for share;
  if not found then return false; end if;
  -- Check the locked row, including any state change committed while waiting.
  -- Storage may write authoritative object metadata later in its upload flow.
  return f.state='pending' and f.created_at>now()-interval '1 hour';
end $$;

revoke all on function public.darsino_storage_insert(text,text) from public,anon,authenticated;
grant execute on function public.darsino_storage_insert(text,text) to anon,authenticated;
comment on function public.darsino_storage_insert(text,text) is 'Storage INSERT authorization holds a shared reservation-row lock until upload transaction end, serializing deletion and quota release without depending on early object metadata.';

commit;
