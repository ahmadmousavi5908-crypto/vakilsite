begin;

select plan(61);

select ok(has_schema_privilege('service_role', 'mavis_intake_private', 'USAGE'),
  'server service role can access the private intake schema');
select ok(not has_schema_privilege('anon', 'mavis_intake_private', 'USAGE'),
  'anonymous role cannot access the private intake schema');
select ok(not has_schema_privilege('authenticated', 'mavis_intake_private', 'USAGE'),
  'authenticated role cannot access the private intake schema');

select ok((select relrowsecurity from pg_class
  where oid = 'mavis_intake_private.submissions'::regclass),
  'intake submissions table has RLS enabled');
select ok((select relrowsecurity from pg_class
  where oid = 'mavis_intake_private.audit_events'::regclass),
  'intake audit table has RLS enabled');
select ok((select relrowsecurity from pg_class
  where oid = 'mavis_intake_private.rate_limits'::regclass),
  'intake rate-limit table has RLS enabled');

select ok(not has_table_privilege('service_role', 'mavis_intake_private.submissions', 'SELECT'),
  'service role cannot read submissions directly');
select ok(not has_table_privilege('service_role', 'mavis_intake_private.submissions', 'INSERT'),
  'service role cannot insert submissions directly');
select ok(not has_table_privilege('service_role', 'mavis_intake_private.submissions', 'UPDATE'),
  'service role cannot update submissions directly');
select ok(not has_table_privilege('service_role', 'mavis_intake_private.submissions', 'DELETE'),
  'server role cannot directly delete submissions');
select ok(not has_table_privilege('service_role', 'mavis_intake_private.submissions', 'TRUNCATE'),
  'server role cannot truncate submissions');
select ok(not has_table_privilege('anon', 'mavis_intake_private.submissions', 'SELECT'),
  'anonymous users cannot read submissions');
select ok(not has_table_privilege('anon', 'mavis_intake_private.submissions', 'INSERT'),
  'anonymous users cannot insert submissions directly');
select ok(not has_table_privilege('authenticated', 'mavis_intake_private.submissions', 'SELECT'),
  'authenticated users cannot bypass the server authorization layer');
select ok(not has_table_privilege('authenticated', 'mavis_intake_private.submissions', 'INSERT'),
  'authenticated users cannot insert submissions directly');

select ok(not has_table_privilege('service_role', 'mavis_intake_private.audit_events', 'INSERT'),
  'service role cannot append audit events directly');

select ok(not has_table_privilege('service_role', 'mavis_intake_private.audit_events', 'SELECT'),
  'service role cannot read audit events directly');
select ok(not has_sequence_privilege('service_role', 'mavis_intake_private.audit_events_id_seq', 'USAGE'),
  'service role cannot consume the audit identity sequence directly');
select ok(not has_sequence_privilege('service_role', 'mavis_intake_private.audit_events_id_seq', 'SELECT'),
  'service role cannot inspect the audit identity sequence directly');

select ok(not has_table_privilege('anon', 'mavis_intake_private.audit_events', 'SELECT'),
  'anonymous users cannot read audit events');
select ok(not has_table_privilege('authenticated', 'mavis_intake_private.audit_events', 'SELECT'),
  'authenticated users cannot read audit events directly');

select ok(not has_table_privilege('service_role', 'mavis_intake_private.rate_limits', 'SELECT'),
  'server role cannot read rate-limit buckets directly');
select ok(not has_table_privilege('service_role', 'mavis_intake_private.rate_limits', 'INSERT'),
  'server role cannot insert rate-limit buckets directly');
select ok(not has_table_privilege('anon', 'mavis_intake_private.rate_limits', 'SELECT'),
  'anonymous users cannot read rate-limit buckets');

select ok(has_function_privilege('service_role',
  'mavis_intake_private.consume_public_intake_rate_limit(text)', 'EXECUTE'),
  'server role can invoke the bounded rate-limit function');
select ok(not has_function_privilege('anon',
  'mavis_intake_private.consume_public_intake_rate_limit(text)', 'EXECUTE'),
  'anonymous users cannot invoke the private rate-limit function');
select ok(not has_function_privilege('authenticated',
  'mavis_intake_private.consume_public_intake_rate_limit(text)', 'EXECUTE'),
  'authenticated users cannot invoke the private rate-limit function');

select ok((select prosecdef from pg_proc
  where oid = 'mavis_intake_private.consume_public_intake_rate_limit(text)'::regprocedure),
  'rate-limit function uses SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'], false)
  from pg_proc
  where oid = 'mavis_intake_private.consume_public_intake_rate_limit(text)'::regprocedure),
  'rate-limit function has an empty search_path');

select ok(has_function_privilege('service_role',
  'mavis_intake_private.purge_expired_public_intake(timestamp with time zone)', 'EXECUTE'),
  'server role can invoke the retention purge function');
select ok(not has_function_privilege('anon',
  'mavis_intake_private.purge_expired_public_intake(timestamp with time zone)', 'EXECUTE'),
  'anonymous users cannot invoke the retention purge function');
select ok((select prosecdef from pg_proc
  where oid = 'mavis_intake_private.purge_expired_public_intake(timestamp with time zone)'::regprocedure),
  'retention purge function uses SECURITY DEFINER');

select has_column('mavis_intake_private', 'submissions', 'retention_expires_at',
  'every intake submission requires an explicit retention expiry');
select has_column('mavis_intake_private', 'submissions', 'initial_review_consent_at',
  'initial review consent timestamp is retained');
