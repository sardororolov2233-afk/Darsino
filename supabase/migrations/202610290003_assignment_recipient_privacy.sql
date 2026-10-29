-- Recipient lists belong to the teacher. Student RPC payloads already hide them;
-- column permissions close the same boundary for direct PostgREST queries.
begin;
revoke select on public.oqi_assignments from authenticated;
grant select(id,offering_id,teacher_id,title,description,subject,due_at,status,file_ids,revision,published_at,created_at,updated_at) on public.oqi_assignments to authenticated;
commit;
