begin;

select plan(21);

select ok(
  has_schema_privilege('authenticated', 'mavis_private', 'USAGE'),
  'authenticated has only the schema usage required by the invoker wrapper'
);
select ok(
  not has_schema_privilege('anon', 'mavis_private', 'USAGE'),
  'anonymous role cannot use the private MAVIS schema'
);
select ok(
  not has_schema_privilege('service_role', 'mavis_private', 'USAGE'),
  'service role cannot use the private MAVIS schema'
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
  has_function_privilege('authenticated', 'mavis_private.consume_knowledge_search_limit()', 'EXECUTE'),
  'authenticated can invoke the inner function only through its admin check'
);
select ok(
  not has_function_privilege('anon', 'mavis_private.consume_knowledge_search_limit()', 'EXECUTE'),
  'anonymous role cannot execute the private rate-limit function'
);
select ok(
  not has_function_privilege('service_role', 'mavis_private.consume_knowledge_search_limit()', 'EXECUTE'),
  'service role cannot execute the private rate-limit function'
);
select ok(
  (select prosecdef from pg_proc where oid = 'mavis_private.consume_knowledge_search_limit()'::regprocedure),
  'private rate-limit function uses SECURITY DEFINER'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'mavis_private.knowledge_search_rate_limits'::regclass),
  'private rate-limit counter table has RLS enabled'
);
select ok(
  position(
    'public.is_site_admin()' in pg_get_functiondef('mavis_private.consume_knowledge_search_limit()'::regprocedure)
  ) > 0,
  'private rate-limit function verifies the site-admin role'
);
select ok(
  position(
    'least' in lower(pg_get_functiondef('mavis_private.consume_knowledge_search_limit()'::regprocedure))
  ) > 0,
  'private rate-limit function bounds the stored counter'
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
  not (select prosecdef from pg_proc where oid = 'public.consume_mavis_knowledge_search_limit()'::regprocedure),
  'public RPC wrapper runs with invoker privileges'
);
select ok(
  (select coalesce(proconfig @> array['search_path=""'], false)
   from pg_proc
   where oid = 'mavis_private.consume_knowledge_search_limit()'::regprocedure),
  'private rate-limit function has an empty search_path'
);
select ok(
  (select coalesce(proconfig @> array['search_path=""'], false)
   from pg_proc
   where oid = 'public.consume_mavis_knowledge_search_limit()'::regprocedure),
  'public invoker wrapper has an empty search_path'
);

select * from finish();

rollback;
