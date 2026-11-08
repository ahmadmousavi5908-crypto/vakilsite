begin;

select plan(11);

select ok(
  not has_schema_privilege('authenticated', 'mavis_private', 'USAGE'),
  'authenticated cannot access the private MAVIS schema directly'
);
select ok(
  not has_table_privilege('authenticated', 'mavis_private.knowledge_search_rate_limits', 'SELECT'),
  'authenticated cannot read rate-limit counters directly'
);
select ok(
  not has_table_privilege('authenticated', 'mavis_private.knowledge_search_rate_limits', 'INSERT'),
  'authenticated cannot insert rate-limit counters directly'
);
select ok(
  not has_table_privilege('authenticated', 'mavis_private.knowledge_search_rate_limits', 'UPDATE'),
  'authenticated cannot alter rate-limit counters directly'
);
select ok(
  not has_table_privilege('authenticated', 'mavis_private.knowledge_search_rate_limits', 'DELETE'),
  'authenticated cannot delete rate-limit counters directly'
);
select ok(
  not has_table_privilege('authenticated', 'mavis_private.knowledge_search_rate_limits', 'TRUNCATE'),
  'authenticated cannot truncate rate-limit counters'
);
select ok(
  has_function_privilege('authenticated', 'public.consume_mavis_knowledge_search_limit()', 'EXECUTE'),
  'authenticated can call the guarded rate-limit function'
);
select ok(
  not has_function_privilege('anon', 'public.consume_mavis_knowledge_search_limit()', 'EXECUTE'),
  'anonymous users cannot call the rate-limit function'
);
select ok(
  not has_function_privilege('service_role', 'public.consume_mavis_knowledge_search_limit()', 'EXECUTE'),
  'service role does not receive unnecessary execute permission'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.consume_mavis_knowledge_search_limit()'::regprocedure),
  'rate-limit function runs with its controlled definer privileges'
);
select ok(
  (select coalesce(proconfig @> array['search_path=""'], false)
   from pg_proc
   where oid = 'public.consume_mavis_knowledge_search_limit()'::regprocedure),
  'rate-limit function has an empty search_path'
);

select * from finish();

rollback;
