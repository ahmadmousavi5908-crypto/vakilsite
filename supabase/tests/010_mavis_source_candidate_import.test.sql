begin;

select plan(20);

select has_function('public', 'import_mavis_source_candidate', array['jsonb'], 'source candidate import function exists');
select ok(
  (select prosecdef from pg_proc where oid = 'public.import_mavis_source_candidate(jsonb)'::regprocedure),
  'source import function is SECURITY DEFINER'
);
select ok(
  (select coalesce(proconfig @> array['search_path=""'], false)
   from pg_proc where oid = 'public.import_mavis_source_candidate(jsonb)'::regprocedure),
  'source import function uses an empty search_path'
);
select ok(
  has_function_privilege('authenticated', 'public.import_mavis_source_candidate(jsonb)', 'EXECUTE'),
  'authenticated role can invoke the guarded source import'
);
select ok(
  not has_function_privilege('anon', 'public.import_mavis_source_candidate(jsonb)', 'EXECUTE'),
  'anonymous role cannot invoke source import'
);
select ok(
  not has_function_privilege('service_role', 'public.import_mavis_source_candidate(jsonb)', 'EXECUTE'),
  'service role cannot invoke source import'
);
select ok(
  not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.import_mavis_source_candidate(jsonb)'::regprocedure
      and acl.grantee = 0::oid
      and acl.privilege_type = 'EXECUTE'
  ),
  'PUBLIC has no direct EXECUTE grant on source import'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000051', 'authenticated', 'authenticated', 'cms-import-editor@example.invalid', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000052', 'authenticated', 'authenticated', 'cms-import-admin@example.invalid', '', now(), now(), now());

insert into public.profiles (id, role)
values
  ('00000000-0000-4000-8000-000000000051', 'editor'),
  ('00000000-0000-4000-8000-000000000052', 'admin');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000051';

select throws_ok(
  $$select public.import_mavis_source_candidate('{}'::jsonb)$$,
  '42501',
  'Administrator access required',
  'non-admin editor cannot import a source'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000052';

select is(
  (public.import_mavis_source_candidate(
    '{"provider":"crossref","providerRecordId":"10.5555/import-test","doi":"10.5555/import-test","title":"A metadata-only legal research source","authors":["Research Author"],"publisher":"Academic Publisher","publicationDate":"2024-05-17","sourceUrl":"https://doi.org/10.5555/import-test","sourceType":"academic","rightsStatus":"licensed"}'::jsonb
  )->>'created')::boolean,
  true,
  'administrator imports a candidate into a new draft'
);

select is(
  (select status from public.mavis_articles where origin_type = 'metadata_only' and title = 'A metadata-only legal research source'),
  'draft',
  'imported article is always a draft'
);

select is(
  (select origin_type from public.mavis_articles where title = 'A metadata-only legal research source'),
  'metadata_only',
  'imported article is explicitly marked metadata-only'
);

select is(
  (select rights_status from public.mavis_sources where canonical_url = 'https://doi.org/10.5555/import-test'),
  'unknown',
  'client-supplied rights claims cannot override unknown source rights'
);

select is(
  (select count(*)::integer
   from public.mavis_article_sources link
   join public.mavis_articles article on article.id = link.article_id
   where article.title = 'A metadata-only legal research source'
     and link.relation_type = 'research_background'),
  1,
  'imported draft retains its source provenance'
);

select is(
  (select count(*)::integer
   from public.mavis_article_versions version
   join public.mavis_articles article on article.id = version.article_id
   where article.title = 'A metadata-only legal research source'
     and version.version = 1),
  1,
  'import creates immutable version one'
);

select is(
  (select count(*)::integer
   from public.mavis_article_audit_events event
   join public.mavis_articles article on article.id = event.article_id
   where article.title = 'A metadata-only legal research source'
     and event.event_type = 'import_completed'
     and event.next_status = 'draft'
     and event.article_version = 1),
  1,
  'import creates a matching audit event'
);

select is(
  (public.import_mavis_source_candidate(
    '{"provider":"crossref","providerRecordId":"10.5555/import-test","doi":"10.5555/import-test","title":"A metadata-only legal research source","authors":["Research Author"],"publisher":"Academic Publisher","publicationDate":"2024-05-17","sourceUrl":"https://doi.org/10.5555/import-test","sourceType":"academic","rightsStatus":"licensed"}'::jsonb
  )->>'created')::boolean,
  false,
  'repeated import returns the existing draft instead of creating a duplicate'
);

select is(
  (select count(*)::integer
   from public.mavis_articles article
   join public.mavis_article_sources link on link.article_id = article.id
   join public.mavis_sources source on source.id = link.source_id
   where source.canonical_url = 'https://doi.org/10.5555/import-test'
     and article.origin_type = 'metadata_only'),
  1,
  'idempotent import keeps exactly one generated draft per source'
);

select throws_ok(
  $$select public.import_mavis_source_candidate('{"provider":"untrusted","providerRecordId":"x","title":"Invalid provider","sourceUrl":"https://example.org/source"}'::jsonb)$$,
  '22023',
  'Unsupported source provider',
  'unrecognized providers are rejected'
);

select throws_ok(
  $$select public.import_mavis_source_candidate('{"provider":"crossref","providerRecordId":"x","title":"Invalid source URL","sourceUrl":"http://example.org/source"}'::jsonb)$$,
  '22023',
  'Invalid HTTPS source URL',
  'non-HTTPS source URLs are rejected'
);

select throws_ok(
  $$select public.import_mavis_source_candidate('{"provider":"crossref","providerRecordId":"x","title":"Unexpected payload field","sourceUrl":"https://example.org/source","fullText":"not allowed"}'::jsonb)$$,
  '22023',
  'Source candidate contains unsupported fields',
  'unexpected candidate fields such as source text are rejected'
);

select is(
  (select status from public.mavis_articles where title = 'A metadata-only legal research source'),
  'draft',
  'import workflow does not approve or publish the article'
);

select * from finish();
rollback;
