begin;

select plan(27);

select has_column('mavis_intake_private', 'submissions', 'idempotency_key',
  'intake submissions retain a client idempotency key');
select has_column('mavis_intake_private', 'submissions', 'request_fingerprint',
  'intake submissions retain only a keyed request fingerprint');

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'mavis_intake_private.submissions'::regclass
      and conname = 'mavis_intake_idempotency_key_unique'
      and contype = 'u'
  ),
  'idempotency keys are protected by a database unique constraint'
);

select ok(
  not has_function_privilege('service_role',
    'public.submit_mavis_public_intake(jsonb,text,text[],boolean,timestamp with time zone,text)', 'EXECUTE'),
  'the legacy non-idempotent submission RPC is no longer executable by the service role'
);
select ok(
  has_function_privilege('service_role',
    'public.submit_mavis_public_intake_idempotent(jsonb,text,text[],boolean,timestamp with time zone,text,uuid,text)', 'EXECUTE'),
  'the service role can execute the idempotent submission RPC'
);
select ok(
  not has_function_privilege('anon',
    'public.submit_mavis_public_intake_idempotent(jsonb,text,text[],boolean,timestamp with time zone,text,uuid,text)', 'EXECUTE'),
  'anonymous callers cannot invoke the idempotent submission RPC directly'
);

select ok(
  not has_table_privilege('service_role', 'mavis_intake_private.submissions', 'SELECT'),
  'service role cannot directly read private intake submissions'
);
select ok(
  not has_table_privilege('service_role', 'mavis_intake_private.submissions', 'INSERT'),
  'service role cannot directly insert private intake submissions'
);
select ok(
  not has_table_privilege('service_role', 'mavis_intake_private.submissions', 'UPDATE'),
  'service role cannot directly update private intake submissions'
);
select ok(
  not has_table_privilege('service_role', 'mavis_intake_private.submissions', 'DELETE'),
  'service role cannot directly delete private intake submissions'
);
select ok(
  not has_table_privilege('service_role', 'mavis_intake_private.audit_events', 'SELECT'),
  'service role cannot directly read private intake audit events'
);
select ok(
  not has_table_privilege('service_role', 'mavis_intake_private.audit_events', 'INSERT'),
  'service role cannot directly insert private intake audit events'
);
select ok(
  not has_table_privilege('service_role', 'mavis_intake_private.audit_events', 'UPDATE'),
  'service role cannot directly update private intake audit events'
);
select ok(
  not has_table_privilege('service_role', 'mavis_intake_private.audit_events', 'DELETE'),
  'service role cannot directly delete private intake audit events'
);
select ok(
  not has_table_privilege('service_role', 'mavis_intake_private.submissions', 'TRUNCATE'),
  'service role cannot truncate private intake submissions'
);
select ok(
  not has_table_privilege('service_role', 'mavis_intake_private.audit_events', 'TRUNCATE'),
  'service role cannot truncate private intake audit events'
);
select ok(
  not has_sequence_privilege('service_role', 'mavis_intake_private.audit_events_id_seq', 'USAGE'),
  'service role cannot consume private intake audit sequence values'
);
select ok(
  not has_sequence_privilege('service_role', 'mavis_intake_private.audit_events_id_seq', 'SELECT'),
  'service role cannot inspect private intake audit sequence state'
);
select ok(
  not has_sequence_privilege('service_role', 'mavis_intake_private.audit_events_id_seq', 'UPDATE'),
  'service role cannot alter private intake audit sequence state'
);
select ok(
  has_schema_privilege('service_role', 'mavis_intake_private', 'USAGE'),
  'service role retains schema usage required for narrowly scoped RPC execution'
);
select ok(
  has_function_privilege('service_role',
    'mavis_intake_private.submit_public_intake_idempotent(jsonb,text,text[],boolean,timestamp with time zone,text,uuid,text)', 'EXECUTE'),
  'service role can invoke the private idempotent function only through its granted execution privilege'
);

