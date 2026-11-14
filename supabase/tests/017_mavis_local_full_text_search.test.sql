begin;
select plan(20);

select has_column('public','mavis_articles','search_vector','article content has a local full-text search vector');
select has_column('public','mavis_sources','search_vector','source registry has a local search vector');
select has_column('public','mavis_source_candidates','search_vector','candidate queue has a local search vector');
select ok(to_regclass('public.mavis_articles_search_vector_gin_idx') is not null,'article full-text search has a GIN index');
select ok(to_regclass('public.mavis_sources_search_vector_gin_idx') is not null,'source full-text search has a GIN index');
select ok(to_regclass('public.mavis_source_candidates_search_vector_gin_idx') is not null,'candidate full-text search has a GIN index');
select has_function('public','search_mavis_local_archive',array['text','integer'],'local archive search RPC exists');
select ok((select prosecdef from pg_proc where oid='public.search_mavis_local_archive(text,integer)'::regprocedure),'local search RPC is SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.search_mavis_local_archive(text,integer)'::regprocedure),'local search RPC has empty search_path');
select ok(has_function_privilege('authenticated','public.search_mavis_local_archive(text,integer)','EXECUTE'),'authenticated can call the guarded local search RPC');
select ok(not has_function_privilege('anon','public.search_mavis_local_archive(text,integer)','EXECUTE'),'anonymous users cannot search private editorial records');
select ok(not has_function_privilege('service_role','public.search_mavis_local_archive(text,integer)','EXECUTE'),'service role has no local search RPC grant');

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('00000000-0000-4000-8000-000000000091','authenticated','authenticated','offline-search-admin@example.invalid','',now(),now(),now()),
('00000000-0000-4000-8000-000000000092','authenticated','authenticated','offline-search-editor@example.invalid','',now(),now(),now());
insert into public.profiles (id,role)
values
('00000000-0000-4000-8000-000000000091','admin'),
('00000000-0000-4000-8000-000000000092','editor');

insert into public.mavis_articles (
  id,slug,title,excerpt,category,content,status,origin_type,current_version
) values (
  '00000000-0000-4000-8000-000000000093',
  'offline-search-test',
  'Offline Remedy Doctrine Research',
  'A locally stored article for offline search verification.',
  'Research',
  '{"intro":"Contract remedy principles","sections":[{"heading":"Specific performance","body":"Damages and equitable relief"}]}'::jsonb,
  'draft','admin_created',1
);

insert into public.mavis_sources (id,canonical_url,source_type,title,author_name,publisher,rights_status)
values (
  '00000000-0000-4000-8000-000000000094',
  'https://example.invalid/offline-remedy-source',
  'academic',
  'Offline Remedy Source Registry',
  'Research Author',
  'Local Academic Press',
  'unknown'
);

insert into public.mavis_source_candidates (
  id,provider,provider_record_id,title,authors,doi,canonical_url
) values (
  '00000000-0000-4000-8000-000000000095',
  'crossref','offline-remedy-candidate',
  'Offline Remedy Candidate Record',
  array['Research Author'],
  '10.5555/offline-remedy',
  'https://doi.org/10.5555/offline-remedy'
);

select ok((select search_vector @@ plainto_tsquery('simple','specific performance') from public.mavis_articles where id='00000000-0000-4000-8000-000000000093'),'article insert trigger indexes structured article content');
select ok((select search_vector @@ plainto_tsquery('simple','offline remedy') from public.mavis_sources where id='00000000-0000-4000-8000-000000000094'),'source insert trigger indexes source metadata');
select ok((select search_vector @@ plainto_tsquery('simple','offline remedy') from public.mavis_source_candidates where id='00000000-0000-4000-8000-000000000095'),'candidate insert trigger indexes candidate metadata');

update public.mavis_articles
set content='{"intro":"Revised archive trigger verification"}'::jsonb
where id='00000000-0000-4000-8000-000000000093';
select ok((select search_vector @@ plainto_tsquery('simple','revised archive') from public.mavis_articles where id='00000000-0000-4000-8000-000000000093'),'article update trigger refreshes the local search vector');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000091';

select is(
  (select count(*)::integer from public.search_mavis_local_archive('specific performance',30) where record_type='article'),
  1,
  'admin search finds stored article body text without external requests'
);
select is(
  (select count(*)::integer from public.search_mavis_local_archive('offline remedy',30) where record_type='candidate'),
  1,
  'admin search finds locally persisted provider candidates'
);
select is(
  (select count(*)::integer from public.search_mavis_local_archive('offline remedy',30) where record_type='source'),
  1,
  'admin search finds the local source registry'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000092';
select throws_ok(
  $$select * from public.search_mavis_local_archive('offline remedy',30)$$,
  '42501','Administrator access required',
  'non-admin editor cannot search private editorial records'
);

select * from finish();
rollback;
