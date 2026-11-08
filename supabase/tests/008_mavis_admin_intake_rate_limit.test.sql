begin;

select plan(27);

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


-- Exercise the RPC through real authenticated JWT contexts, not only catalog metadata.
insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'mavis-admin-test@example.invalid', now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'mavis-editor-test@example.invalid', now(), now());

insert into public.profiles (id, role)
values
  ('10000000-0000-4000-8000-000000000001', 'admin'),
  ('10000000-0000-4000-8000-000000000002', 'editor');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select is(
  (select allowed from public.consume_mavis_admin_intake_rate_limit()),
  false,
  'a signed-in non-admin cannot consume the admin intake quota'
);
select is(
  (select retry_after_seconds from public.consume_mavis_admin_intake_rate_limit()),
  60,
  'a signed-in non-admin receives a bounded denial response'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is(
  (select allowed from public.consume_mavis_admin_intake_rate_limit()),
  true,
  'a signed-in site admin can consume the dedicated intake quota'
);
select is(
  (select count(*)::integer
   from generate_series(1, 29) as n
   cross join lateral public.consume_mavis_admin_intake_rate_limit() as decision
   where decision.allowed),
  29,
  'the admin quota allows requests through the thirtieth request in its window'
);
select is(
  (select allowed from public.consume_mavis_admin_intake_rate_limit()),
  false,
  'the admin quota blocks the thirty-first request in its window'
);
select ok(
  (select retry_after_seconds between 1 and 60
   from public.consume_mavis_admin_intake_rate_limit()),
  'the admin quota returns a bounded retry interval after exhaustion'
);

reset role;

select is(
  (select count(*)::integer
   from mavis_private.admin_intake_rate_limits
   where user_id = '10000000-0000-4000-8000-000000000001'),
  1,
  'only the authorized admin receives a dedicated intake counter'
);
select is(
  (select count(*)::integer
   from mavis_private.admin_intake_rate_limits
   where user_id = '10000000-0000-4000-8000-000000000002'),
  0,
  'a non-admin cannot create an intake counter'
);
select is(
  (select count(*)::integer
   from mavis_private.knowledge_search_rate_limits
   where user_id = '10000000-0000-4000-8000-000000000001'),
  0,
  'admin intake quota does not consume the separate knowledge-search counter'
);

select * from finish();

rollback;