create temporary table mavis_idempotent_first on commit drop as
select *
from public.submit_mavis_public_intake_idempotent(
  jsonb_build_object(
    'fullName', 'علی رضایی',
    'phone', '09123456789',
    'caseType', 'civil',
    'summary', 'برای بررسی اولیه مطالبه وجه قرارداد و تعهدات قراردادی درخواست راهنمایی دارم.',
    'urgency', 'soon',
    'opposingParty', '',
    'consent', true,
    'marketingConsent', false,
    'thirdPartyDataNoticeAcknowledged', false
  ),
  'standard_human_review',
  array[]::text[],
  false,
  clock_timestamp() + interval '30 days',
  'intake-consent-v1',
  '20000000-0000-4000-8000-000000000001'::uuid,
  repeat('a', 64)
);

create temporary table mavis_idempotent_retry on commit drop as
select *
from public.submit_mavis_public_intake_idempotent(
  jsonb_build_object(
    'fullName', 'علی رضایی',
    'phone', '09123456789',
    'caseType', 'civil',
    'summary', 'برای بررسی اولیه مطالبه وجه قرارداد و تعهدات قراردادی درخواست راهنمایی دارم.',
    'urgency', 'soon',
    'opposingParty', '',
    'consent', true,
    'marketingConsent', false,
    'thirdPartyDataNoticeAcknowledged', false
  ),
  'standard_human_review',
  array[]::text[],
  false,
  clock_timestamp() + interval '30 days',
  'intake-consent-v1',
  '20000000-0000-4000-8000-000000000001'::uuid,
  repeat('a', 64)
);

select is((select id from mavis_idempotent_retry),
  (select id from mavis_idempotent_first),
  'a retry with the same key and fingerprint returns the original submission id');
select is((select tracking_code from mavis_idempotent_retry),
  (select tracking_code from mavis_idempotent_first),
  'a retry returns the original tracking receipt');
select is((select count(*)::integer from mavis_intake_private.submissions
  where idempotency_key = '20000000-0000-4000-8000-000000000001'::uuid),
  1, 'retries cannot create duplicate submission rows');
select is((select count(*)::integer from mavis_intake_private.audit_events
  where submission_id = (select id from mavis_idempotent_first)
    and event_code = 'submission_received'),
  1, 'a retry does not append a duplicate submission-received audit event');

select throws_ok(
  $$select * from public.submit_mavis_public_intake_idempotent(
    jsonb_build_object(
      'fullName', 'علی رضایی',
      'phone', '09123456789',
      'caseType', 'civil',
      'summary', 'برای بررسی اولیه مطالبه وجه قرارداد و تعهدات قراردادی درخواست راهنمایی دارم.',
      'urgency', 'soon',
      'opposingParty', '',
      'consent', true,
      'marketingConsent', false,
      'thirdPartyDataNoticeAcknowledged', false
    ),
    'standard_human_review', array[]::text[], false,
    clock_timestamp() + interval '30 days', 'intake-consent-v1',
    '20000000-0000-4000-8000-000000000001'::uuid, repeat('b', 64)
  )$$,
  '22023',
  'Idempotency key conflict',
  'the same idempotency key cannot be reused for a different request fingerprint'
);

select ok(
  (select id from public.submit_mavis_public_intake_idempotent(
    jsonb_build_object(
      'fullName', 'علی رضایی',
      'phone', '09123456789',
      'caseType', 'civil',
      'summary', 'برای بررسی اولیه مطالبه وجه قرارداد و تعهدات قراردادی درخواست راهنمایی دارم.',
      'urgency', 'soon',
      'opposingParty', '',
      'consent', true,
      'marketingConsent', false,
      'thirdPartyDataNoticeAcknowledged', false
    ),
    'standard_human_review',
    array[]::text[],
    false,
    clock_timestamp() + interval '30 days',
    'intake-consent-v1',
    '20000000-0000-4000-8000-000000000002'::uuid,
    repeat('a', 64)
  )) is distinct from (select id from mavis_idempotent_first),
  'a distinct idempotency key can create a separate intentional submission'
);

select * from finish();
rollback;
