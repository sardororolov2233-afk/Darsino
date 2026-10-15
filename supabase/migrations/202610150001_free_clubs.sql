-- Permit free, explicitly labelled group clubs without changing paid lessons,
-- teacher verification, ownership, capacity or schedule validation.
begin;
do $oqi_free_clubs$
declare
  definition text := pg_get_functiondef('public.darsino_mutate_core(jsonb)'::regprocedure);
  previous text := $condition$and (value->>'price')::numeric > 0 and (value->>'price')::numeric <= 100000000,'Hudud, manzil va narxni kiriting.');$condition$;
  updated text := $condition$and ((value->>'price')::numeric > 0 or ((value->>'price')::numeric = 0 and value->>'type' = 'group' and coalesce(value->'benefits','[]'::jsonb) @> '["O‘qi klubi"]'::jsonb)) and (value->>'price')::numeric <= 100000000,'Hudud, manzil va narxni kiriting.'); -- OQI_FREE_CLUBS_V1$condition$;
begin
  if position('OQI_FREE_CLUBS_V1' in definition) > 0 then
    return;
  end if;
  if position(previous in definition) = 0 then
    raise exception 'Unexpected Darsino core RPC version; free-club validation was not applied.';
  end if;
  execute replace(definition, previous, updated);
end $oqi_free_clubs$;
-- The core helper remains private; clients use the existing authenticated wrapper.
revoke all on function public.darsino_mutate_core(jsonb) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
