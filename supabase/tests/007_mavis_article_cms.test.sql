begin;
select plan(44);

select ok((select relrowsecurity from pg_class where oid = 'public.mavis_articles'::regclass), 'article table has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mavis_article_versions'::regclass), 'article versions table has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.mavis_article_audit_events'::regclass), 'article audit table has RLS enabled');

select ok(has_table_privilege('anon', 'public.mavis_articles', 'SELECT'), 'anonymous visitors can read published article rows');
select ok(not has_table_privilege('anon', 'public.mavis_articles', 'INSERT'), 'anonymous visitors cannot create articles');
select ok(not has_table_privilege('anon', 'public.mavis_articles', 'UPDATE'), 'anonymous visitors cannot edit articles');
select ok(not has_table_privilege('anon', 'public.mavis_articles', 'DELETE'), 'anonymous visitors cannot delete articles');

select ok(has_table_privilege('authenticated', 'public.mavis_articles', 'SELECT'), 'authenticated users have table select privilege subject to RLS');
select ok(has_table_privilege('authenticated', 'public.mavis_articles', 'INSERT'), 'authenticated users have insert privilege subject to admin RLS');
select ok(has_table_privilege('authenticated', 'public.mavis_articles', 'UPDATE'), 'authenticated users have update privilege subject to admin RLS');
select ok(not has_table_privilege('authenticated', 'public.mavis_articles', 'DELETE'), 'authenticated users cannot delete articles');

select ok(has_table_privilege('service_role', 'public.mavis_articles', 'SELECT'), 'server import role can read article rows');
select ok(has_table_privilege('service_role', 'public.mavis_articles', 'INSERT'), 'server import role can seed articles');
select ok(has_table_privilege('service_role', 'public.mavis_articles', 'UPDATE'), 'server import role can perform idempotent article imports');
select ok(not has_table_privilege('service_role', 'public.mavis_articles', 'DELETE'), 'server import role cannot delete articles');

select ok(position('status = ''published''' in (select coalesce(qual, '') from pg_policies where schemaname = 'public' and tablename = 'mavis_articles' and policyname = 'Public can read published MAVIS articles')) > 0, 'public read policy exposes published articles only');
select ok(position('is_site_admin' in (select coalesce(qual, '') from pg_policies where schemaname = 'public' and tablename = 'mavis_articles' and policyname = 'MAVIS admins can read all articles')) > 0, 'all-article read policy is admin-only');
select ok(position('is_site_admin' in (select coalesce(with_check, '') from pg_policies where schemaname = 'public' and tablename = 'mavis_articles' and policyname = 'MAVIS admins can create articles')) > 0, 'article insert policy is admin-only');
select ok(position('is_site_admin' in (select coalesce(qual, '') from pg_policies where schemaname = 'public' and tablename = 'mavis_articles' and policyname = 'MAVIS admins can update articles')) > 0, 'article update policy is admin-only');

select ok(has_table_privilege('authenticated', 'public.mavis_article_versions', 'SELECT'), 'admins have table select privilege for versions subject to RLS');
select ok(not has_table_privilege('anon', 'public.mavis_article_versions', 'SELECT'), 'anonymous visitors cannot read article versions');
select ok(not has_table_privilege('service_role', 'public.mavis_article_versions', 'SELECT'), 'server import role cannot directly read article versions');
select ok(not has_table_privilege('authenticated', 'public.mavis_article_versions', 'INSERT'), 'clients cannot insert article versions directly');

select ok(has_table_privilege('authenticated', 'public.mavis_article_audit_events', 'SELECT'), 'admins have table select privilege for audit subject to RLS');
select ok(not has_table_privilege('anon', 'public.mavis_article_audit_events', 'SELECT'), 'anonymous visitors cannot read article audit');
select ok(not has_table_privilege('authenticated', 'public.mavis_article_audit_events', 'INSERT'), 'clients cannot insert article audit events directly');

