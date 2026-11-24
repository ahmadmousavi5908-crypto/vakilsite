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
    select prosecdef
    from pg_proc
    where oid = to_regprocedure('public.save_mavis_article_draft_with_image(jsonb,jsonb,uuid,integer,text)')
  ), false),
  'Versioned image-save wrapper exists as a security-definer RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.save_mavis_article_draft_with_image(jsonb,jsonb,uuid,integer,text)',
    'EXECUTE'
  ),
  'Authenticated role can invoke the image-save RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.save_mavis_article_draft_with_image(jsonb,jsonb,uuid,integer,text)',
    'EXECUTE'
  ),
  'Anonymous role cannot invoke the image-save RPC'
);

select * from finish();
rollback;
