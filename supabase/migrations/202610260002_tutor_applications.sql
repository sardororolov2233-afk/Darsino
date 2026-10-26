-- Tutor applications require a private phone number and a ready certificate.
begin;
create table if not exists public.oqi_tutor_applications (
  tutor_id uuid primary key references public.darsino_profiles(id) on delete cascade,
  contact_phone text not null check(contact_phone ~ '^\+[1-9][0-9]{8,14}$'),
  certificate_file_id uuid not null references public.darsino_files(id),
  submitted_at timestamptz not null default now()
);
alter table public.oqi_tutor_applications enable row level security;
revoke all on public.oqi_tutor_applications from public,anon,authenticated;

-- New accounts upload before their role/onboarded state is committed. This
-- permission alone does not create a tutor or put an incomplete draft in the queue.
do $upload$
declare definition text; previous text;
begin
  definition:=pg_get_functiondef('public.darsino_prepare_upload(text,text,text,bigint,text,uuid)'::regprocedure);
  previous:='exists(select 1 from public.darsino_tutors where user_id=me),''Repetitor profilini to‘ldiring.''';
  if position(previous in definition)>0 then
    execute replace(definition,previous,'(exists(select 1 from public.darsino_tutors where user_id=me) or exists(select 1 from public.darsino_profiles where id=me and not onboarded)),''Repetitor profilini to‘ldiring.''');
  elsif position('where id=me and not onboarded' in definition)=0 then
    raise exception 'Unexpected verification upload guard; application upgrade was not applied.';
  end if;
end $upload$;

do $$ begin
  if to_regprocedure('public.darsino_snapshot_tutor_base()') is null then
    alter function public.darsino_snapshot() rename to darsino_snapshot_tutor_base;
  end if;
  if to_regprocedure('public.darsino_mutate_tutor_base(jsonb)') is null then
    alter function public.darsino_mutate_idempotent_base(jsonb) rename to darsino_mutate_tutor_base;
  end if;
  if to_regprocedure('public.darsino_submit_document_tutor_base(uuid,text,text)') is null then
    alter function public.darsino_submit_document(uuid,text,text) rename to darsino_submit_document_tutor_base;
  end if;
end $$;

create or replace function public.darsino_snapshot() returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); result jsonb; market jsonb;
begin
  result:=public.darsino_snapshot_tutor_base(); market:=result->'market';
  market:=jsonb_set(market,'{tutorProfiles}',coalesce((select jsonb_agg(
    p.value || case when a.tutor_id is not null and (a.tutor_id=me or public.darsino_is_moderator()) then
      jsonb_build_object('contactPhone',a.contact_phone,'certificateFileId',a.certificate_file_id,'applicationSubmittedAt',a.submitted_at)
      else '{}'::jsonb end order by p.ordinality)
    from jsonb_array_elements(market->'tutorProfiles') with ordinality p(value,ordinality)
    left join public.oqi_tutor_applications a on a.tutor_id=(p.value->>'userId')::uuid),'[]'::jsonb));
  return result||jsonb_build_object('market',market);
end $$;

-- This is inside the existing public idempotency wrapper: a committed retry
-- returns its receipt without reopening an already reviewed application.
create or replace function public.darsino_mutate_idempotent_base(command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); actor public.darsino_profiles; payload jsonb;
  target uuid; file uuid; phone text; result jsonb; application boolean:=false;
