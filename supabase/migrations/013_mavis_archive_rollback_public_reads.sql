-- Guarded publication, archive, restore, rollback, and safe public source reads.
-- Publishing requires an approval for the exact current immutable version.
-- Rollback always creates a new draft version and never republishes automatically.

alter table public.mavis_articles
  add column if not exists archived_from_status text;

alter table public.mavis_articles
  drop constraint if exists mavis_articles_archived_from_status;

alter table public.mavis_articles
  add constraint mavis_articles_archived_from_status
  check (
    archived_from_status is null
    or archived_from_status in (
      'draft', 'in_review', 'approved', 'published',
      'changes_requested', 'rejected', 'needs_update'
    )
  );

create or replace function public.archive_mavis_article(
  p_article_id uuid,
  p_expected_version integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_current_version integer;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_article_id is null or p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'Article and expected version are required';
  end if;

  if length(coalesce(p_note, '')) > 1000 then
    raise exception using errcode = '22023', message = 'Archive note is too long';
  end if;

  select status, current_version
    into v_status, v_current_version
    from public.mavis_articles
    where id = p_article_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Article not found';
  end if;

  if v_current_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Article version changed; refresh before archiving';
  end if;

  if v_status in ('archived', 'in_review') then
    raise exception using errcode = '55000', message = 'Article cannot be archived from its current state';
  end if;

  update public.mavis_articles
  set archived_from_status = v_status,
      status = 'archived',
      updated_by = v_actor,
      updated_at = now()
  where id = p_article_id;

  insert into public.mavis_article_audit_events (
    article_id, actor_id, event_type, previous_status, next_status,
    article_version, metadata
  )
  values (
    p_article_id, v_actor, 'article_archived', v_status, 'archived',
    p_expected_version, jsonb_build_object('note', nullif(btrim(coalesce(p_note, '')), ''))
  );

  return jsonb_build_object(
    'articleId', p_article_id,
    'articleVersion', p_expected_version,
    'status', 'archived'
  );
end;
$function$;

create or replace function public.restore_mavis_article(
  p_article_id uuid,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_archived_from_status text;
  v_current_version integer;
  v_next_status text;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_article_id is null or p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'Article and expected version are required';
  end if;

  select archived_from_status, current_version
    into v_archived_from_status, v_current_version
    from public.mavis_articles
    where id = p_article_id and status = 'archived'
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Archived article not found';
  end if;

  if v_current_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Article version changed; refresh before restoring';
  end if;

  v_next_status := case
    when v_archived_from_status = 'published' then 'approved'
    when v_archived_from_status in ('in_review', 'rejected') then 'draft'
    else coalesce(v_archived_from_status, 'draft')
  end;

  update public.mavis_articles
  set status = v_next_status,
      archived_from_status = null,
      published_at = null,
      updated_by = v_actor,
      updated_at = now()
  where id = p_article_id;

  insert into public.mavis_article_audit_events (
    article_id, actor_id, event_type, previous_status, next_status,
    article_version, metadata
  )
  values (
    p_article_id, v_actor, 'article_restored', 'archived', v_next_status,
    p_expected_version,
    jsonb_build_object('restored_from_status', v_archived_from_status, 'requires_republication', v_next_status = 'approved')
  );

  return jsonb_build_object(
    'articleId', p_article_id,
    'articleVersion', p_expected_version,
    'status', v_next_status
  );
end;
$function$;

create or replace function public.rollback_mavis_article_version(
  p_article_id uuid,
  p_expected_current_version integer,
  p_target_version integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_current_version integer;
  v_target_snapshot jsonb;
  v_new_snapshot jsonb;
  v_next_version integer;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_article_id is null
    or p_expected_current_version is null or p_expected_current_version < 1
    or p_target_version is null or p_target_version < 1
    or p_target_version >= p_expected_current_version then
    raise exception using errcode = '22023', message = 'Invalid rollback version';
  end if;

  if length(coalesce(p_note, '')) > 1000 then
    raise exception using errcode = '22023', message = 'Rollback note is too long';
  end if;

  select status, current_version
    into v_status, v_current_version
    from public.mavis_articles
    where id = p_article_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Article not found';
  end if;

  if v_current_version <> p_expected_current_version then
    raise exception using errcode = '40001', message = 'Article version changed; refresh before rollback';
  end if;

  if v_status = 'published' then
    raise exception using errcode = '55000', message = 'Published article must be unpublished before rollback';
  end if;

  if v_status not in ('approved', 'draft', 'changes_requested', 'needs_update') then
    raise exception using errcode = '55000', message = 'Article cannot be rolled back from its current state';
  end if;

  select snapshot into v_target_snapshot
  from public.mavis_article_versions
  where article_id = p_article_id and version = p_target_version;

  if not found or jsonb_typeof(v_target_snapshot) is distinct from 'object'
    or jsonb_typeof(v_target_snapshot->'content') is distinct from 'object'
    or jsonb_typeof(v_target_snapshot->'tags') is distinct from 'array' then
    raise exception using errcode = '55000', message = 'Target immutable version is unavailable or invalid';
  end if;

  v_next_version := v_current_version + 1;
  v_new_snapshot := jsonb_set(v_target_snapshot, '{status}', '"draft"'::jsonb, true)
    || jsonb_build_object('rollback_of_version', p_target_version);

  update public.mavis_articles
  set slug = v_target_snapshot->>'slug',
      title = v_target_snapshot->>'title',
      author_name = nullif(v_target_snapshot->>'author_name', ''),
      excerpt = v_target_snapshot->>'excerpt',
      category = v_target_snapshot->>'category',
      tags = array(select jsonb_array_elements_text(v_target_snapshot->'tags')),
      content = v_target_snapshot->'content',
      content_schema_version = coalesce((v_target_snapshot->>'content_schema_version')::smallint, 1),
      seo_title = nullif(v_target_snapshot->>'seo_title', ''),
      seo_description = nullif(v_target_snapshot->>'seo_description', ''),
      status = 'draft',
      current_version = v_next_version,
      published_at = null,
      archived_from_status = null,
      last_change_note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Rollback to immutable version ' || p_target_version::text),
      updated_by = v_actor,
      updated_at = now()
  where id = p_article_id;

  insert into public.mavis_article_versions (
    article_id, version, snapshot, change_note, created_by
  )
  values (
    p_article_id, v_next_version, v_new_snapshot,
    coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Rollback to immutable version ' || p_target_version::text),
    v_actor
  );

  insert into public.mavis_article_audit_events (
    article_id, actor_id, event_type, previous_status, next_status,
    article_version, metadata
  )
  values (
    p_article_id, v_actor,
    'article_updated',
    v_status, 'draft', v_next_version,
    jsonb_build_object('rollback_of_version', p_target_version, 'new_version', v_next_version, 'note', nullif(btrim(coalesce(p_note, '')), ''))
  );

  return jsonb_build_object(
    'articleId', p_article_id,
    'articleVersion', v_next_version,
    'rollbackOfVersion', p_target_version,
    'status', 'draft'
  );
end;
$function$;

create or replace function public.get_public_mavis_article_sources(p_article_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'title', source.title,
        'url', source.canonical_url,
        'sourceType', source.source_type,
        'relationType', article_source.relation_type,
        'label', article_source.citation_label
      )
      order by article_source.sort_order, source.title
    ),
    '[]'::jsonb
  )
  from public.mavis_article_sources article_source
  join public.mavis_sources source on source.id = article_source.source_id
  join public.mavis_articles article on article.id = article_source.article_id
  where article_source.article_id = p_article_id
    and article.status = 'published'
    and article_source.relation_type in ('primary_authority', 'secondary_reference', 'research_background');
$function$;

revoke all on function public.archive_mavis_article(uuid, integer, text)
  from public, anon, service_role;
revoke all on function public.restore_mavis_article(uuid, integer)
  from public, anon, service_role;
revoke all on function public.rollback_mavis_article_version(uuid, integer, integer, text)
  from public, anon, service_role;
revoke all on function public.get_public_mavis_article_sources(uuid)
  from public, service_role;

grant execute on function public.archive_mavis_article(uuid, integer, text)
  to authenticated;
grant execute on function public.restore_mavis_article(uuid, integer)
  to authenticated;
grant execute on function public.rollback_mavis_article_version(uuid, integer, integer, text)
  to authenticated;
grant execute on function public.get_public_mavis_article_sources(uuid)
  to anon, authenticated;

comment on function public.rollback_mavis_article_version(uuid, integer, integer, text) is
  'Requires a published article to be explicitly unpublished first, then copies a prior immutable version into a new draft version. It never republishes automatically.';
comment on function public.get_public_mavis_article_sources(uuid) is
  'Returns safe source citation metadata only when the associated article is currently published.';
