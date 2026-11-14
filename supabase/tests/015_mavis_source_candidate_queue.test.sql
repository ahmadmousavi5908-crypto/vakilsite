begin;
select plan(42);
select has_table('public','mavis_source_candidates','candidate queue table exists');
select has_table('public','mavis_source_candidate_events','candidate event history exists');
select ok((select relrowsecurity from pg_class where oid='public.mavis_source_candidates'::regclass),'candidate queue has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.mavis_source_candidate_events'::regclass),'candidate event history has RLS enabled');
select ok(not has_table_privilege('anon','public.mavis_source_candidates','SELECT'),'anonymous role cannot read candidate queue');
select ok(has_table_privilege('authenticated','public.mavis_source_candidates','SELECT'),'authenticated role has table access subject to admin RLS');
select has_function('public','store_mavis_source_candidates',array['jsonb'],'candidate storage RPC exists');
select has_function('public','import_mavis_source_candidate_from_queue',array['uuid'],'queue import RPC exists');
select has_function('public','ignore_mavis_source_candidate',array['uuid','text'],'candidate ignore RPC exists');
select ok((select prosecdef from pg_proc where oid='public.store_mavis_source_candidates(jsonb)'::regprocedure),'candidate storage RPC is SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.store_mavis_source_candidates(jsonb)'::regprocedure),'candidate storage RPC has empty search_path');
select ok(has_function_privilege('authenticated','public.store_mavis_source_candidates(jsonb)','EXECUTE'),'authenticated can invoke guarded candidate storage');
select ok(not has_function_privilege('anon','public.store_mavis_source_candidates(jsonb)','EXECUTE'),'anon cannot store candidates');
select ok(not has_function_privilege('service_role','public.store_mavis_source_candidates(jsonb)','EXECUTE'),'service role cannot store candidates');
select ok(not has_function_privilege('anon','public.import_mavis_source_candidate_from_queue(uuid)','EXECUTE'),'anon cannot import candidates');

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('00000000-0000-4000-8000-000000000081','authenticated','authenticated','candidate-editor@example.invalid','',now(),now(),now()),
('00000000-0000-4000-8000-000000000082','authenticated','authenticated','candidate-admin@example.invalid','',now(),now(),now());
insert into public.profiles (id,role)
values
('00000000-0000-4000-8000-000000000081','editor'),
('00000000-0000-4000-8000-000000000082','admin');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000081';
select throws_ok(
 $$select public.store_mavis_source_candidates('[{"provider":"crossref","providerRecordId":"10.5555/editor","title":"Editor cannot store this source","sourceUrl":"https://example.org/editor","sourceType":"academic"}]'::jsonb)$$,
 '42501','Administrator access required','non-admin editor cannot persist candidates'
);
select is((select count(*)::integer from public.mavis_source_candidates),0,'non-admin editor cannot read candidate rows');

reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000082';

select set_config('test.candidate_result', public.store_mavis_source_candidates(
 '[
  {"provider":"crossref","providerRecordId":"10.5555/queue-test","doi":"10.5555/queue-test","title":"Persistent legal research candidate","authors":["Research Author"],"publisher":"Academic Publisher","publicationDate":"2024","sourceUrl":"https://doi.org/10.5555/queue-test","sourceType":"academic","rightsStatus":"licensed"},
  {"provider":"semantic_scholar","providerRecordId":"paper-queue-test","doi":"10.5555/queue-test","title":"Persistent legal research candidate duplicate","authors":["Research Author"],"venue":"Research Journal","publicationDate":"2024-05","sourceUrl":"https://example.org/paper-queue-test","sourceType":"academic","rightsStatus":"licensed"}
 ]'::jsonb
 )::text,true);

select set_config('test.candidate_id', (current_setting('test.candidate_result')::jsonb->'candidates'->0->>'id'),true);
select is(jsonb_array_length(current_setting('test.candidate_result')::jsonb->'candidates'),2,'storage returns both provider results');
select is(
 (current_setting('test.candidate_result')::jsonb->'candidates'->0->>'id'),
 (current_setting('test.candidate_result')::jsonb->'candidates'->1->>'id'),
 'same DOI from different providers resolves to one candidate'
);
select is((select state from public.mavis_source_candidates where id=current_setting('test.candidate_id')::uuid),'discovered','new candidate starts in discovered state');
select is((select rights_status from public.mavis_source_candidates where id=current_setting('test.candidate_id')::uuid),'unknown','client rights claims cannot override unknown rights');
select is((select publication_date_precision from public.mavis_source_candidates where id=current_setting('test.candidate_id')::uuid),'month','more precise month-level publication date supersedes year-only precision');
select is((select jsonb_array_length(provider_aliases) from public.mavis_source_candidates where id=current_setting('test.candidate_id')::uuid),2,'cross-provider aliases are retained');
select is((select count(*)::integer from public.mavis_source_candidate_events where candidate_id=current_setting('test.candidate_id')::uuid),2,'discovery and refresh events are recorded');