select has_column('mavis_intake_private', 'submissions', 'marketing_consent_at',
  'marketing consent has an independent timestamp');


select ok(has_function_privilege('service_role',
  'public.consume_mavis_public_intake_rate_limit(text)', 'EXECUTE'),
  'service role can call the public rate-limit invoker wrapper');
select ok(not has_function_privilege('anon',
  'public.consume_mavis_public_intake_rate_limit(text)', 'EXECUTE'),
  'anonymous users cannot call the public rate-limit wrapper');
select ok(not has_function_privilege('authenticated',
  'public.consume_mavis_public_intake_rate_limit(text)', 'EXECUTE'),
  'authenticated users cannot call the public rate-limit wrapper');

select ok(not has_function_privilege('service_role',
  'public.submit_mavis_public_intake(jsonb,text,text[],boolean,timestamp with time zone,text)', 'EXECUTE'),
  'service role cannot call the retired non-idempotent intake wrapper');
select ok(not has_function_privilege('anon',
  'public.submit_mavis_public_intake(jsonb,text,text[],boolean,timestamp with time zone,text)', 'EXECUTE'),
  'anonymous users cannot call the public intake wrapper directly');
select ok(not has_function_privilege('authenticated',
  'public.submit_mavis_public_intake(jsonb,text,text[],boolean,timestamp with time zone,text)', 'EXECUTE'),
  'authenticated users cannot call the public intake wrapper');

select ok(has_function_privilege('service_role',
  'public.purge_mavis_expired_public_intake(timestamp with time zone)', 'EXECUTE'),
  'service role can call the public retention invoker wrapper');
select ok(not has_function_privilege('anon',
  'public.purge_mavis_expired_public_intake(timestamp with time zone)', 'EXECUTE'),
  'anonymous users cannot call the public retention wrapper');
select ok(not has_function_privilege('authenticated',
  'public.purge_mavis_expired_public_intake(timestamp with time zone)', 'EXECUTE'),
  'authenticated users cannot call the public retention wrapper');

select ok(not (select prosecdef from pg_proc
  where oid = 'public.consume_mavis_public_intake_rate_limit(text)'::regprocedure),
  'public rate-limit wrapper uses invoker privileges');
select ok(not (select prosecdef from pg_proc
  where oid = 'public.submit_mavis_public_intake(jsonb,text,text[],boolean,timestamp with time zone,text)'::regprocedure),
  'public intake wrapper uses invoker privileges');
select ok(not (select prosecdef from pg_proc
  where oid = 'public.purge_mavis_expired_public_intake(timestamp with time zone)'::regprocedure),
  'public retention wrapper uses invoker privileges');

select ok((select prosecdef from pg_proc
  where oid = 'mavis_intake_private.submit_public_intake(jsonb,text,text[],boolean,timestamp with time zone,text)'::regprocedure),
  'private intake submit function uses SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'], false)
  from pg_proc
  where oid = 'mavis_intake_private.submit_public_intake(jsonb,text,text[],boolean,timestamp with time zone,text)'::regprocedure),
  'private intake submit function has an empty search_path');


select ok(has_function_privilege('service_role',
  'public.list_mavis_public_intake_submissions(uuid,text,integer,integer)', 'EXECUTE'),
  'service role can call the admin intake list wrapper');
select ok(not has_function_privilege('anon',
  'public.list_mavis_public_intake_submissions(uuid,text,integer,integer)', 'EXECUTE'),
  'anonymous users cannot call the admin intake list wrapper');
select ok(not has_function_privilege('authenticated',
  'public.list_mavis_public_intake_submissions(uuid,text,integer,integer)', 'EXECUTE'),
  'authenticated users cannot call the admin intake list wrapper directly');

select ok(has_function_privilege('service_role',
  'public.update_mavis_public_intake_status(uuid,uuid,text)', 'EXECUTE'),
  'service role can call the admin status update wrapper');
select ok(not has_function_privilege('anon',
  'public.update_mavis_public_intake_status(uuid,uuid,text)', 'EXECUTE'),
  'anonymous users cannot call the admin status update wrapper');
select ok(not has_function_privilege('authenticated',
  'public.update_mavis_public_intake_status(uuid,uuid,text)', 'EXECUTE'),
  'authenticated users cannot call the admin status update wrapper directly');

select ok(not (select prosecdef from pg_proc
  where oid = 'public.list_mavis_public_intake_submissions(uuid,text,integer,integer)'::regprocedure),
  'public admin list wrapper uses invoker privileges');
select ok(not (select prosecdef from pg_proc
  where oid = 'public.update_mavis_public_intake_status(uuid,uuid,text)'::regprocedure),
  'public admin status wrapper uses invoker privileges');

select ok((select prosecdef from pg_proc
  where oid = 'mavis_intake_private.list_public_intake_submissions(uuid,text,integer,integer)'::regprocedure),
  'private admin list function uses SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'], false)
  from pg_proc
  where oid = 'mavis_intake_private.list_public_intake_submissions(uuid,text,integer,integer)'::regprocedure),
  'private admin list function has an empty search_path');
select ok((select prosecdef from pg_proc
  where oid = 'mavis_intake_private.update_public_intake_status(uuid,uuid,text)'::regprocedure),
  'private admin status function uses SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'], false)
  from pg_proc
  where oid = 'mavis_intake_private.update_public_intake_status(uuid,uuid,text)'::regprocedure),
  'private admin status function has an empty search_path');

select * from finish();
rollback;
