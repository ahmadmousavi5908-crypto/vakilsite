begin;

select plan(53);

select ok((select relrowsecurity from pg_class where oid = 'public.mavis_intake_submissions'::regclass), 'intake submissions have RLS enabled');
select ok(not has_table_privilege('anon', 'public.mavis_intake_submissions', 'SELECT'), 'anon cannot read private intake submissions');
select ok(not has_table_privilege('anon', 'public.mavis_intake_submissions', 'INSERT'), 'anon cannot insert directly into intake submissions');
select ok(not has_table_privilege('anon', 'public.mavis_intake_submissions', 'UPDATE'), 'anon cannot update intake submissions');
select ok(not has_table_privilege('anon', 'public.mavis_intake_submissions', 'DELETE'), 'anon cannot delete intake submissions');
select ok(has_table_privilege('authenticated', 'public.mavis_intake_submissions', 'SELECT'), 'authenticated has the privilege needed for admin reads, subject to RLS');
select ok(has_column_privilege('authenticated', 'public.mavis_intake_submissions', 'status', 'UPDATE'), 'authenticated can update only the status column, subject to RLS');
select ok(not has_table_privilege('authenticated', 'public.mavis_intake_submissions', 'INSERT'), 'authenticated cannot insert intake submissions directly');
select ok(not has_table_privilege('authenticated', 'public.mavis_intake_submissions', 'DELETE'), 'authenticated cannot delete intake submissions directly');

select ok(not has_table_privilege('service_role', 'public.mavis_intake_submissions', 'SELECT'), 'service role cannot directly read private intake rows');
select ok(
  position('is_site_admin' in (select coalesce(qual, '') from pg_policies where schemaname = 'public' and tablename = 'mavis_intake_submissions' and policyname = 'MAVIS admins can read intake submissions')) > 0,
  'intake read policy is restricted to site admins'
);
select ok(
  position('is_site_admin' in (select coalesce(qual, '') from pg_policies where schemaname = 'public' and tablename = 'mavis_intake_submissions' and policyname = 'MAVIS admins can update intake status')) > 0,
  'intake update policy is restricted to site admins'
);
select ok(not has_table_privilege('service_role', 'public.mavis_intake_audit_events', 'SELECT'), 'service role cannot directly read intake audit events');
select ok(
  position('is_site_admin' in (select coalesce(qual, '') from pg_policies where schemaname = 'public' and tablename = 'mavis_intake_audit_events' and policyname = 'MAVIS admins can read intake audit')) > 0,
  'intake audit read policy is restricted to site admins'
);


select ok((select relrowsecurity from pg_class where oid = 'public.mavis_intake_audit_events'::regclass), 'intake audit events have RLS enabled');
select ok(not has_table_privilege('anon', 'public.mavis_intake_audit_events', 'SELECT'), 'anon cannot read intake audit events');
select ok(has_table_privilege('authenticated', 'public.mavis_intake_audit_events', 'SELECT'), 'authenticated can read audit events subject to admin RLS');
select ok(not has_table_privilege('authenticated', 'public.mavis_intake_audit_events', 'INSERT'), 'authenticated cannot forge audit events');

select ok(not has_schema_privilege('anon', 'mavis_intake_private', 'USAGE'), 'anon cannot use the private intake schema');
select ok(not has_schema_privilege('authenticated', 'mavis_intake_private', 'USAGE'), 'authenticated cannot use the private intake schema');
select ok(not has_schema_privilege('service_role', 'mavis_intake_private', 'USAGE'), 'service role does not receive private schema usage');

select ok((select relrowsecurity from pg_class where oid = 'mavis_intake_private.rate_limits'::regclass), 'private rate-limit table has RLS enabled');
select ok(not has_table_privilege('service_role', 'mavis_intake_private.rate_limits', 'SELECT'), 'service role cannot directly read rate-limit identifiers');


select ok(not has_function_privilege('anon', 'mavis_intake_private.submit_public_intake(jsonb,text,text,uuid,text,integer)', 'EXECUTE'), 'anon cannot execute the private intake function');
select ok(not has_function_privilege('authenticated', 'mavis_intake_private.submit_public_intake(jsonb,text,text,uuid,text,integer)', 'EXECUTE'), 'authenticated cannot execute the private intake function');
select ok(not has_function_privilege('service_role', 'mavis_intake_private.submit_public_intake(jsonb,text,text,uuid,text,integer)', 'EXECUTE'), 'service role cannot directly execute the private intake function');
select ok(not has_function_privilege('anon', 'public.submit_mavis_public_intake(jsonb,text,text,uuid,text,integer)', 'EXECUTE'), 'anon cannot bypass the application intake guards through direct RPC');
select ok(not has_function_privilege('authenticated', 'public.submit_mavis_public_intake(jsonb,text,text,uuid,text,integer)', 'EXECUTE'), 'authenticated users cannot bypass the application intake guards through direct RPC');
select ok(has_function_privilege('service_role', 'public.submit_mavis_public_intake(jsonb,text,text,uuid,text,integer)', 'EXECUTE'), 'only the server service role can call the guarded intake RPC');

