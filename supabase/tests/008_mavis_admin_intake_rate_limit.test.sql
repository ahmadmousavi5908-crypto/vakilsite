begin;

select plan(18);

select ok(
  has_schema_privilege('authenticated', 'mavis_private', 'USAGE'),
  'authenticated can reach only the guarded invoker wrapper'
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
  (select relrowsecurity from pg_class where oid = 'mavis_private.admin_intake_rate_limits'::regclass),
  'admin intake rate-limit table has RLS enabled'
);
select ok(
  not has_table_privilege('authenticated', 'mavis_private.admin_intake_rate_limits', 'SELECT'),
  'authenticated cannot read admin rate-limit counters'
);
select ok(
  not has_table_privilege('authenticated', 'mavis_private.admin_intake_rate_limits', 'INSERT'),
  'authenticated cannot insert admin rate-limit counters'
);
select ok(
  not has_table_privilege('authenticated', 'mavis_private.admin_intake_rate_limits', 'UPDATE'),
  'authenticated cannot alter admin rate-limit counters'
);
select ok(
  not has_table_privilege('authenticated', 'mavis_private.admin_intake_rate_limits', 'DELETE'),
  'authenticated cannot delete admin rate-limit counters'
);
select ok(
  has_function_privilege('authenticated', 'mavis_private.consume_admin_intake_rate_limit()', 'EXECUTE'),
  'authenticated can invoke the private limiter only through its admin check'
);
select ok(
  not has_function_privilege('anon', 'mavis_private.consume_admin_intake_rate_limit()', 'EXECUTE'),
  'anonymous role cannot execute the private limiter'
);
select ok(
  not has_function_privilege('service_role', 'mavis_private.consume_admin_intake_rate_limit()', 'EXECUTE'),
  'service role cannot execute the private limiter'
);
select ok(
  (select prosecdef from pg_proc where oid = 'mavis_private.consume_admin_intake_rate_limit()'::regprocedure),
  'private admin limiter uses SECURITY DEFINER'
);
select ok(
  position('public.is_site_admin()' in pg_get_functiondef(
    'mavis_private.consume_admin_intake_rate_limit()'::regprocedure
  )) > 0,
  'private admin limiter checks the authenticated admin role'
);
select ok(
  position('least' in lower(pg_get_functiondef(
    'mavis_private.consume_admin_intake_rate_limit()'::regprocedure
  ))) > 0,
  'private admin limiter bounds the stored request counter'
);
select ok(
  position('60 seconds' in lower(pg_get_functiondef(
    'mavis_private.consume_admin_intake_rate_limit()'::regprocedure
  ))) > 0,
  'private admin limiter uses a bounded sixty-second window'
);
select ok(
  has_function_privilege('authenticated', 'public.consume_mavis_admin_intake_rate_limit()', 'EXECUTE'),
  'authenticated can call the guarded public wrapper'
);
select ok(
  not has_function_privilege('anon', 'public.consume_mavis_admin_intake_rate_limit()', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.consume_mavis_admin_intake_rate_limit()', 'EXECUTE'),
  'anonymous and service roles cannot call the public wrapper'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.consume_mavis_admin_intake_rate_limit()'::regprocedure),
  'public wrapper runs with invoker privileges'
);

select * from finish();

rollback;
