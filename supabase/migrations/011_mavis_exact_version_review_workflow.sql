-- Exact-version editorial review workflow for MAVIS.
-- Review decisions are append-only and always bind to an immutable article version.
-- This migration does not publish articles or change public routes.

create or replace function public.submit_mavis_article_for_review(
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
    raise exception using errcode = '40001', message = 'Article version changed; refresh before review';
  end if;

  if v_status not in ('draft', 'changes_requested', 'needs_update') then
    raise exception using errcode = '55000', message = 'Article is not in a submittable state';
  end if;

  if not exists (
    select 1 from public.mavis_article_versions
    where article_id = p_article_id and version = p_expected_version
  ) then
    raise exception using errcode = '55000', message = 'Immutable article version is missing';
  end if;

  update public.mavis_articles
  set status = 'in_review',
      updated_by = v_actor,
      updated_at = now()
  where id = p_article_id;

  insert into public.mavis_article_audit_events (
    article_id, actor_id, event_type, previous_status, next_status,
    article_version, metadata
  )
  values (
    p_article_id, v_actor, 'review_submitted', v_status, 'in_review',
    p_expected_version, jsonb_build_object('submitted_version', p_expected_version)
  );

  return jsonb_build_object(
    'articleId', p_article_id,
    'articleVersion', p_expected_version,
    'status', 'in_review'
  );
end;
$function$;

create or replace function public.decide_mavis_article_review(
  p_article_id uuid,
  p_article_version integer,
  p_decision text,
  p_decision_note text default null
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
  v_next_status text;
  v_note text := nullif(btrim(coalesce(p_decision_note, '')), '');
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_article_id is null or p_article_version is null or p_article_version < 1 then
    raise exception using errcode = '22023', message = 'Article and version are required';
  end if;

  if p_decision is null or p_decision not in ('approved', 'changes_requested', 'rejected') then
    raise exception using errcode = '22023', message = 'Unsupported review decision';
  end if;

  if length(coalesce(p_decision_note, '')) > 2000 then
    raise exception using errcode = '22023', message = 'Review note is too long';
  end if;

  select status, current_version
    into v_status, v_current_version
    from public.mavis_articles
    where id = p_article_id
    for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Article not found';
  end if;

  if v_status <> 'in_review' then
    raise exception using errcode = '55000', message = 'Article is not awaiting review';
  end if;

  if v_current_version <> p_article_version then
    raise exception using errcode = '40001', message = 'Review version is stale; submit the current version again';
  end if;

  if not exists (
    select 1 from public.mavis_article_versions
    where article_id = p_article_id and version = p_article_version
  ) then
    raise exception using errcode = '55000', message = 'Immutable review version is missing';
  end if;

  v_next_status := p_decision;

  insert into public.mavis_article_approvals (
    article_id, article_version, decision, reviewer_id, decision_note
  )
  values (
    p_article_id, p_article_version, p_decision, v_actor, v_note
  );

  update public.mavis_articles
  set status = v_next_status,
      updated_by = v_actor,
      updated_at = now()
  where id = p_article_id;

  insert into public.mavis_article_audit_events (
    article_id, actor_id, event_type, previous_status, next_status,
    article_version, metadata
  )
  values (
    p_article_id, v_actor, 'approval_recorded', 'in_review', v_next_status,
    p_article_version,
    jsonb_build_object('decision', p_decision, 'decision_note', v_note)
  );

  return jsonb_build_object(
    'articleId', p_article_id,
    'articleVersion', p_article_version,
    'decision', p_decision,
    'status', v_next_status
  );
end;
$function$;

revoke all on function public.submit_mavis_article_for_review(uuid, integer)
  from public, anon, service_role;
revoke all on function public.decide_mavis_article_review(uuid, integer, text, text)
  from public, anon, service_role;
grant execute on function public.submit_mavis_article_for_review(uuid, integer)
  to authenticated;
grant execute on function public.decide_mavis_article_review(uuid, integer, text, text)
  to authenticated;

comment on function public.submit_mavis_article_for_review(uuid, integer) is
  'Moves an editable draft to in_review only when the submitted version matches the current immutable snapshot.';
comment on function public.decide_mavis_article_review(uuid, integer, text, text) is
  'Records an append-only review decision bound to the exact current immutable version. Approval does not publish.';
