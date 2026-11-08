begin;

select plan(22);

select is((select allowed from public.consume_mavis_public_intake_rate_limit(repeat('a', 64))), true,
  'first intake request in a window is allowed');
select is((select allowed from public.consume_mavis_public_intake_rate_limit(repeat('a', 64))), true,
  'second intake request in a window is allowed');
select is((select allowed from public.consume_mavis_public_intake_rate_limit(repeat('a', 64))), true,
  'third intake request in a window is allowed');
select is((select allowed from public.consume_mavis_public_intake_rate_limit(repeat('a', 64))), true,
  'fourth intake request in a window is allowed');
select is((select allowed from public.consume_mavis_public_intake_rate_limit(repeat('a', 64))), true,
  'fifth intake request in a window is allowed');
select is((select allowed from public.consume_mavis_public_intake_rate_limit(repeat('a', 64))), false,
  'sixth intake request in a window is blocked');
select ok((select retry_after_seconds between 1 and 900
  from public.consume_mavis_public_intake_rate_limit(repeat('a', 64))),
  'rate-limit decision returns a bounded retry interval');
select is((select allowed from public.consume_mavis_public_intake_rate_limit('invalid-hash')), false,
  'malformed rate-limit bucket hashes fail closed');

create temporary table mavis_test_receipt on commit drop as
select *
from public.submit_mavis_public_intake(
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
  'intake-consent-v1'
);

select is((select char_length(tracking_code) from mavis_test_receipt), 32,
  'successful intake returns a high-entropy tracking code');
select is((select phone from mavis_intake_private.submissions where id = (select id from mavis_test_receipt)),
  '+989123456789', 'database normalizes Iranian mobile numbers to E.164 form');
select ok((select initial_review_consent and initial_review_consent_at is not null
  from mavis_intake_private.submissions where id = (select id from mavis_test_receipt)),
  'initial review consent is required and timestamped');
select ok((select not marketing_consent and marketing_consent_at is null
  from mavis_intake_private.submissions where id = (select id from mavis_test_receipt)),
  'marketing consent remains independent and opt-in');
select ok((select not third_party_data_notice_acknowledged
  and third_party_data_notice_acknowledged_at is null
  from mavis_intake_private.submissions where id = (select id from mavis_test_receipt)),
  'third-party notice acknowledgement is not silently enabled');
select is((select count(*)::integer from mavis_intake_private.audit_events
  where submission_id = (select id from mavis_test_receipt)
    and event_code = 'submission_received'), 1,
  'successful intake appends a metadata-only audit event');

select throws_ok(
  $$select * from public.submit_mavis_public_intake(
    '{"fullName":"علی رضایی","phone":"09123456789","caseType":"civil","summary":"شرح کافی برای آزمون اعتبارسنجی دیتابیس و کنترل رضایت.","urgency":"soon","consent":false}'::jsonb,
    'standard_human_review', array[]::text[], false,
    clock_timestamp() + interval '30 days', 'intake-consent-v1'
  )$$,
  'P0001',
  'Intake validation failed',
  'database rejects submissions without initial-review consent'
);

select throws_ok(
  $$select * from public.submit_mavis_public_intake(
    '{"fullName":"علی رضایی","phone":"09123456789","caseType":"civil","summary":"شرح کافی برای آزمون اعتبارسنجی دیتابیس و کنترل رضایت.","urgency":"soon","consent":true,"unexpected":"secret"}'::jsonb,
    'standard_human_review', array[]::text[], false,
    clock_timestamp() + interval '30 days', 'intake-consent-v1'
  )$$,
  'P0001',
  'Invalid intake payload shape',
  'database rejects unrecognized payload fields'
);

insert into mavis_intake_private.submissions (
  full_name, phone, case_type, summary, urgency,
  initial_review_consent, initial_review_consent_at, consent_version,
  review_priority, retention_expires_at, created_at
)
values (
  'آزمون حذف', '+989123456789', 'civil',
  'رکورد آزمایشی برای کنترل حذف بر اساس مهلت نگهداری.',
  'routine', true, clock_timestamp() - interval '2 days', 'test-v1',
  'standard_human_review', clock_timestamp() - interval '1 day',
  clock_timestamp() - interval '2 days'
);
create temporary table mavis_expired_receipt on commit drop as
select id from mavis_intake_private.submissions where full_name = 'آزمون حذف';

insert into mavis_intake_private.audit_events (submission_id, event_code, actor_type, created_at)
select id, 'submission_received', 'system', clock_timestamp() - interval '2 days'
from mavis_expired_receipt;

create temporary table mavis_purge_result on commit drop as
select * from public.purge_mavis_expired_public_intake(clock_timestamp() - interval '1 day');

select is((select submissions_deleted from mavis_purge_result), 1::bigint,
  'purge deletes expired submissions');
select ok(not exists (select 1 from mavis_intake_private.submissions
  where id = (select id from mavis_expired_receipt)),
  'expired submission content is removed');
select ok(exists (select 1 from mavis_intake_private.audit_events
  where event_code = 'submission_received' and submission_id is null),
  'metadata-only audit event survives submission deletion without personal content');

insert into mavis_intake_private.submissions (
  full_name, phone, case_type, summary, urgency,
  initial_review_consent, initial_review_consent_at, consent_version,
  review_priority, status, retention_expires_at, created_at
)
values (
  'آزمون توقف حذف', '+989123456789', 'civil',
  'رکورد آزمایشی دارای توقف قانونی حذف و نگهداری.',
  'routine', true, clock_timestamp() - interval '2 days', 'test-v1',
  'standard_human_review', 'retention_hold',
  clock_timestamp() - interval '1 day', clock_timestamp() - interval '2 days'
);

select is((select submissions_deleted from public.purge_mavis_expired_public_intake(clock_timestamp() - interval '1 day')),
  0::bigint, 'purge respects retention holds');
select ok(exists (select 1 from mavis_intake_private.submissions
  where status = 'retention_hold' and full_name = 'آزمون توقف حذف'),
  'retention-held submission remains stored');

insert into mavis_intake_private.audit_events (event_code, actor_type, created_at)
values ('status_changed', 'system', clock_timestamp() - interval '10 days');

select is((select audit_events_deleted from public.purge_mavis_expired_public_intake(clock_timestamp() - interval '5 days')),
  1::bigint, 'purge removes audit metadata older than the approved cutoff');

select * from finish();
rollback;
