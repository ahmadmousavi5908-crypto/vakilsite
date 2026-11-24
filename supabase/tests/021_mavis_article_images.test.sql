begin;

select plan(8);

select is(
  (select public from storage.buckets where id = 'mavis-article-images'),
  true,
  'MAVIS article image bucket is publicly readable'
);

select is(
  (select file_size_limit::bigint from storage.buckets where id = 'mavis-article-images'),
  3145728::bigint,
  'MAVIS article image objects are limited to 3 MiB'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'mavis-article-images'),
  array['image/webp']::text[],
  'MAVIS article image bucket accepts only WebP'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'MAVIS admins upload article images'
      and cmd = 'INSERT'
      and with_check like '%is_site_admin%'
      and with_check like '%foldername%'
  ),
  'Image uploads are restricted to verified admins and their own folder'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'MAVIS admins delete article images'
      and cmd = 'DELETE'
      and qual like '%is_site_admin%'
      and qual like '%foldername%'
  ),
  'Image cleanup is restricted to verified admins and their own folder'
);

select ok(
  coalesce((
    select relrowsecurity
    from pg_class
    where oid = 'public.mavis_article_version_images'::regclass
  ), false),
  'Versioned image metadata has Row Level Security enabled'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mavis_article_version_images'
      and policyname = 'MAVIS admins can read versioned article images'
      and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
      and qual like '%is_site_admin%'
  ),
  'Only verified administrators can read private draft image metadata'
);

select ok(
  coalesce((
    select prosecdef
      and has_function_privilege('authenticated', oid, 'EXECUTE')
      and not has_function_privilege('anon', oid, 'EXECUTE')
    from pg_proc
    where oid = to_regprocedure('public.save_mavis_article_draft_with_image(jsonb,jsonb,uuid,integer,text)')
  ), false),
  'Image-save RPC is security-definer, available to authenticated admins, and unavailable to anonymous users'
);

select * from finish();
rollback;
