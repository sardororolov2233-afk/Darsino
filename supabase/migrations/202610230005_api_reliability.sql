-- One command key represents one user intent, even if its HTTP response is lost.
-- Receipts retain a fixed-size SHA-256 intent digest, no message bodies or JWTs;
-- replies use current scoped state. Fresh keys have per-account write budgets.
begin;

create table if not exists public.darsino_mutation_receipts (
  actor_id uuid not null references public.darsino_profiles(id) on delete cascade,
  idempotency_key uuid not null,
  command_hash bytea not null check (octet_length(command_hash)=32),
  result_id uuid,
  created_at timestamptz not null default now(),
  primary key(actor_id,idempotency_key)
);
create index if not exists darsino_mutation_receipts_created on public.darsino_mutation_receipts(created_at);
alter table public.darsino_mutation_receipts enable row level security;
revoke all on public.darsino_mutation_receipts from public,anon,authenticated;

-- A single notification is generated for text and file messages alike.
alter table public.darsino_notifications add column if not exists message_id uuid references public.darsino_messages(id) on delete cascade;
create unique index if not exists darsino_notifications_message on public.darsino_notifications(message_id) where message_id is not null;
create index if not exists darsino_messages_recipient_time on public.darsino_messages(recipient_id,created_at desc,id);
create index if not exists darsino_messages_conversation_time on public.darsino_messages(conversation_id,created_at desc,id);
create index if not exists darsino_notifications_unread on public.darsino_notifications(user_id,created_at desc) where not read;

create or replace function public.darsino_notify_new_message(p_message_id uuid) returns void
language sql security definer set search_path='' as $$
  insert into public.darsino_notifications(user_id,title,body,message_id)
  select m.recipient_id,'Yangi xabar',left(m.text,140),m.id
  from public.darsino_messages m where m.id=p_message_id
  on conflict(message_id) where message_id is not null do nothing
$$;
create or replace function public.darsino_message_notification() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform public.darsino_notify_new_message(new.id);
  return new;
end $$;
revoke all on function public.darsino_notify_new_message(uuid),public.darsino_message_notification() from public,anon,authenticated;
drop trigger if exists darsino_message_notification on public.darsino_messages;
create trigger darsino_message_notification after insert on public.darsino_messages
for each row execute function public.darsino_message_notification();

do $$ begin
  if to_regprocedure('public.darsino_mutate_idempotent_base(jsonb)') is null then
    alter function public.darsino_mutate(jsonb) rename to darsino_mutate_idempotent_base;
  end if;
end $$;
create or replace function public.darsino_mutate(command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  me uuid:=public.darsino_account_id(); key uuid; intent jsonb; intent_hash bytea; result jsonb;
  receipt public.darsino_mutation_receipts;
begin
  perform public.darsino_assert(jsonb_typeof(command)='object','So‘rov formati noto‘g‘ri.');
  perform public.darsino_assert(command->>'actorId'=me::text,'Akkaunt o‘zgardi. Amalni qayta boshlang.');
  perform public.darsino_assert(octet_length(command::text)<=65536,'So‘rov juda katta.');
  -- Existing clients remain usable; upgraded clients supply a UUID per intent.
  if not command ? 'idempotencyKey' then
    return public.darsino_mutate_idempotent_base(command);
  end if;
  perform public.darsino_assert(jsonb_typeof(command->'idempotencyKey')='string' and
    command->>'idempotencyKey' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    'So‘rov identifikatori noto‘g‘ri.');
  key:=(command->>'idempotencyKey')::uuid;
  intent:=command-'idempotencyKey';
  intent_hash:=sha256(convert_to(intent::text,'UTF8'));
  -- The lock serializes matching keys across independent API workers. It is
  -- acquired before authority/scheduling row locks in the delegated command.
  perform pg_advisory_xact_lock(hashtextextended('oqi.command:'||me::text||':'||key::text,0));
  select * into receipt from public.darsino_mutation_receipts
    where actor_id=me and idempotency_key=key;
  if found then
    if receipt.command_hash<>intent_hash then
      raise exception 'So‘rov identifikatori boshqa amal uchun ishlatilgan.' using errcode='22023';
    end if;
    return public.darsino_snapshot()||jsonb_build_object('id',receipt.result_id);
  end if;
  -- Replays are free; only a genuinely new, successfully committed intent
  -- consumes budget. A failed transaction rolls these counters back as well.
  perform public.darsino_account_rate('mutation-minute',120,60);
  perform public.darsino_account_rate('mutation-day',1000,86400);
  result:=public.darsino_mutate_idempotent_base(intent);
  insert into public.darsino_mutation_receipts(actor_id,idempotency_key,command_hash,result_id)
    values(me,key,intent_hash,nullif(result->>'id','')::uuid);
  return result;
end $$;
revoke all on function public.darsino_mutate_idempotent_base(jsonb) from public,anon,authenticated;
revoke all on function public.darsino_mutate(jsonb) from public,anon;
grant execute on function public.darsino_mutate(jsonb) to authenticated;

-- Service/admin maintenance only. Never expire a key in its first 24 hours.
create or replace function public.darsino_prune_mutation_receipts(p_before timestamptz default now()-interval '30 days') returns bigint
language plpgsql security definer set search_path='' as $$
declare removed bigint;
begin
  perform public.darsino_assert(p_before is not null and p_before<=now()-interval '24 hours','Oxirgi 24 soatdagi so‘rovlar saqlanishi kerak.');
  delete from public.darsino_mutation_receipts where created_at<p_before;
  get diagnostics removed=row_count;
  return removed;
end $$;
revoke all on function public.darsino_prune_mutation_receipts(timestamptz) from public,anon,authenticated;
grant execute on function public.darsino_prune_mutation_receipts(timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
