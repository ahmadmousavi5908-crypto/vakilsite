begin;

select plan(23);

select has_column('public', 'mavis_editorial_articles', 'draft_content', 'Mother Two draft snapshot column is preserved');
select has_column('public', 'mavis_editorial_articles', 'published_content', 'Mother Two published snapshot column is preserved');
select has_column('public', 'mavis_editorial_articles', 'legal_review_status', 'Mother Two legal review status is preserved');
select has_column('public', 'mavis_editorial_articles', 'reviewer_name', 'Mother Two reviewer name is preserved');
select has_column('public', 'mavis_editorial_articles', 'is_indexable', 'Mother Two indexability flag is preserved');
select has_column('public', 'mavis_editorial_articles', 'last_legal_review_at', 'Mother Two legal review timestamp is preserved');
select has_column('public', 'mavis_editorial_articles', 'draft_updated_at', 'Mother Two draft update timestamp is preserved');
select has_column('public', 'mavis_editorial_articles', 'published_version', 'Canonical table tracks the exact published version');

select has_trigger(
  'public',
  'mavis_editorial_articles',
  'mavis_editorial_legacy_fields_sync',
  'legacy snapshot fields are synchronized by a base-table trigger'
);

select ok(
  not has_schema_privilege('authenticated', 'public', 'CREATE'),
  'authenticated role does not retain schema creation privileges from the compatibility view setup'
);

select ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mavis_articles'
      AND column_name IN (
        'created_by', 'updated_by', 'last_change_note',
        'origin_type', 'archived_from_status', 'search_vector'
      )
  ),
  'public compatibility view omits internal editorial metadata'
);

select is(
  (
    SELECT count(*)::integer
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) LIKE '%public.mavis_articles%'
  ),
  0,
  'privileged workflow functions address the canonical table directly'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-000000000013',
  'authenticated',
  'authenticated',
  'mavis-canonical-reviewer@example.invalid',
  '',
  now(),
  '{"full_name":"MAVIS Canonical Reviewer"}'::jsonb,
  now(),
  now()
);

insert into public.mavis_editorial_articles (
  id, slug, title, author_name, excerpt, category, tags, content,
  content_schema_version, status, origin_type, current_version
)
values (
  '00000000-0000-4000-8000-000000000023',
  'canonical-editorial-table-test',
  'Canonical editorial table test',
  'MAVIS Test Author',
  'A sufficiently long excerpt for the canonical editorial table test.',
  'Test',
  array['staging', 'canonical'],
  '{"intro":"Canonical draft content"}'::jsonb,
  1,
  'draft',
  'admin_created',
  1
);

insert into public.mavis_article_versions (
  id, article_id, version, snapshot, change_note
)
values (
  '00000000-0000-4000-8000-000000000033',
  '00000000-0000-4000-8000-000000000023',
  1,
  '{
    "slug":"canonical-editorial-table-test",
    "title":"Canonical editorial table test",
    "author_name":"MAVIS Test Author",
    "excerpt":"A sufficiently long excerpt for the canonical editorial table test.",
    "category":"Test",
    "tags":["staging","canonical"],
    "content":{"intro":"Canonical draft content"},
    "content_schema_version":1
  }'::jsonb,
  'Canonical table compatibility test'
);

insert into public.mavis_article_approvals (
  id, article_id, article_version, decision, reviewer_id, decision_note
)
values (
  '00000000-0000-4000-8000-000000000043',
  '00000000-0000-4000-8000-000000000023',
  1,
  'approved',
  '00000000-0000-4000-8000-000000000013',
  'Approved for canonical table compatibility test'
);

select lives_ok(
  $$select id from public.mavis_editorial_articles
    where id = '00000000-0000-4000-8000-000000000023'
    for update$$,
  'canonical table supports the row locking used by guarded workflow RPCs'
);

update public.mavis_editorial_articles
set status = 'published', published_at = now()
where id = '00000000-0000-4000-8000-000000000023';

select is(
  (select published_version from public.mavis_editorial_articles
   where id = '00000000-0000-4000-8000-000000000023'),
  1,
  'publishing captures the exact current version'
);

select is(
  (select draft_content ->> 'title' from public.mavis_editorial_articles
   where id = '00000000-0000-4000-8000-000000000023'),
  'Canonical editorial table test',
  'legacy draft snapshot mirrors the immutable current version'
);

select is(
  (select published_content ->> 'title' from public.mavis_editorial_articles
   where id = '00000000-0000-4000-8000-000000000023'),
  'Canonical editorial table test',
  'legacy published snapshot mirrors the exact published version'
);

select is(
  (select legal_review_status from public.mavis_editorial_articles
   where id = '00000000-0000-4000-8000-000000000023'),
  'approved',
  'legacy legal review status reflects the approval state'
);

select is(
  (select reviewer_name from public.mavis_editorial_articles
   where id = '00000000-0000-4000-8000-000000000023'),
  'MAVIS Canonical Reviewer',
  'legacy reviewer name is derived from the exact version approval'
);

select ok(
  (select last_legal_review_at is not null
   from public.mavis_editorial_articles
   where id = '00000000-0000-4000-8000-000000000023'),
  'legacy legal review timestamp is populated'
);

select ok(
  (select draft_updated_at is not null
   from public.mavis_editorial_articles
   where id = '00000000-0000-4000-8000-000000000023'),
  'legacy draft update timestamp is populated'
);

select ok(
  (select is_indexable
   from public.mavis_editorial_articles
   where id = '00000000-0000-4000-8000-000000000023'),
  'approved publication is indexable through the legacy contract'
);

select is(
  (select count(*)::integer
   from public.get_mavis_published_articles()
   where slug = 'canonical-editorial-table-test'),
  1,
  'Mother Two public reader receives the published snapshot from the canonical table'
);

select ok(
  has_function_privilege('anon', 'public.get_mavis_published_articles()', 'EXECUTE'),
  'anonymous readers retain execute access to the restricted published snapshot RPC'
);

select * from finish();

rollback;
