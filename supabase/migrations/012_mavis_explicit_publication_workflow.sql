-- Explicit publish/unpublish actions for already approved immutable article versions.
-- Approval never publishes by itself; every publication is a separate administrator action.

create or replace function public.publish_mavis_article(
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
  v_status text;
  v_current_version integer;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_article_id is null or p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'Article and expected version are required';
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
    raise exception using errcode = '40001', message = 'Article version changed; refresh before publication';
  end if;

  if v_status <> 'approved' then
    raise exception using errcode = '55000', message = 'Article is not approved for publication';
  end if;

  if not exists (
    select 1
    from public.mavis_article_versions
    where article_id = p_article_id and version = p_expected_version
  ) or not exists (
    select 1
    from public.mavis_article_approvals
    where article_id = p_article_id
      and article_version = p_expected_version
      and decision = 'approved'
  ) then
    raise exception using errcode = '55000', message = 'Exact approved article version is missing';
  end if;

  update public.mavis_articles
  set status = 'published',
      published_at = now(),
      updated_by = v_actor,
      updated_at = now()
  where id = p_article_id;

  insert into public.mavis_article_audit_events (
    article_id, actor_id, event_type, previous_status, next_status,
    article_version, metadata
  )
  values (
    p_article_id, v_actor, 'article_published', 'approved', 'published',
    p_expected_version, jsonb_build_object('published_version', p_expected_version)
  );

  return jsonb_build_object(
    'articleId', p_article_id,
    'articleVersion', p_expected_version,
    'status', 'published'
  );
end;
$function$;

create or replace function public.unpublish_mavis_article(
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
  v_status text;
  v_current_version integer;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_article_id is null or p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'Article and expected version are required';
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
    raise exception using errcode = '40001', message = 'Article version changed; refresh before unpublishing';
  end if;

  if v_status <> 'published' then
    raise exception using errcode = '55000', message = 'Article is not currently published';
  end if;

  if not exists (
    select 1
    from public.mavis_article_versions
    where article_id = p_article_id and version = p_expected_version
  ) or not exists (
    select 1
    from public.mavis_article_approvals
    where article_id = p_article_id
      and article_version = p_expected_version
      and decision = 'approved'
  ) then
    raise exception using errcode = '55000', message = 'Exact approved article version is missing';
  end if;

  update public.mavis_articles
  set status = 'approved',
      published_at = null,
      updated_by = v_actor,
      updated_at = now()
  where id = p_article_id;

  insert into public.mavis_article_audit_events (
    article_id, actor_id, event_type, previous_status, next_status,
    article_version, metadata
  )
  values (
    p_article_id, v_actor, 'article_unpublished', 'published', 'approved',
    p_expected_version, jsonb_build_object('unpublished_version', p_expected_version)
  );

  return jsonb_build_object(
    'articleId', p_article_id,
    'articleVersion', p_expected_version,
    'status', 'approved'
  );
end;
$function$;

revoke all on function public.publish_mavis_article(uuid, integer)
  from public, anon, service_role;
revoke all on function public.unpublish_mavis_article(uuid, integer)
  from public, anon, service_role;
grant execute on function public.publish_mavis_article(uuid, integer)
  to authenticated;
grant execute on function public.unpublish_mavis_article(uuid, integer)
  to authenticated;

comment on function public.publish_mavis_article(uuid, integer) is
  'Requires a separate administrator action to publish the exact current immutable version with an approval record. Review approval alone never publishes.';
comment on function public.unpublish_mavis_article(uuid, integer) is
  'Unpublishes the exact current approved version, clears its public timestamp, and returns it to approved status without deleting approval or version history.';
