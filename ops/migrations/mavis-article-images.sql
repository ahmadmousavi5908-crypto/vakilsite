-- Public article images are crawlable; all write operations remain admin-only.
-- Uploads use upsert=false, so INSERT and DELETE policies are sufficient.
-- The wrapper saves image metadata atomically with the exact draft version.

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
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "MAVIS admins delete article images" on storage.objects;
create policy "MAVIS admins delete article images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'mavis-article-images'
    and public.is_site_admin()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create or replace function public.save_mavis_article_draft_with_image(
  p_payload jsonb,
  p_image jsonb,
  p_article_id uuid default null,
  p_expected_version integer default null,
  p_change_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_article_id uuid;
  v_current_version integer;
  v_host text;
  v_path text;
  v_prefix_url text;
  v_upload_id text;
  v_base_url text;
  v_name text;
  v_expected_url text;
  v_allowed_keys text[] := array[
    'url', 'ogUrl', 'variants', 'alt', 'title', 'caption',
    'width', 'height', 'mimeType', 'showInArticle', 'useForSeo'
  ];
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_payload is null
    or jsonb_typeof(p_payload) is distinct from 'object'
    or jsonb_typeof(p_payload->'content') is distinct from 'object'
    or p_image is null
    or jsonb_typeof(p_image) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Article and image payloads must be JSON objects';
  end if;

  if p_image - v_allowed_keys <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Image payload contains unsupported fields';
  end if;

  if jsonb_typeof(p_image->'alt') is distinct from 'string'
    or length(btrim(p_image->>'alt')) not between 5 and 300
    or coalesce(length(p_image->>'title'), 0) > 300
    or coalesce(length(p_image->>'caption'), 0) > 500
    or p_image->>'mimeType' is distinct from 'image/webp'
    or p_image->>'width' is distinct from '1600'
    or p_image->>'height' is distinct from '900'
    or jsonb_typeof(p_image->'showInArticle') is distinct from 'boolean'
    or jsonb_typeof(p_image->'useForSeo') is distinct from 'boolean'
    or ((p_image->>'useForSeo')::boolean and not (p_image->>'showInArticle')::boolean) then
    raise exception using errcode = '22023', message = 'Invalid article image metadata';
  end if;

  if jsonb_typeof(p_image->'variants') is distinct from 'object'
    or (p_image->'variants') - array['small', 'medium', 'wide', 'landscape', 'square']::text[] <> '{}'::jsonb
    or (select count(*) from jsonb_object_keys(p_image->'variants')) <> 5 then
    raise exception using errcode = '22023', message = 'Invalid responsive image variants';
  end if;

  if jsonb_typeof(p_image->'url') is distinct from 'string'
    or jsonb_typeof(p_image->'ogUrl') is distinct from 'string'
    or p_image->>'url' !~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/mavis-article-images/[0-9a-f-]{36}/[0-9a-f-]{36}/wide\.webp$' then
    raise exception using errcode = '22023', message = 'Invalid public article image URL';
  end if;

  v_host := split_part(split_part(p_image->>'url', '://', 2), '/', 1);
  v_path := substring(p_image->>'url' from '^https://[^/]+(/storage/v1/.*)$');
  v_prefix_url := 'https://' || v_host || '/storage/v1/object/public/mavis-article-images/' || v_actor::text || '/';

  if left(p_image->>'url', length(v_prefix_url)) <> v_prefix_url
    or v_path is null then
    raise exception using errcode = '42501', message = 'Article image must belong to the current administrator';
  end if;

  v_upload_id := split_part(substr(p_image->>'url', length(v_prefix_url) + 1), '/', 1);
  if v_upload_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode = '22023', message = 'Invalid image upload identifier';
  end if;

  v_base_url := v_prefix_url || v_upload_id || '/';
  if p_image->>'url' is distinct from v_base_url || 'wide.webp'
    or p_image->>'ogUrl' is distinct from v_base_url || 'og.webp' then
    raise exception using errcode = '22023', message = 'Image URLs do not match the expected upload set';
  end if;

  foreach v_name in array array['small', 'medium', 'wide', 'landscape', 'square']
  loop
    v_expected_url := v_base_url || v_name || '.webp';
    if jsonb_typeof(p_image->'variants'->v_name) is distinct from 'string'
      or p_image->'variants'->>v_name is distinct from v_expected_url then
      raise exception using errcode = '22023', message = 'Responsive image variant URL mismatch';
    end if;
  end loop;

  -- The existing RPC retains all content, status, concurrency, version and audit validation.
  v_article_id := public.save_mavis_article_draft(
    p_payload,
    p_article_id,
    p_expected_version,
    p_change_note
  );

  select current_version
    into v_current_version
    from public.mavis_editorial_articles
    where id = v_article_id;

  update public.mavis_article_versions
  set snapshot = jsonb_set(snapshot, '{content,image}', p_image, true)
  where article_id = v_article_id
    and version = v_current_version;

  if not found then
    raise exception using errcode = '55000', message = 'The saved article version snapshot was not found';
  end if;

  -- The existing BEFORE UPDATE trigger copies the now-updated version snapshot into draft_content.
  update public.mavis_editorial_articles
  set content = jsonb_set(content, '{image}', p_image, true)
  where id = v_article_id
    and current_version = v_current_version;

  if not found then
    raise exception using errcode = '40001', message = 'The article changed while attaching its image';
  end if;

  return v_article_id;
end;
$function$;

revoke all on function public.save_mavis_article_draft_with_image(jsonb, jsonb, uuid, integer, text)
  from public, anon, service_role;
grant execute on function public.save_mavis_article_draft_with_image(jsonb, jsonb, uuid, integer, text)
  to authenticated;

comment on function public.save_mavis_article_draft_with_image(jsonb, jsonb, uuid, integer, text) is
  'Creates or updates an administrator-owned draft and atomically stores its validated image metadata in the current immutable version snapshot.';
