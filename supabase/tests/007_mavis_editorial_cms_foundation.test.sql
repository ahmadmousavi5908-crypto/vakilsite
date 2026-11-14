begin;

select plan(33);

select has_table('public', 'mavis_articles', 'CMS articles table exists');
select ok(to_regclass('public.mavis_articles_editable_updated_idx') is not null, 'editable draft keyset pagination has a dedicated partial index');
select has_table('public', 'mavis_sources', 'CMS source registry table exists');
select has_table('public', 'mavis_article_sources', 'CMS article-source relation table exists');
select has_table('public', 'mavis_article_versions', 'CMS article versions table exists');
select has_table('public', 'mavis_article_approvals', 'CMS approval table exists');
select has_table('public', 'mavis_article_audit_events', 'CMS audit table exists');

select ok((select relrowsecurity from pg_class where oid = 'public.mavis_articles'::regclass), 'article table has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mavis_sources'::regclass), 'source table has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mavis_article_sources'::regclass), 'article-source table has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mavis_article_versions'::regclass), 'version table has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mavis_article_approvals'::regclass), 'approval table has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mavis_article_audit_events'::regclass), 'audit table has RLS enabled');

select ok(
  has_column_privilege('anon', 'public.mavis_articles', 'slug', 'SELECT')
  and has_column_privilege('anon', 'public.mavis_articles', 'content', 'SELECT')
  and not has_column_privilege('anon', 'public.mavis_articles', 'created_by', 'SELECT')
  and not has_column_privilege('anon', 'public.mavis_articles', 'updated_by', 'SELECT')
  and not has_column_privilege('anon', 'public.mavis_articles', 'last_change_note', 'SELECT'),
  'anonymous role can read public article fields but not internal editorial metadata'
);
select ok(not has_table_privilege('anon', 'public.mavis_sources', 'SELECT'), 'anonymous role cannot select source/rights records');
select ok(has_table_privilege('authenticated', 'public.mavis_sources', 'SELECT'), 'authenticated role has SELECT privilege gated by admin RLS');
select ok(not has_table_privilege('anon', 'public.mavis_article_sources', 'SELECT'), 'anonymous role cannot enumerate article-source records');
select ok(not has_table_privilege('anon', 'public.mavis_article_versions', 'SELECT'), 'anonymous role cannot read article versions');
select ok(not has_table_privilege('anon', 'public.mavis_article_approvals', 'SELECT'), 'anonymous role cannot read approvals');
select ok(not has_table_privilege('anon', 'public.mavis_article_audit_events', 'SELECT'), 'anonymous role cannot read audit events');

select ok(not has_table_privilege('anon', 'public.mavis_articles', 'INSERT'), 'anonymous role cannot insert articles');
select ok(not has_table_privilege('authenticated', 'public.mavis_articles', 'INSERT'), 'authenticated role cannot directly insert articles');
select ok(not has_table_privilege('authenticated', 'public.mavis_articles', 'UPDATE'), 'authenticated role cannot directly update articles');
select ok(not has_table_privilege('authenticated', 'public.mavis_articles', 'DELETE'), 'authenticated role cannot directly delete articles');
select ok(not has_table_privilege('authenticated', 'public.mavis_sources', 'INSERT'), 'authenticated role cannot directly insert sources');
select ok(not has_table_privilege('authenticated', 'public.mavis_article_approvals', 'INSERT'), 'authenticated role cannot forge approvals');
select ok(not has_table_privilege('service_role', 'public.mavis_articles', 'SELECT'), 'service role has no direct CMS article grant');
select ok(not has_table_privilege('service_role', 'public.mavis_article_audit_events', 'INSERT'), 'service role cannot directly forge CMS audit events');

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'cms-editor-test@example.invalid', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'cms-admin-test@example.invalid', '', now(), now(), now());

insert into public.profiles (id, role)
values
  ('00000000-0000-4000-8000-000000000011', 'editor'),
  ('00000000-0000-4000-8000-000000000012', 'admin');

insert into public.mavis_articles (
  id, slug, title, excerpt, category, content, status, origin_type, current_version, published_at
)
values
  ('00000000-0000-4000-8000-000000000021', 'published-cms-test', 'Published CMS test article', 'A published test excerpt for public read policy.', 'Test', '{"intro":"Public content"}', 'published', 'admin_created', 1, now()),
  ('00000000-0000-4000-8000-000000000022', 'draft-cms-test', 'Draft CMS test article', 'A private draft excerpt for administrator policy.', 'Test', '{"intro":"Draft content"}', 'draft', 'admin_created', 1, null);

insert into public.mavis_sources (
  id, canonical_url, source_type, title, rights_status
)
values (
  '00000000-0000-4000-8000-000000000031',
  'https://example.invalid/legal-source',
  'academic',
  'CMS test source',
  'unknown'
);

insert into public.mavis_article_sources (article_id, source_id, relation_type, citation_label)
values (
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000031',
  'secondary_reference',
  'CMS test citation'
);

set local role anon;
reset request.jwt.claim.sub;

select results_eq(
  $$select count(slug)::bigint from public.mavis_articles$$,
  array[1::bigint],
  'anonymous visitors can read only published articles'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000011';

select results_eq(
  $$select count(slug)::bigint from public.mavis_articles$$,
  array[1::bigint],
  'authenticated non-admin users can read only published articles'
);

select results_eq(
  $$select count(*)::bigint from public.mavis_sources$$,
  array[0::bigint],
  'authenticated non-admin users cannot read source rights metadata'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000012';

select results_eq(
  $$select count(slug)::bigint from public.mavis_articles$$,
  array[2::bigint],
  'site administrators can read both published and draft articles'
);

select results_eq(
  $$select count(*)::bigint from public.mavis_sources$$,
  array[1::bigint],
  'site administrators can read source registry records'
);

select * from finish();

rollback;
