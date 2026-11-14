begin;
select plan(31);

select has_function('public', 'publish_mavis_article', array['uuid','integer'], 'publish RPC exists');
select has_function('public', 'unpublish_mavis_article', array['uuid','integer'], 'unpublish RPC exists');

select ok((select prosecdef from pg_proc where oid='public.publish_mavis_article(uuid,integer)'::regprocedure), 'publish RPC is SECURITY DEFINER');
select ok((select prosecdef from pg_proc where oid='public.unpublish_mavis_article(uuid,integer)'::regprocedure), 'unpublish RPC is SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.publish_mavis_article(uuid,integer)'::regprocedure), 'publish RPC has empty search_path');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.unpublish_mavis_article(uuid,integer)'::regprocedure), 'unpublish RPC has empty search_path');

select ok(has_function_privilege('authenticated','public.publish_mavis_article(uuid,integer)','EXECUTE'), 'authenticated can invoke guarded publish');
select ok(has_function_privilege('authenticated','public.unpublish_mavis_article(uuid,integer)','EXECUTE'), 'authenticated can invoke guarded unpublish');
select ok(not has_function_privilege('anon','public.publish_mavis_article(uuid,integer)','EXECUTE'), 'anon cannot publish');
select ok(not has_function_privilege('anon','public.unpublish_mavis_article(uuid,integer)','EXECUTE'), 'anon cannot unpublish');
select ok(not has_function_privilege('service_role','public.publish_mavis_article(uuid,integer)','EXECUTE'), 'service role cannot publish');
select ok(not has_function_privilege('service_role','public.unpublish_mavis_article(uuid,integer)','EXECUTE'), 'service role cannot unpublish');

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('00000000-0000-4000-8000-000000000071','authenticated','authenticated','publication-editor@example.invalid','',now(),now(),now()),
('00000000-0000-4000-8000-000000000072','authenticated','authenticated','publication-admin@example.invalid','',now(),now(),now());
insert into public.profiles (id,role)
values
('00000000-0000-4000-8000-000000000071','editor'),
('00000000-0000-4000-8000-000000000072','admin');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000071';
select throws_ok(
 $$select public.publish_mavis_article('00000000-0000-4000-8000-000000000099',1)$$,
 '42501','Administrator access required','non-admin cannot publish an article'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000072';

create temporary table publication_fixture (article_id uuid primary key);
insert into publication_fixture
select public.save_mavis_article_draft(
 '{"slug":"explicit-publication-workflow","title":"Explicit publication workflow test","author_name":"Editorial Team","excerpt":"This is a valid excerpt for explicit publication workflow testing.","category":"حقوق مدنی","tags":[],"content":{"intro":"A complete enough introduction for the publication workflow test.","sections":[{"heading":"Publication test section","body":"This is a sufficiently long body for the publication workflow test."}]},"content_schema_version":1}'::jsonb
);

select is(
 (public.submit_mavis_article_for_review((select article_id from publication_fixture),1)->>'status'),
 'in_review','current immutable version can be submitted'
);
select is(
 (public.decide_mavis_article_review((select article_id from publication_fixture),1,'approved','تأیید برای آزمون انتشار')->>'status'),
 'approved','review approval does not publish automatically'
);
select is(
 (select status from public.mavis_articles where id=(select article_id from publication_fixture)),
 'approved','article remains approved before explicit publication'
);

select set_config('test.publication_article_id', (select article_id::text from publication_fixture), true);
reset role;
set local role anon;
select set_config(
 'test.anon_visibility',
 (select count(*)::text from public.mavis_articles where id=current_setting('test.publication_article_id')::uuid),
 true
);
select is(current_setting('test.anon_visibility'), '0', 'anonymous readers cannot access an approved but unpublished article');
reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000072';

select throws_ok(
  $$select public.publish_mavis_article((select article_id from publication_fixture),2)$$,
 '40001','Article version changed; refresh before publication','stale version cannot be published'
);
select is(
 (public.publish_mavis_article((select article_id from publication_fixture),1)->>'status'),
 'published','administrator explicitly publishes the exact approved version'
);
select is(
 (select status from public.mavis_articles where id=(select article_id from publication_fixture)),
 'published','published article status is updated'
);
select is(
 (select (published_at is not null) from public.mavis_articles where id=(select article_id from publication_fixture)),
 true,'published article receives a publication timestamp'
);
select is(
 (select count(*)::integer from public.mavis_article_audit_events where article_id=(select article_id from publication_fixture) and event_type='article_published' and article_version=1),
 1,'publication creates an audit event for the exact version'
);
reset role;
set local role anon;
select set_config(
 'test.anon_visibility',
 (select count(*)::text from public.mavis_articles where id=current_setting('test.publication_article_id')::uuid),
 true
);
select is(current_setting('test.anon_visibility'), '1', 'anonymous readers can access an explicitly published article');
reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000072';

select throws_ok(
  $$select public.publish_mavis_article((select article_id from publication_fixture),1)$$,
 '55000','Article is not approved for publication','already published article cannot be published twice'
);

select throws_ok(
 $$select public.unpublish_mavis_article((select article_id from publication_fixture),2)$$,
 '40001','Article version changed; refresh before unpublishing','stale version cannot be unpublished'
);
select is(
 (public.unpublish_mavis_article((select article_id from publication_fixture),1)->>'status'),
 'approved','administrator can explicitly unpublish the article'
);
select is(
 (select status from public.mavis_articles where id=(select article_id from publication_fixture)),
 'approved','unpublishing returns article to approved status'
);
select is(
 (select (published_at is null) from public.mavis_articles where id=(select article_id from publication_fixture)),
 true,'unpublishing clears the public publication timestamp'
);
select is(
 (select count(*)::integer from public.mavis_article_audit_events where article_id=(select article_id from publication_fixture) and event_type='article_unpublished' and article_version=1),
 1,'unpublishing creates an audit event for the exact version'
);
reset role;
set local role anon;
select set_config(
 'test.anon_visibility',
 (select count(*)::text from public.mavis_articles where id=current_setting('test.publication_article_id')::uuid),
 true
);
select is(current_setting('test.anon_visibility'), '0', 'anonymous readers lose access after unpublishing');
reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000072';

select throws_ok(
  $$select public.unpublish_mavis_article((select article_id from publication_fixture),1)$$,
 '55000','Article is not currently published','already unpublished article cannot be unpublished twice'
);

select * from finish();
rollback;
