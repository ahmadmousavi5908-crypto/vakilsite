-- Guarded draft writes for MAVIS Editorial CMS.
-- All writes are atomic: article row, immutable version snapshot, and audit event.

create or replace function public.save_mavis_article_draft(
  p_payload jsonb,
  p_article_id uuid default null,
  p_expected_version integer default null,
  p_change_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_article_id uuid;
  v_current_version integer;
  v_next_version integer;
  v_current_status text;
  v_snapshot jsonb;
  v_section jsonb;
  v_tag jsonb;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'Article payload must be a JSON object';
  end if;

  if p_payload - array[
    'slug', 'title', 'author_name', 'excerpt', 'category', 'tags',
    'content', 'content_schema_version', 'seo_title', 'seo_description'
  ] <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Article payload contains unsupported fields';
  end if;

  if jsonb_typeof(p_payload->'slug') <> 'string'
    or length(p_payload->>'slug') not between 3 and 180
    or (p_payload->>'slug') !~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$' then
    raise exception using errcode = '22023', message = 'Invalid article slug';
  end if;

  if jsonb_typeof(p_payload->'title') <> 'string'
    or length(btrim(p_payload->>'title')) not between 3 and 300 then
    raise exception using errcode = '22023', message = 'Invalid article title';
  end if;

  if jsonb_typeof(p_payload->'excerpt') <> 'string'
    or length(btrim(p_payload->>'excerpt')) not between 10 and 1200 then
    raise exception using errcode = '22023', message = 'Invalid article excerpt';
  end if;

  if jsonb_typeof(p_payload->'category') <> 'string'
    or length(btrim(p_payload->>'category')) not between 2 and 100 then
    raise exception using errcode = '22023', message = 'Invalid article category';
  end if;

  if jsonb_typeof(p_payload->'tags') <> 'array'
    or jsonb_array_length(p_payload->'tags') > 40 then
    raise exception using errcode = '22023', message = 'Article tags must be an array of at most 40 items';
  end if;

  for v_tag in select value from jsonb_array_elements(p_payload->'tags')
  loop
    if jsonb_typeof(v_tag) <> 'string' or length(btrim(v_tag #>> '{}')) not between 1 and 60 then
      raise exception using errcode = '22023', message = 'Invalid article tag';
    end if;
  end loop;

  if jsonb_typeof(p_payload->'content') <> 'object'
    or (p_payload->'content' - array['intro', 'sections', 'checklist', 'warning']) <> '{}'::jsonb
    or jsonb_typeof(p_payload->'content'->'intro') <> 'string'
    or length(btrim(p_payload->'content'->>'intro')) not between 10 and 8000
    or jsonb_typeof(p_payload->'content'->'sections') <> 'array'
    or jsonb_array_length(p_payload->'content'->'sections') not between 1 and 80 then
    raise exception using errcode = '22023', message = 'Invalid structured article content';
  end if;

  for v_section in select value from jsonb_array_elements(p_payload->'content'->'sections')
  loop
    if jsonb_typeof(v_section) <> 'object'
      or (v_section - array['heading', 'body']) <> '{}'::jsonb
      or jsonb_typeof(v_section->'heading') <> 'string'
      or length(btrim(v_section->>'heading')) not between 2 and 240
      or jsonb_typeof(v_section->'body') <> 'string'
      or length(btrim(v_section->>'body')) not between 10 and 12000 then
      raise exception using errcode = '22023', message = 'Invalid article section';
    end if;
  end loop;

  if p_payload->'content' ? 'checklist'
    and (jsonb_typeof(p_payload->'content'->'checklist') <> 'array'
      or jsonb_array_length(p_payload->'content'->'checklist') > 60) then
    raise exception using errcode = '22023', message = 'Invalid article checklist';
  end if;

  if p_payload->'content' ? 'warning'
    and (jsonb_typeof(p_payload->'content'->'warning') <> 'string'
      or length(p_payload->'content'->>'warning') > 2000) then
    raise exception using errcode = '22023', message = 'Invalid article warning';
  end if;

  if p_payload ? 'author_name'
    and (jsonb_typeof(p_payload->'author_name') <> 'string'
      or length(p_payload->>'author_name') > 180) then
    raise exception using errcode = '22023', message = 'Invalid article author';
  end if;

  if p_payload ? 'seo_title'
    and (jsonb_typeof(p_payload->'seo_title') <> 'string'
      or length(p_payload->>'seo_title') > 300) then
    raise exception using errcode = '22023', message = 'Invalid SEO title';
  end if;

  if p_payload ? 'seo_description'
    and (jsonb_typeof(p_payload->'seo_description') <> 'string'
      or length(p_payload->>'seo_description') > 500) then
    raise exception using errcode = '22023', message = 'Invalid SEO description';
  end if;

  if p_payload ? 'content_schema_version'
    and (jsonb_typeof(p_payload->'content_schema_version') <> 'number'
      or (p_payload->>'content_schema_version')::integer <> 1) then
    raise exception using errcode = '22023', message = 'Unsupported content schema version';
  end if;

  if p_article_id is null then
    if p_expected_version is not null then
      raise exception using errcode = '22023', message = 'New drafts must not include an expected version';
    end if;

    v_article_id := gen_random_uuid();
    v_next_version := 1;

    insert into public.mavis_articles (
      id, slug, title, author_name, excerpt, category, tags, content,
      content_schema_version, seo_title, seo_description, status,
      origin_type, current_version, last_change_note, created_by, updated_by
    )
    values (
      v_article_id,
      p_payload->>'slug',
      btrim(p_payload->>'title'),
      nullif(btrim(coalesce(p_payload->>'author_name', '')), ''),
      btrim(p_payload->>'excerpt'),
      btrim(p_payload->>'category'),
      array(select jsonb_array_elements_text(p_payload->'tags')),
      p_payload->'content',
      coalesce((p_payload->>'content_schema_version')::smallint, 1),
      nullif(btrim(coalesce(p_payload->>'seo_title', '')), ''),
      nullif(btrim(coalesce(p_payload->>'seo_description', '')), ''),
      'draft',
      'admin_created',
      v_next_version,
      nullif(btrim(coalesce(p_change_note, '')), ''),
      v_actor,
      v_actor
    );
  else
    if p_expected_version is null or p_expected_version < 1 then
      raise exception using errcode = '22023', message = 'Expected version is required when updating a draft';
    end if;

    select current_version, status
      into v_current_version, v_current_status
      from public.mavis_articles
      where id = p_article_id
      for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'Article not found';
    end if;

    if v_current_version <> p_expected_version then
      raise exception using errcode = '40001', message = 'Article version conflict; reload before saving';
    end if;

    if v_current_status not in ('draft', 'changes_requested', 'needs_update') then
      raise exception using errcode = '55000', message = 'Only editable draft states can be changed';
    end if;

    v_article_id := p_article_id;
    v_next_version := v_current_version + 1;

    update public.mavis_articles
    set slug = p_payload->>'slug',
        title = btrim(p_payload->>'title'),
        author_name = nullif(btrim(coalesce(p_payload->>'author_name', '')), ''),
        excerpt = btrim(p_payload->>'excerpt'),
        category = btrim(p_payload->>'category'),
        tags = array(select jsonb_array_elements_text(p_payload->'tags')),
        content = p_payload->'content',
        content_schema_version = coalesce((p_payload->>'content_schema_version')::smallint, 1),
        seo_title = nullif(btrim(coalesce(p_payload->>'seo_title', '')), ''),
        seo_description = nullif(btrim(coalesce(p_payload->>'seo_description', '')), ''),
        current_version = v_next_version,
        last_change_note = nullif(btrim(coalesce(p_change_note, '')), ''),
        updated_by = v_actor,
        updated_at = now()
    where id = v_article_id;
  end if;

  select jsonb_build_object(
    'slug', slug,
    'title', title,
    'author_name', author_name,
    'excerpt', excerpt,
    'category', category,
    'tags', to_jsonb(tags),
    'content', content,
    'content_schema_version', content_schema_version,
    'seo_title', seo_title,
    'seo_description', seo_description,
    'status', status
  )
  into v_snapshot
  from public.mavis_articles
  where id = v_article_id;

  insert into public.mavis_article_versions (
    article_id, version, snapshot, change_note, created_by
  )
  values (
    v_article_id, v_next_version, v_snapshot,
    nullif(btrim(coalesce(p_change_note, '')), ''),
    v_actor
  );

  insert into public.mavis_article_audit_events (
    article_id, actor_id, event_type, previous_status, next_status,
    article_version, metadata
  )
  values (
    v_article_id, v_actor,
    case when p_article_id is null then 'article_created' else 'article_updated' end,
    v_current_status,
    'draft',
    v_next_version,
    jsonb_build_object('change_note', nullif(btrim(coalesce(p_change_note, '')), ''))
  );

  return v_article_id;
end;
$$;

revoke all on function public.save_mavis_article_draft(jsonb, uuid, integer, text)
  from public, anon, service_role;
grant execute on function public.save_mavis_article_draft(jsonb, uuid, integer, text)
  to authenticated;

comment on function public.save_mavis_article_draft(jsonb, uuid, integer, text) is
  'Creates or updates an administrator-owned draft atomically with a version snapshot and audit event. Never publishes.';
