begin;
select plan(40);
select has_function('public','publish_mavis_article',array['uuid','integer'],'publish RPC exists');
select has_function('public','archive_mavis_article',array['uuid','integer','text'],'archive RPC exists');
select has_function('public','restore_mavis_article',array['uuid','integer'],'restore RPC exists');
select has_function('public','rollback_mavis_article_version',array['uuid','integer','integer','text'],'rollback RPC exists');
select has_function('public','get_public_mavis_article_sources',array['uuid'],'public source metadata RPC exists');
select ok((select prosecdef from pg_proc where oid='public.publish_mavis_article(uuid,integer)'::regprocedure),'publish RPC is SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.publish_mavis_article(uuid,integer)'::regprocedure),'publish RPC has empty search_path');
select ok(has_function_privilege('authenticated','public.publish_mavis_article(uuid,integer)','EXECUTE'),'authenticated can invoke guarded publish');
select ok(not has_function_privilege('anon','public.publish_mavis_article(uuid,integer)','EXECUTE'),'anon cannot publish');
select ok(not has_function_privilege('service_role','public.publish_mavis_article(uuid,integer)','EXECUTE'),'service role cannot publish');
select ok(has_function_privilege('anon','public.get_public_mavis_article_sources(uuid)','EXECUTE'),'anon can read safe citations for published articles');
select ok(not has_function_privilege('service_role','public.get_public_mavis_article_sources(uuid)','EXECUTE'),'service role has no public citation RPC grant');

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
 '42501','Administrator access required','non-admin editor cannot publish'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000072';
select set_config('test.article_id', public.save_mavis_article_draft(
 '{"slug":"publication-lifecycle-test","title":"Publication lifecycle version one","author_name":"Editorial Team","excerpt":"A valid excerpt for the publication lifecycle test.","category":"حقوق مدنی","tags":["نسخه اول"],"content":{"intro":"Version one introduction for the publication workflow.","sections":[{"heading":"Version one section","body":"The first immutable article version contains this longer body for testing."}]},"content_schema_version":1}'::jsonb
)::text, true);
select public.save_mavis_article_draft(
 '{"slug":"publication-lifecycle-test","title":"Publication lifecycle version two","author_name":"Editorial Team","excerpt":"A revised excerpt for the publication lifecycle test.","category":"حقوق مدنی","tags":["نسخه دوم"],"content":{"intro":"Version two introduction for the publication workflow.","sections":[{"heading":"Version two section","body":"The second immutable article version contains this revised body for testing."}]},"content_schema_version":1}'::jsonb,
 current_setting('test.article_id')::uuid,1,'Version two update'
);
select throws_ok(
 $$select public.publish_mavis_article(current_setting('test.article_id')::uuid,1)$$,
 '40001','Article version changed; refresh before publication','stale version cannot be published'
);
select throws_ok(
 $$select public.publish_mavis_article(current_setting('test.article_id')::uuid,2)$$,
 '55000','Article is not approved for publication','draft cannot be published without approval'
);
select is((public.submit_mavis_article_for_review(current_setting('test.article_id')::uuid,2)->>'status'),'in_review','version two enters review');
select is((public.decide_mavis_article_review(current_setting('test.article_id')::uuid,2,'approved',null)->>'status'),'approved','exact version two is approved');
select is((public.publish_mavis_article(current_setting('test.article_id')::uuid,2)->>'status'),'published','approved version two can be published');
select is((select status from public.mavis_articles where id=current_setting('test.article_id')::uuid),'published','published status is persisted');
select ok((select published_at is not null from public.mavis_articles where id=current_setting('test.article_id')::uuid),'publication timestamp is recorded');
reset role;
with new_source as (
  insert into public.mavis_sources (canonical_url, source_type, title, rights_status)
  values ('https://example.org/public-citation-test', 'official_law', 'Public citation test source', 'unknown')
  returning id
)
select set_config('test.source_id', id::text, true) from new_source;

insert into public.mavis_article_sources (article_id, source_id, relation_type, citation_label)
values
  (current_setting('test.article_id')::uuid, current_setting('test.source_id')::uuid, 'primary_authority', 'منبع رسمی آزمایشی'),
  (current_setting('test.article_id')::uuid, current_setting('test.source_id')::uuid, 'image', 'تصویر دارای مجوز نامشخص');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000072';

select is(
  jsonb_array_length(public.get_public_mavis_article_sources(current_setting('test.article_id')::uuid)),
  1,
  'public citation RPC excludes image and dataset relations'
);

reset role;
set local role anon;
select is((select count(*)::integer from public.mavis_articles where id=current_setting('test.article_id')::uuid),1,'anonymous readers can see a published article');

reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000072';
select is((public.archive_mavis_article(current_setting('test.article_id')::uuid,2,'Archive test')->>'status'),'archived','published article can be archived');
select is((select status from public.mavis_articles where id=current_setting('test.article_id')::uuid),'archived','archive status is persisted');

reset role;
set local role anon;
select is((select count(*)::integer from public.mavis_articles where id=current_setting('test.article_id')::uuid),0,'anonymous readers cannot see an archived article');

reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000072';
select is((public.restore_mavis_article(current_setting('test.article_id')::uuid,2)->>'status'),'approved','restoring a previously published article returns it to approved, not published');
select is((select status from public.mavis_articles where id=current_setting('test.article_id')::uuid),'approved','restored article requires explicit republication');
select ok((select published_at is null from public.mavis_articles where id=current_setting('test.article_id')::uuid),'restore clears the previous publication timestamp');
select is((public.publish_mavis_article(current_setting('test.article_id')::uuid,2)->>'status'),'published','restored approved version can be explicitly republished');

select is((public.rollback_mavis_article_version(current_setting('test.article_id')::uuid,2,1,'Rollback verification')->>'status'),'draft','rollback creates a new draft rather than republishing the old version');
select is((select current_version from public.mavis_articles where id=current_setting('test.article_id')::uuid),3,'rollback increments the version number');
select is((select title from public.mavis_articles where id=current_setting('test.article_id')::uuid),'Publication lifecycle version one','rollback restores the selected immutable content');
select ok((select published_at is null from public.mavis_articles where id=current_setting('test.article_id')::uuid),'rollback unpublishes the current public article');
select is((select count(*)::integer from public.mavis_article_audit_events where article_id=current_setting('test.article_id')::uuid and event_type='article_unpublished' and article_version=3),1,'rollback records an unpublish audit event for the new version');

reset role;
set local role anon;
select is((select count(*)::integer from public.mavis_articles where id=current_setting('test.article_id')::uuid),0,'rolled-back article is no longer publicly visible');

reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000072';
select throws_ok(
 $$select public.rollback_mavis_article_version(current_setting('test.article_id')::uuid,3,3,null)$$,
 '22023','Invalid rollback version','rollback rejects the current version as its own target'
);
select throws_ok(
 $$select public.archive_mavis_article(current_setting('test.article_id')::uuid,2,null)$$,
 '40001','Article version changed; refresh before archiving','archive rejects a stale article version'
);
select is((public.archive_mavis_article(current_setting('test.article_id')::uuid,3,'Archive draft test')->>'status'),'archived','draft can be archived');
select is((public.restore_mavis_article(current_setting('test.article_id')::uuid,3)->>'status'),'draft','restoring an archived draft returns it to draft');
select is((select count(*)::integer from public.mavis_article_audit_events where article_id=current_setting('test.article_id')::uuid and event_type='article_restored'),2,'each restore operation is audited');

select * from finish();
rollback;
