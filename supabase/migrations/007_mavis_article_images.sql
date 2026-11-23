-- Public article images with administrator-only upload and mutation access.
-- The bucket is public for crawlable image URLs; writes remain protected by RLS.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mavis-article-images',
  'mavis-article-images',
  true,
  3145728,
  array['image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "MAVIS admins upload article images" on storage.objects;
create policy "MAVIS admins upload article images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'mavis-article-images'
    and public.is_site_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "MAVIS admins update article images" on storage.objects;
create policy "MAVIS admins update article images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'mavis-article-images'
    and public.is_site_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'mavis-article-images'
    and public.is_site_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "MAVIS admins delete article images" on storage.objects;
create policy "MAVIS admins delete article images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'mavis-article-images'
    and public.is_site_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
