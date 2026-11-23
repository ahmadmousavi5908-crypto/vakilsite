begin;

select plan(8);

select is(
  (select public from storage.buckets where id = 'mavis-article-images'),
  true,
  'article image bucket is public for crawlable image delivery'
);

select is(
  (select file_size_limit::bigint from storage.buckets where id = 'mavis-article-images'),
  3145728::bigint,
  'article image variants have a bounded three-megabyte upload limit'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'mavis-article-images'),
  array['image/webp']::text[],
  'only WebP images are accepted by the storage bucket'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'MAVIS admins upload article images'
      and cmd = 'INSERT'
      and roles @> array['authenticated']::name[]
      and qual is null
      and position('is_site_admin()' in coalesce(with_check, '')) > 0
  ),
  'only authenticated site administrators can upload article images'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'MAVIS admins upload article images'
      and cmd = 'INSERT'
      and position('foldername' in coalesce(with_check, '')) > 0
      and position('auth.uid' in coalesce(with_check, '')) > 0
  ),
  'uploads are restricted to the authenticated administrator own folder'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'MAVIS admins update article images'
      and cmd = 'UPDATE'
      and position('is_site_admin()' in coalesce(qual, '') || coalesce(with_check, '')) > 0
      and position('foldername' in coalesce(qual, '') || coalesce(with_check, '')) > 0
      and position('auth.uid' in coalesce(qual, '') || coalesce(with_check, '')) > 0
  ),
  'updates require administrator status and ownership of the storage folder'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'MAVIS admins delete article images'
      and cmd = 'DELETE'
      and position('is_site_admin()' in coalesce(qual, '')) > 0
  ),
  'only authenticated site administrators can delete article images'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'MAVIS admins delete article images'
      and cmd = 'DELETE'
      and position('foldername' in coalesce(qual, '')) > 0
      and position('auth.uid' in coalesce(qual, '')) > 0
  ),
  'deletes are restricted to the authenticated administrator own folder'
);

select * from finish();

rollback;