begin
  if command->>'type' not in ('profile','tutor-profile','moderate') then
    return public.darsino_mutate_tutor_base(command);
  end if;
  if command->>'type' in ('profile','tutor-profile') then
    select * into actor from public.darsino_profiles where id=me for no key update;
  end if;
  if command->>'type'='tutor-profile' then
    perform public.darsino_assert(actor.role='tutor','Repetitor hisobiga kiring.');
    payload:=command->'profile'; application:=true;
  elsif command->>'type'='profile' and ((not actor.onboarded and coalesce(command->>'role',actor.role)='tutor') or (actor.role='tutor' and command->'tutor' is not null and command->'tutor'<>'null'::jsonb)) then
    payload:=command->'tutor'; application:=true;
  end if;
  if application then
    -- Existing content validation still runs; all writes roll back together.
    phone:=trim(coalesce(payload->>'contactPhone',''));
    perform public.darsino_assert(phone ~ '^\+[1-9][0-9]{8,14}$','Telefon raqamingizni xalqaro shaklda kiriting. Masalan, +998901234567.');
    file:=nullif(payload->>'certificateFileId','')::uuid;
    perform 1 from public.darsino_files f where f.id=file and f.owner_id=me and f.purpose='verification' and f.state='ready'
      and f.mime_type in ('application/pdf','image/jpeg','image/png','image/webp') and f.size_bytes between 1 and 10485760 for share;
    perform public.darsino_assert(found,'Sertifikatni PDF yoki rasm shaklida yuklang (10 MB gacha).');
    insert into public.oqi_tutor_applications(tutor_id,contact_phone,certificate_file_id)
      values(me,phone,file) on conflict(tutor_id) do update set contact_phone=excluded.contact_phone,certificate_file_id=excluded.certificate_file_id,submitted_at=now();
    if coalesce(char_length(trim(payload->>'proof')),0)<5 then payload:=jsonb_set(payload,'{proof}','"Yuklangan sertifikat"'); end if;
    -- Keep personal application fields out of the public tutor JSON forever.
    if command->>'type'='tutor-profile' then
      command:=jsonb_set(command,'{profile}',payload-'contactPhone'-'certificateFileId'-'applicationSubmittedAt');
    else
      command:=jsonb_set(command,'{tutor}',payload-'contactPhone'-'certificateFileId'-'applicationSubmittedAt');
    end if;
  elsif command->>'type'='moderate' then
    perform public.darsino_assert(public.darsino_is_moderator(),'Faqat moderator profilni tasdiqlaydi.');
    target:=(command->>'tutorId')::uuid;
    perform 1 from public.darsino_profiles where id=target for no key update;
    if command->>'decision'='approved' then
      perform public.darsino_assert(exists(select 1 from public.oqi_tutor_applications a join public.darsino_files f on f.id=a.certificate_file_id
        where a.tutor_id=target and f.owner_id=target and f.purpose='verification' and f.state='ready'
        and a.contact_phone ~ '^\+[1-9][0-9]{8,14}$'
        and exists(select 1 from public.darsino_tutor_documents d where d.tutor_id=target and d.file_id=f.id and d.status in ('pending','approved'))),
        'Avval o‘qituvchi telefon raqami va sertifikatini yuborsin.');
    end if;
  end if;
  result:=public.darsino_mutate_tutor_base(command);
  if application then
    insert into public.darsino_tutor_documents(tutor_id,file_id,document_type,label)
      values(me,file,'certificate','O‘qituvchi sertifikati') on conflict(file_id) do update
      set status='pending',reviewer_id=null,review_note='',reviewed_at=null;
    return public.darsino_snapshot()||jsonb_build_object('id',result->'id');
  end if;
  return result;
end $$;

-- Additional documents use the same private application and approval boundary.
create or replace function public.darsino_submit_document(p_file_id uuid,p_document_type text,p_label text) returns uuid
language plpgsql security definer set search_path='' as $$
declare me uuid:=public.darsino_account_id(); result uuid;
begin
  perform 1 from public.darsino_profiles where id=me for no key update;
  perform public.darsino_assert(exists(select 1 from public.oqi_tutor_applications where tutor_id=me),'Avval telefon raqami va sertifikat bilan profilingizni yuboring.');
  result:=public.darsino_submit_document_tutor_base(p_file_id,p_document_type,p_label);
  update public.oqi_tutor_applications set certificate_file_id=p_file_id,submitted_at=now() where tutor_id=me and certificate_file_id<>p_file_id;
  return result;
end $$;

revoke all on function public.darsino_snapshot_tutor_base(),public.darsino_mutate_tutor_base(jsonb),public.darsino_mutate_idempotent_base(jsonb),public.darsino_submit_document_tutor_base(uuid,text,text) from public,anon,authenticated;
revoke all on function public.darsino_snapshot(),public.darsino_submit_document(uuid,text,text) from public,anon;
grant execute on function public.darsino_snapshot(),public.darsino_submit_document(uuid,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