select ok(not has_schema_privilege('anon', 'mavis_cms_private', 'USAGE'), 'anonymous visitors cannot access private CMS schema');
select ok(not has_schema_privilege('authenticated', 'mavis_cms_private', 'USAGE'), 'authenticated users cannot access private CMS schema');
select ok(not has_schema_privilege('service_role', 'mavis_cms_private', 'USAGE'), 'service role cannot access private CMS schema');

select ok(exists (select 1 from pg_trigger where tgrelid = 'public.mavis_articles'::regclass and tgname = 'mavis_articles_prepare_write' and not tgisinternal), 'article write preparation trigger exists');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.mavis_articles'::regclass and tgname = 'mavis_articles_record_version' and not tgisinternal), 'article version and audit trigger exists');
select ok((select prosecdef from pg_proc where oid = 'mavis_cms_private.prepare_article_write()'::regprocedure), 'write preparation function is SECURITY DEFINER');
select ok((select proconfig @> array['search_path=""'] from pg_proc where oid = 'mavis_cms_private.prepare_article_write()'::regprocedure), 'write preparation function has an empty search_path');
select ok((select prosecdef from pg_proc where oid = 'mavis_cms_private.record_article_version()'::regprocedure), 'version function is SECURITY DEFINER');
select ok((select proconfig @> array['search_path=""'] from pg_proc where oid = 'mavis_cms_private.record_article_version()'::regprocedure), 'version function has an empty search_path');

set local role service_role;
insert into public.mavis_articles (
  slug, title, excerpt, category, read_time, content, status, source_origin, last_change_note
) values (
  'mavis-ci-article',
  'مقاله آزمایشی ماویس',
  'این متن صرفاً برای آزمون ساختار محتوای پایدار در محیط CI نوشته شده است.',
  'آزمایشی',
  4,
  '{"intro":"مقدمه آزمایشی مقاله","sections":[{"heading":"بخش اول","body":"متن بخش اول"}],"checklist":["مورد اول"],"warning":"هشدار آزمایشی","sources":[]}'::jsonb,
  'draft',
  'legacy_static_import',
  'CI seed'
);
reset role;

select is((select version from public.mavis_articles where slug = 'mavis-ci-article'), 1, 'new article starts at version one');
select ok(exists (select 1 from public.mavis_article_versions v join public.mavis_articles a on a.id = v.article_id where a.slug = 'mavis-ci-article' and v.version = 1), 'insert trigger stores first immutable content snapshot');
select ok(exists (select 1 from public.mavis_article_audit_events e join public.mavis_articles a on a.id = e.article_id where a.slug = 'mavis-ci-article' and e.event_type = 'created'), 'insert trigger records article creation');

set local role service_role;
update public.mavis_articles set status = 'review', last_change_note = 'Submit for review' where slug = 'mavis-ci-article';
update public.mavis_articles set status = 'published', last_change_note = 'Approved publication' where slug = 'mavis-ci-article';
update public.mavis_articles set status = 'archived', last_change_note = 'Archive after test' where slug = 'mavis-ci-article';
reset role;

select is((select version from public.mavis_articles where slug = 'mavis-ci-article'), 4, 'each content or workflow update increments the version');
select is((select count(*) from public.mavis_article_versions v join public.mavis_articles a on a.id = v.article_id where a.slug = 'mavis-ci-article'), 4::bigint, 'all four article versions are preserved');
select ok(exists (select 1 from public.mavis_article_audit_events e join public.mavis_articles a on a.id = e.article_id where a.slug = 'mavis-ci-article' and e.event_type = 'submitted_for_review'), 'review submission is audited');
select ok(exists (select 1 from public.mavis_article_audit_events e join public.mavis_articles a on a.id = e.article_id where a.slug = 'mavis-ci-article' and e.event_type = 'published'), 'publication is audited');
select ok(exists (select 1 from public.mavis_article_audit_events e join public.mavis_articles a on a.id = e.article_id where a.slug = 'mavis-ci-article' and e.event_type = 'archived'), 'archival is audited');
select ok((select published_at is not null from public.mavis_articles where slug = 'mavis-ci-article'), 'archived article retains its original publication timestamp');

select * from finish();
rollback;