select set_config('test.refresh_result', public.store_mavis_source_candidates(
 '[{"provider":"crossref","providerRecordId":"10.5555/queue-test","doi":"10.5555/queue-test","title":"Persistent legal research candidate refreshed","sourceUrl":"https://doi.org/10.5555/queue-test","sourceType":"academic"}]'::jsonb
 )::text,true);
select is((current_setting('test.refresh_result')::jsonb->'candidates'->0->>'created'),'false','repeated discovery does not create a duplicate candidate');

select set_config('test.import_result', public.import_mavis_source_candidate_from_queue(current_setting('test.candidate_id')::uuid)::text,true);
select is((current_setting('test.import_result')::jsonb->>'status'),'imported','stored candidate imports atomically into a draft');
select is((select state from public.mavis_source_candidates where id=current_setting('test.candidate_id')::uuid),'imported','candidate state changes to imported');
select is((select status from public.mavis_articles where id=(current_setting('test.import_result')::jsonb->>'articleId')::uuid),'draft','queue import always creates a draft');
select is((select origin_type from public.mavis_articles where id=(current_setting('test.import_result')::jsonb->>'articleId')::uuid),'metadata_only','queue import marks article as metadata-only');
select is((select rights_status from public.mavis_sources where id=(current_setting('test.import_result')::jsonb->>'sourceId')::uuid),'unknown','imported source rights remain unknown');
select is((public.import_mavis_source_candidate_from_queue(current_setting('test.candidate_id')::uuid)->>'status'),'existing','repeated queue import returns the existing draft');
select throws_ok(
 $$select public.ignore_mavis_source_candidate(current_setting('test.candidate_id')::uuid,null)$$,
 '55000','Imported candidate cannot be ignored','imported candidate cannot be ignored'
);

select set_config('test.ignored_candidate_id', (
 public.store_mavis_source_candidates(
 '[{"provider":"openalex","providerRecordId":"W999999","title":"Candidate to ignore safely","authors":[],"publicationDate":"2023-07","sourceUrl":"https://openalex.org/W999999","sourceType":"academic"}]'::jsonb
 )->'candidates'->0->>'id'
),true);
select is((public.ignore_mavis_source_candidate(current_setting('test.ignored_candidate_id')::uuid,'Not relevant')->>'status'),'ignored','administrator can ignore an unimported candidate');
select is((select state from public.mavis_source_candidates where id=current_setting('test.ignored_candidate_id')::uuid),'ignored','ignored state is persisted');
select throws_ok(
 $$select public.import_mavis_source_candidate_from_queue(current_setting('test.ignored_candidate_id')::uuid)$$,
 '55000','Ignored candidate cannot be imported','ignored candidate cannot be imported'
);
select is((select count(*)::integer from public.mavis_source_candidate_events where candidate_id=current_setting('test.ignored_candidate_id')::uuid and event_type='ignored'),1,'ignore action is audited');

select throws_ok(
 $$select public.store_mavis_source_candidates('[{"provider":"untrusted","providerRecordId":"x","title":"Invalid provider candidate","sourceUrl":"https://example.org/source","sourceType":"academic"}]'::jsonb)$$,
 '22023','Unsupported source provider or type','unrecognized providers are rejected'
);
select throws_ok(
 $$select public.store_mavis_source_candidates('[{"provider":"crossref","providerRecordId":"x","title":"Invalid source URL","sourceUrl":"http://example.org/source","sourceType":"academic"}]'::jsonb)$$,
 '22023','Invalid HTTPS source URL','non-HTTPS source URLs are rejected'
);
select throws_ok(
 $$select public.store_mavis_source_candidates('[{"provider":"crossref","providerRecordId":"x","title":"Unexpected field candidate","sourceUrl":"https://example.org/source","sourceType":"academic","fullText":"blocked"}]'::jsonb)$$,
 '22023','Candidate contains unsupported fields','source text fields are rejected'
);
select throws_ok(
 $$select public.store_mavis_source_candidates('[{"provider":"crossref","providerRecordId":"x","title":"Invalid date candidate","sourceUrl":"https://example.org/source","sourceType":"academic","publicationDate":"2024-02-31"}]'::jsonb)$$,
 '22023','Invalid candidate publication date','invalid calendar dates are rejected'
);

reset role;
select ok(not has_table_privilege('anon','public.mavis_source_candidates','SELECT'),'anonymous role has no direct privilege on candidate queue');
select ok(not has_table_privilege('anon','public.mavis_source_candidate_events','SELECT'),'anonymous role has no direct privilege on candidate event history');

select * from finish();
rollback;
