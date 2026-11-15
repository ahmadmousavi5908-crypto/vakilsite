begin;

select plan(19);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.mavis_editorial_articles'::regclass),
  'editorial article table has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.mavis_editorial_articles', 'SELECT'),
  'anonymous users cannot query the editorial base table'
);
select ok(
  not has_table_privilege('anon', 'public.mavis_editorial_articles', 'INSERT'),
  'anonymous users cannot create editorial records'
);
select ok(
  not has_table_privilege('anon', 'public.mavis_editorial_articles', 'UPDATE'),
  'anonymous users cannot edit editorial records'
);
select ok(
  not has_table_privilege('anon', 'public.mavis_editorial_articles', 'DELETE'),
  'anonymous users cannot delete editorial records'
);
select ok(
  has_table_privilege('authenticated', 'public.mavis_editorial_articles', 'SELECT'),
  'authenticated role has table access subject to RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.mavis_editorial_articles', 'TRUNCATE'),
  'authenticated role cannot truncate editorial records'
);
select ok(
  has_function_privilege('anon', 'public.get_mavis_published_articles()', 'EXECUTE'),
  'anonymous users can read only the published snapshot RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.get_mavis_published_articles()', 'EXECUTE'),
  'authenticated users can read the published snapshot RPC'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.get_mavis_published_articles()'::regprocedure),
  'published snapshot RPC uses SECURITY DEFINER'
);
select ok(
  (select coalesce(proconfig @> array['search_path=""'], false)
   from pg_proc
   where oid = 'public.get_mavis_published_articles()'::regprocedure),
  'published snapshot RPC has an empty search_path'
);
select ok(
  position('status = ''published''' in pg_get_functiondef('public.get_mavis_published_articles()'::regprocedure)) > 0,
  'published snapshot RPC filters to published records'
);
select ok(
  position('published_content is not null' in lower(pg_get_functiondef('public.get_mavis_published_articles()'::regprocedure))) > 0,
  'published snapshot RPC excludes records without a public snapshot'
);
select ok(
  (select position('is_site_admin()' in pg_get_expr(polqual, polrelid)) > 0
   from pg_policy
   where polrelid = 'public.mavis_editorial_articles'::regclass
     and polname = 'Admins can read all MAVIS articles'),
  'base-table read policy is restricted to site administrators'
);

-- Seed isolated fixtures as the migration test owner. The transaction rolls them back.
insert into public.mavis_editorial_articles (
  id, slug, draft_content, published_content, status
)
values
  (
    'd0d00000-0000-4000-8000-000000000006',
    'mavis-rls-test-published',
    '{}'::jsonb,
    '{"title":"Published fixture"}'::jsonb,
    'published'
  ),
  (
    'd0d00000-0000-4000-8000-000000000007',
    'mavis-rls-test-draft',
    '{"title":"Private draft"}'::jsonb,
    null,
    'draft'
  );

-- Anonymous visitors can retrieve the published snapshot, never a draft.
set local role anon;

select results_eq(
  $select slug from public.get_mavis_published_articles()
    where slug = 'mavis-rls-test-published'$,
  array['mavis-rls-test-published'::text],
  'anonymous visitors can retrieve a published article snapshot'
);

select is_empty(
  $select slug from public.get_mavis_published_articles()
    where slug = 'mavis-rls-test-draft'$,
  'anonymous visitors cannot retrieve a draft through the public RPC'
);

reset role;

-- A signed-in user without a profiles.role = admin record must remain blocked.
set local role authenticated;
set local request.jwt.claim.sub = 'd0d00000-0000-4000-8000-000000000099';

select results_eq(
  $select count(*) from public.mavis_editorial_articles
    where id in (
      'd0d00000-0000-4000-8000-000000000006'::uuid,
      'd0d00000-0000-4000-8000-000000000007'::uuid
    )$,
  array[0::bigint],
  'authenticated non-admin users cannot read published or draft base records'
);

select is_empty(
  $update public.mavis_editorial_articles
    set draft_content = '{"title":"Unauthorized edit"}'::jsonb
    where id = 'd0d00000-0000-4000-8000-000000000007'::uuid
    returning id$,
  'authenticated non-admin users cannot update a draft'
);

select is_empty(
  $delete from public.mavis_editorial_articles
    where id = 'd0d00000-0000-4000-8000-000000000007'::uuid
    returning id$,
  'authenticated non-admin users cannot delete a draft'
);

select throws_ok(
  $insert into public.mavis_editorial_articles (slug, draft_content, status)
    values ('mavis-rls-test-forbidden-insert', '{"title":"Unauthorized"}'::jsonb, 'draft')$,
  '42501',
  null,
  'authenticated non-admin users cannot create editorial records'
);

reset role;

select * from finish();

rollback;