select ok((select prosecdef from pg_proc where oid = 'public.submit_mavis_public_intake(jsonb,text,text,uuid,text,integer)'::regprocedure), 'public intake wrapper uses SECURITY DEFINER with fixed search_path');
select ok((select coalesce(proconfig @> array['search_path=""'], false) from pg_proc where oid = 'public.submit_mavis_public_intake(jsonb,text,text,uuid,text,integer)'::regprocedure), 'public intake wrapper has an empty search_path');
select ok((select prosecdef from pg_proc where oid = 'mavis_intake_private.submit_public_intake(jsonb,text,text,uuid,text,integer)'::regprocedure), 'private intake function uses SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'], false) from pg_proc where oid = 'mavis_intake_private.submit_public_intake(jsonb,text,text,uuid,text,integer)'::regprocedure), 'private intake function has an empty search_path');
select ok((select prosecdef from pg_proc where oid = 'mavis_intake_private.audit_status_change()'::regprocedure), 'status audit trigger uses SECURITY DEFINER');
select ok(has_function_privilege('service_role', 'public.purge_expired_mavis_intake()', 'EXECUTE'), 'service role can invoke the retention purge wrapper');
select ok(not has_function_privilege('anon', 'public.purge_expired_mavis_intake()', 'EXECUTE'), 'anon cannot invoke the retention purge wrapper');

set local role service_role;

select is(
  (public.submit_mavis_public_intake(
    '{"contact_name":"کاربر آزمایشی","contact_phone":"+989121234567","contact_email":null,"preferred_contact_method":"phone","city":"اهواز","legal_area":"املاک","matter_summary":"درخواست آزمایشی برای بررسی اولیه موضوع حقوقی و هماهنگی تماس.","privacy_notice_accepted":true,"contact_consent":true,"third_party_consent":false,"marketing_consent":false}'::jsonb,
    repeat('a',64),
    repeat('f',64),
    '11111111-1111-4111-8111-111111111111'::uuid,
    'test-v1',
    30
  ) ->> 'ok')::boolean,
  true,
  'server-side service role can submit through the validated RPC'
);

select is(
  (public.submit_mavis_public_intake(
    '{"contact_name":"کاربر آزمایشی","contact_phone":"+989121234567","contact_email":null,"preferred_contact_method":"phone","city":"اهواز","legal_area":"املاک","matter_summary":"درخواست آزمایشی برای بررسی اولیه موضوع حقوقی و هماهنگی تماس.","privacy_notice_accepted":true,"contact_consent":true,"third_party_consent":false,"marketing_consent":false}'::jsonb,
    repeat('a',64),
    repeat('f',64),
    '11111111-1111-4111-8111-111111111111'::uuid,
    'test-v1',
    30
  ) ->> 'duplicate')::boolean,
  true,
  'idempotent retry returns the existing reference without creating a second row'
);

select is(
  public.submit_mavis_public_intake(
    '{"contact_name":"کاربر آزمایشی","contact_phone":"+989121234567","preferred_contact_method":"phone","city":"اهواز","legal_area":"املاک","matter_summary":"درخواست آزمایشی برای بررسی اولیه موضوع حقوقی و هماهنگی تماس.","privacy_notice_accepted":false,"contact_consent":true}'::jsonb,
    repeat('c',64),
    repeat('e',64),
    '22222222-2222-4222-8222-222222222222'::uuid,
    'test-v1',
    30
  ) ->> 'code',
  'consent_required',
  'submission is rejected when required privacy consent is missing'
);

select is(
  (public.submit_mavis_public_intake(
    '{"contact_name":"کاربر دوم","contact_phone":"+989121234568","preferred_contact_method":"phone","city":"اهواز","legal_area":"املاک","matter_summary":"درخواست آزمایشی اول برای کنترل محدودیت نرخ درخواست و بررسی اولیه.","privacy_notice_accepted":true,"contact_consent":true}'::jsonb,
    repeat('b',64),
    repeat('b',64),
    '33333333-3333-4333-8333-333333333331'::uuid,
    'test-v1',
    30
  ) ->> 'ok')::boolean,
  true,
  'first request within a rate window is allowed'
);

select is(
  (public.submit_mavis_public_intake(
    '{"contact_name":"کاربر دوم","contact_phone":"+989121234568","preferred_contact_method":"phone","city":"اهواز","legal_area":"املاک","matter_summary":"درخواست آزمایشی دوم برای کنترل محدودیت نرخ درخواست و بررسی اولیه.","privacy_notice_accepted":true,"contact_consent":true}'::jsonb,
    repeat('b',64),
    repeat('b',64),
    '33333333-3333-4333-8333-333333333332'::uuid,
    'test-v1',
    30
  ) ->> 'ok')::boolean,
  true,
  'second request within a rate window is allowed'
);

