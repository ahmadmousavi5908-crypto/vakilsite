begin;

select plan(21);

select ok(has_schema_privilege('authenticated', 'mavis_private', 'USAGE'),
  'authenticated has private schema usage for the guarded wrapper');
select ok(not has_schema_privilege('anon', 'mavis_private', 'USAGE'),
  'anonymous role cannot use the private MAVIS schema');
select ok(not has_schema_privilege('service_role', 'mavis_private', 'USAGE'),
  'service role cannot use the private MAVIS schema');
select ok(not has_table_privilege('authenticated', 'mavis_private.source_discovery_rate_limits', 'SELECT'),
  'authenticated cannot read discovery counters directly');
select ok(not has_table_privilege('authenticated', 'mavis_private.source_discovery_rate_limits', 'INSERT'),
  'authenticated cannot insert discovery counters directly');
select ok(not has_table_privilege('authenticated', 'mavis_private.source_discovery_rate_limits', 'UPDATE'),
  'authenticated cannot update discovery counters directly');
select ok(not has_table_privilege('authenticated', 'mavis_private.source_discovery_rate_limits', 'DELETE'),
  'authenticated cannot delete discovery counters directly');
select ok(not has_table_privilege('authenticated', 'mavis_private.source_discovery_rate_limits', 'TRUNCATE'),
  'authenticated cannot truncate discovery counters');
select ok(has_function_privilege('authenticated', 'mavis_private.consume_source_discovery_limit()', 'EXECUTE'),
  'authenticated can invoke the guarded private function');
select ok(not has_function_privilege('anon', 'mavis_private.consume_source_discovery_limit()', 'EXECUTE'),
  'anonymous role cannot execute the private function');
select ok(not has_function_privilege('service_role', 'mavis_private.consume_source_discovery_limit()', 'EXECUTE'),
  'service role cannot execute the private function');
select ok((select prosecdef from pg_proc where oid = 'mavis_private.consume_source_discovery_limit()'::regprocedure),
  'private function uses SECURITY DEFINER');
select ok((select relrowsecurity from pg_class where oid = 'mavis_private.source_discovery_rate_limits'::regclass),
  'private counter table has RLS enabled');
select ok(position('public.is_site_admin()' in pg_get_functiondef('mavis_private.consume_source_discovery_limit()'::regprocedure)) > 0,
  'private function verifies administrator role');
select ok(position('least' in lower(pg_get_functiondef('mavis_private.consume_source_discovery_limit()'::regprocedure))) > 0,
  'private function bounds the counter');
select ok(has_function_privilege('authenticated', 'public.consume_mavis_source_discovery_limit()', 'EXECUTE'),
  'authenticated can call guarded discovery RPC');
select ok(not has_function_privilege('anon', 'public.consume_mavis_source_discovery_limit()', 'EXECUTE'),
  'anonymous users cannot call discovery RPC');
select ok(not has_function_privilege('service_role', 'public.consume_mavis_source_discovery_limit()', 'EXECUTE'),
  'service role has no unnecessary execute permission');
select ok(not (select prosecdef from pg_proc where oid = 'public.consume_mavis_source_discovery_limit()'::regprocedure),
  'public wrapper runs with invoker privileges');
select ok((select coalesce(proconfig @> array['search_path=""'], false) from pg_proc
  where oid = 'mavis_private.consume_source_discovery_limit()'::regprocedure),
  'private function has empty search_path');
select ok((select coalesce(proconfig @> array['search_path=""'], false) from pg_proc
  where oid = 'public.consume_mavis_source_discovery_limit()'::regprocedure),
  'public wrapper has empty search_path');

select * from finish();
rollback;
