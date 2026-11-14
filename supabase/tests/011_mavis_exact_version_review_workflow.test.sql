begin;
select plan(24);

select has_function('public', 'submit_mavis_article_for_review', array['uuid','integer'], 'review submission RPC exists');
select has_function('public', 'decide_mavis_article_review', array['uuid','integer','text','text'], 'review decision RPC exists');

select ok((select prosecdef from pg_proc where oid='public.submit_mavis_article_for_review(uuid,integer)'::regprocedure), 'submission RPC is SECURITY DEFINER');
select ok((select prosecdef from pg_proc where oid='public.decide_mavis_article_review(uuid,integer,text,text)'::regprocedure), 'decision RPC is SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.submit_mavis_article_for_review(uuid,integer)'::regprocedure), 'submission RPC has empty search_path');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.decide_mavis_article_review(uuid,integer,text,text)'::regprocedure), 'decision RPC has empty search_path');

select ok(has_function_privilege('authenticated','public.submit_mavis_article_for_review(uuid,integer)','EXECUTE'), 'authenticated can submit drafts');
select ok(has_function_privilege('authenticated','public.decide_mavis_article_review(uuid,integer,text,text)','EXECUTE'), 'authenticated can decide reviews');
select ok(not has_function_privilege('anon','public.submit_mavis_article_for_review(uuid,integer)','EXECUTE'), 'anon cannot submit drafts');
select ok(not has_function_privilege('anon','public.decide_mavis_article_review(uuid,integer,text,text)','EXECUTE'), 'anon cannot decide reviews');
select ok(not has_function_privilege('service_role','public.submit_mavis_article_for_review(uuid,integer)','EXECUTE'), 'service role cannot submit drafts');
select ok(not has_function_privilege('service_role','public.decide_mavis_article_review(uuid,integer,text,text)','EXECUTE'), 'service role cannot decide reviews');

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('00000000-0000-4000-8000-000000000061','authenticated','authenticated','review-editor@example.invalid','',now(),now(),now()),
('00000000-0000-4000-8000-000000000062','authenticated','authenticated','review-admin@example.invalid','',now(),now(),now());
insert into public.profiles (id,role)
values
('00000000-0000-4000-8000-000000000061','editor'),
('00000000-0000-4000-8000-000000000062','admin');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000061';
select throws_ok(
 $$select public.submit_mavis_article_for_review('00000000-0000-4000-8000-000000000099',1)$$,
 '42501','Administrator access required','non-admin cannot submit a draft for review'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000062';

create temporary table review_fixtures (kind text primary key, article_id uuid not null);
insert into review_fixtures
select 'approval', public.save_mavis_article_draft(
 '{"slug":"review-exact-version-approval","title":"Exact version review approval test","author_name":"Editorial Team","excerpt":"This is a valid excerpt for exact-version approval testing.","category":"حقوق مدنی","tags":[],"content":{"intro":"A complete enough introduction for the database workflow test.","sections":[{"heading":"Review test section","body":"This is a sufficiently long body for the exact-version review test."}]},"content_schema_version":1}'::jsonb
);
insert into review_fixtures
select 'changes', public.save_mavis_article_draft(
 '{"slug":"review-exact-version-changes","title":"Exact version review changes test","author_name":"Editorial Team","excerpt":"This is a valid excerpt for changes requested testing.","category":"حقوق مدنی","tags":[],"content":{"intro":"A complete enough introduction for the database workflow test.","sections":[{"heading":"Review test section","body":"This is a sufficiently long body for the exact-version review test."}]},"content_schema_version":1}'::jsonb
);

select throws_ok(
 $$select public.submit_mavis_article_for_review((select article_id from review_fixtures where kind='approval'),2)$$,
 '40001','Article version changed; refresh before review','stale version cannot be submitted'
);

select is(
 (public.submit_mavis_article_for_review((select article_id from review_fixtures where kind='approval'),1)->>'status'),
 'in_review','current immutable version can be submitted'
);
select is(
 (select status from public.mavis_articles where id=(select article_id from review_fixtures where kind='approval')),
 'in_review','submission changes status to in_review'
);
select is(
 (select count(*)::integer from public.mavis_article_audit_events where article_id=(select article_id from review_fixtures where kind='approval') and event_type='review_submitted' and article_version=1),
 1,'submission writes an audit event bound to version one'
);

select throws_ok(
 $$select public.decide_mavis_article_review((select article_id from review_fixtures where kind='approval'),2,'approved',null)$$,
 '40001','Review version is stale; submit the current version again','review decision rejects a stale version'
);
select is(
 (public.decide_mavis_article_review((select article_id from review_fixtures where kind='approval'),1,'approved','بررسی نسخه اول')->>'status'),
 'approved','approval records the exact current version'
);
select is(
 (select status from public.mavis_articles where id=(select article_id from review_fixtures where kind='approval')),
 'approved','approved article is not automatically published'
);
select is(
 (select article_version from public.mavis_article_approvals where article_id=(select article_id from review_fixtures where kind='approval') order by created_at desc limit 1),
 1,'approval record stores the exact immutable version'
);
select is(
 (select count(*)::integer from public.mavis_article_audit_events where article_id=(select article_id from review_fixtures where kind='approval') and event_type='approval_recorded' and article_version=1 and next_status='approved'),
 1,'approval writes a matching audit event'
);
select throws_ok(
 $$select public.decide_mavis_article_review((select article_id from review_fixtures where kind='approval'),1,'approved',null)$$,
 '55000','Article is not awaiting review','a completed review cannot be decided twice'
);

select is(
 (public.submit_mavis_article_for_review((select article_id from review_fixtures where kind='changes'),1)->>'status'),
 'in_review','second draft can enter review'
);
select is(
 (public.decide_mavis_article_review((select article_id from review_fixtures where kind='changes'),1,'changes_requested','ارجاع برای اصلاح')->>'status'),
 'changes_requested','reviewer can request changes'
);
select is(
 (select status from public.mavis_articles where id=(select article_id from review_fixtures where kind='changes')),
 'changes_requested','changes requested returns article to editable state'
);
select is(
 (select count(*)::integer from public.mavis_article_approvals where article_id=(select article_id from review_fixtures where kind='changes') and article_version=1 and decision='changes_requested'),
 1,'changes decision remains tied to version one'
);
select throws_ok(
 $$select public.decide_mavis_article_review((select article_id from review_fixtures where kind='changes'),1,'not_a_decision',null)$$,
 '22023','Unsupported review decision','unsupported review decisions are rejected'
);

select * from finish();
rollback;