select is(
  (public.submit_mavis_public_intake(
    '{"contact_name":"کاربر دوم","contact_phone":"+989121234568","preferred_contact_method":"phone","city":"اهواز","legal_area":"املاک","matter_summary":"درخواست آزمایشی سوم برای کنترل محدودیت نرخ درخواست و بررسی اولیه.","privacy_notice_accepted":true,"contact_consent":true}'::jsonb,
    repeat('b',64),
    repeat('b',64),
    '33333333-3333-4333-8333-333333333333'::uuid,
    'test-v1',
    30
  ) ->> 'ok')::boolean,
  true,
  'third request within a rate window is allowed'
);

select is(
  public.submit_mavis_public_intake(
    '{"contact_name":"کاربر دوم","contact_phone":"+989121234568","preferred_contact_method":"phone","city":"اهواز","legal_area":"املاک","matter_summary":"درخواست آزمایشی چهارم برای کنترل محدودیت نرخ درخواست و بررسی اولیه.","privacy_notice_accepted":true,"contact_consent":true}'::jsonb,
    repeat('b',64),
    repeat('b',64),
    '33333333-3333-4333-8333-333333333334'::uuid,
    'test-v1',
    30
  ) ->> 'code',
  'rate_limited',
  'fourth request within a rate window is rate limited'
);


select is(
  (
    select count(*)
    from generate_series(1,11) as attempt(number)
    where (
      public.submit_mavis_public_intake(
        '{"contact_name":"کاربر سوم","contact_phone":"+989121234569","preferred_contact_method":"phone","city":"اهواز","legal_area":"املاک","matter_summary":"درخواست آزمایشی برای آزمون محدودیت مستقل نشانی شبکه.","privacy_notice_accepted":true,"contact_consent":true}'::jsonb,
        repeat('d',64),
        repeat(pg_catalog.md5(attempt.number::text),2),
        pg_catalog.gen_random_uuid(),
        'test-v1',
        30
      ) ->> 'ok'
    )::boolean
  ),
  10::bigint,
  'IP-wide rate limit allows ten requests and blocks the eleventh even when contact identifiers rotate'
);

reset role;


update public.mavis_intake_submissions
   set status = 'reviewing'
 where idempotency_key = '11111111-1111-4111-8111-111111111111'::uuid;

select ok(
  exists (
    select 1 from public.mavis_intake_audit_events
     where submission_id = (select id from public.mavis_intake_submissions where idempotency_key = '11111111-1111-4111-8111-111111111111'::uuid)
       and old_status = 'new'
       and new_status = 'reviewing'
  ),
  'status changes create an immutable audit event'
);
select ok(
  (select reviewed_at is not null from public.mavis_intake_submissions where idempotency_key = '11111111-1111-4111-8111-111111111111'::uuid),
  'status changes stamp the review timestamp'
);

select is(
  (select third_party_consent from public.mavis_intake_submissions where idempotency_key = '11111111-1111-4111-8111-111111111111'::uuid),
  false,
  'third-party consent remains false unless separately selected'
);
select is(
  (select marketing_consent from public.mavis_intake_submissions where idempotency_key = '11111111-1111-4111-8111-111111111111'::uuid),
  false,
  'marketing consent remains false unless separately selected'
);
select ok(
  (select retention_due_at > created_at from public.mavis_intake_submissions where idempotency_key = '11111111-1111-4111-8111-111111111111'::uuid),
  'each intake row receives a configured retention deadline'
);
select ok(
  exists (select 1 from cron.job where jobname = 'mavis-intake-retention-purge'),
  'daily retention cleanup job is scheduled'
);

insert into mavis_intake_private.rate_limits (rate_type, rate_key_hmac, window_started_at, request_count)
values ('ip', repeat('9',64), now() - interval '2 days', 1);

insert into public.mavis_intake_submissions (
  idempotency_key, contact_name, contact_phone, preferred_contact_method,
  city, legal_area, matter_summary, privacy_notice_version,
  privacy_notice_accepted, contact_consent, retention_due_at
) values (
  '44444444-4444-4444-8444-444444444444'::uuid,
  'کاربر منقضی',
  '+989121234570',
  'phone',
  'اهواز',
  'املاک',
  'درخواست آزمایشی منقضی برای آزمون حذف خودکار اطلاعات شخصی.',
  'test-v1',
  true,
  true,
  now() - interval '1 day'
);

set local role service_role;
select ok(public.purge_expired_mavis_intake() >= 1, 'retention function deletes expired intake submissions');
reset role;

select ok(
  not exists (select 1 from public.mavis_intake_submissions where idempotency_key = '44444444-4444-4444-8444-444444444444'::uuid),
  'expired personal intake data is removed'
);
select ok(
  not exists (select 1 from mavis_intake_private.rate_limits where rate_key_hmac = repeat('9',64)),
  'expired HMAC rate-limit identifiers are removed'
);


select * from finish();
rollback;
