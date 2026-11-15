begin;

select plan(14);

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

select * from finish();

rollback;
