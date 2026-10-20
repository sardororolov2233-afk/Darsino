-- Monthly bookkeeping. Amounts are records entered by tutors, not a payment gateway.
begin;
create table if not exists public.darsino_payments (
  offering_id uuid not null,
  student_id uuid not null,
  month text not null check (month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  amount numeric not null check (amount > 0 and amount <= 100000000),
  paid boolean not null default false,
  paid_at timestamptz,
  reminded_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(offering_id,student_id,month),
  foreign key(offering_id,student_id) references public.darsino_enrollments(offering_id,student_id),
  check (paid = (paid_at is not null))
);
create index if not exists darsino_payments_student on public.darsino_payments(student_id,month);
alter table public.darsino_payments enable row level security;
revoke all on public.darsino_payments from public,anon,authenticated;

-- Wrappers are recreated below; older clients retain the same authenticated RPCs.
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
    perform public.darsino_assert(found and (member.active or previous.offering_id is not null) and to_char(member.created_at at time zone 'Asia/Tashkent','YYYY-MM')<=billing_month,'O‘quvchi bu oyda guruhda qatnashmaydi.');
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
revoke all on function public.darsino_record_payment(jsonb) from public,anon,authenticated;

create or replace function public.darsino_snapshot() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid:=public.darsino_account_id(); result jsonb; market jsonb;
begin
  result:=public.darsino_snapshot_core(); market:=result->'market';
  market:=jsonb_set(market,'{users}',coalesce((
    select jsonb_agg(u.value||jsonb_build_object('avatarFileId',p.avatar_file_id,'email',case when p.id=me then p.email else '' end)||case when p.id=me then jsonb_strip_nulls(jsonb_build_object('studyMode',p.study_mode,'studySupport',p.study_support)) else '{}'::jsonb end order by u.ordinality)
    from jsonb_array_elements(market->'users') with ordinality u(value,ordinality)
    join public.darsino_profiles p on p.id=(u.value->>'id')::uuid),'[]'::jsonb));
  market:=jsonb_set(market,'{offerings}',coalesce((
    select jsonb_agg(o.value||jsonb_build_object('coverFileId',p.cover_file_id) order by o.ordinality)
    from jsonb_array_elements(market->'offerings') with ordinality o(value,ordinality)
    join public.darsino_offerings p on p.id=(o.value->>'id')::uuid),'[]'::jsonb));
  market:=jsonb_set(market,'{messages}',coalesce((
    select jsonb_agg(m.value||jsonb_build_object('attachmentIds',coalesce((select jsonb_agg(mf.file_id) from public.darsino_message_files mf where mf.message_id=(m.value->>'id')::uuid),'[]'::jsonb)) order by m.ordinality)
    from jsonb_array_elements(market->'messages') with ordinality m(value,ordinality)),'[]'::jsonb));
  market:=market||jsonb_build_object(
    'files',coalesce((select jsonb_agg(public.darsino_file_json(f) order by f.created_at) from public.darsino_files f where public.darsino_can_read_file(f.id)),'[]'::jsonb),
    'tutorDocuments',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'tutorId',d.tutor_id,'fileId',d.file_id,'documentType',d.document_type,'label',d.label,'status',d.status,'reviewNote',d.review_note,'createdAt',d.created_at,'reviewedAt',d.reviewed_at) order by d.created_at) from public.darsino_tutor_documents d where d.tutor_id=me or public.darsino_is_moderator()),'[]'::jsonb),
    'lessonFiles',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'offeringId',f.offering_id,'sessionId',f.session_id,'fileId',f.file_id,'title',f.title,'published',f.published,'createdAt',f.created_at) order by f.created_at) from public.darsino_lesson_files f join public.darsino_offerings o on o.id=f.offering_id where o.tutor_id=me or (f.published and public.darsino_class_access(f.offering_id))),'[]'::jsonb));
  market:=market||jsonb_build_object('payments',coalesce((
    select jsonb_agg(jsonb_build_object('offeringId',p.offering_id,'studentId',p.student_id,'month',p.month,'amount',p.amount,'paid',p.paid,'paidAt',p.paid_at,'remindedAt',p.reminded_at,'updatedAt',p.updated_at) order by p.month,p.student_id)
    from public.darsino_payments p join public.darsino_offerings o on o.id=p.offering_id
    where p.student_id=me or o.tutor_id=me),'[]'::jsonb));
  return jsonb_build_object('market',market,'user',(select u from jsonb_array_elements(market->'users') u where u->>'id'=me::text));
end $$;

create or replace function public.darsino_mutate(command jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; prefs jsonb; begin
  perform public.darsino_account_id();
  if command->>'type'='profile' then
    prefs:=command->'profile';
    if prefs ? 'studyMode' or prefs ? 'studySupport' then
      perform public.darsino_assert(
        coalesce(prefs->>'studyMode','') in ('Onlayn','Oflayn') and
        coalesce(prefs->>'studySupport','') in ('Mustaqil','Ustoz bilan'),
        'Ta’lim shakli va tayyorgarlik usulini tanlang.');
    end if;
  end if;
  if command->>'type' in ('payment','payment-reminder') then
    perform public.darsino_record_payment(command);
    return public.darsino_snapshot();
  end if;
  result:=public.darsino_mutate_core(command);
  if command->>'type'='profile' and (prefs ? 'studyMode' or prefs ? 'studySupport') then
    update public.darsino_profiles set study_mode=prefs->>'studyMode',study_support=prefs->>'studySupport' where id=auth.uid();
  end if;
  if command->>'type'='moderate' then
    update public.darsino_tutor_documents set status=command->>'decision',reviewer_id=auth.uid(),
      review_note=trim(coalesce(command->>'note','')),reviewed_at=now()
    where tutor_id=(command->>'tutorId')::uuid and status='pending';
  end if;
  return public.darsino_snapshot()||jsonb_build_object('id',result->'id');
end $$;

revoke all on function public.darsino_snapshot(),public.darsino_mutate(jsonb) from public,anon;
grant execute on function public.darsino_snapshot(),public.darsino_mutate(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
