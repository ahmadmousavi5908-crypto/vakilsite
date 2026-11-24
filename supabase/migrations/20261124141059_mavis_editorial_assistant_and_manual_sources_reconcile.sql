-- Adds versioned source attachment and guarded AI drafting for MAVIS editorial work.
-- This migration is intentionally preview-only until an administrator approves Staging apply.

alter table public.mavis_sources
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mavis_sources_metadata_object'
      and conrelid = 'public.mavis_sources'::regclass
  ) then
    alter table public.mavis_sources
      add constraint mavis_sources_metadata_object
      check (jsonb_typeof(metadata) = 'object');
  end if;
end;
$$;

grant select (metadata) on public.mavis_sources to authenticated;

create table if not exists mavis_private.editorial_ai_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  constraint mavis_editorial_ai_rate_count_nonnegative check (request_count >= 0)
);

alter table mavis_private.editorial_ai_rate_limits enable row level security;
revoke all on table mavis_private.editorial_ai_rate_limits from public, anon, authenticated, service_role;

create or replace function public.sync_mavis_article_sources_into_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sources jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', s.id,
          'label', coalesce(nullif(l.citation_label, ''), s.title),
          'title', s.title,
          'url', s.canonical_url,
          'source_type', s.source_type,
          'external_id', s.external_id,
          'author_name', s.author_name,
          'publisher', s.publisher,
          'published_on', s.published_on,
          'relation_type', l.relation_type,
          'metadata', jsonb_strip_nulls(
            jsonb_build_object(
              'document_number', s.metadata ->> 'document_number',
              'issuing_authority', s.metadata ->> 'issuing_authority',
              'document_type', s.metadata ->> 'document_type'
            )
          )
        )
      )
      order by l.sort_order, l.created_at, l.id
    ),
    '[]'::jsonb
  )
  into v_sources
  from public.mavis_article_sources as l
  join public.mavis_sources as s on s.id = l.source_id
  where l.article_id = new.id;

  new.content := jsonb_set(coalesce(new.content, '{}'::jsonb), '{sources}', v_sources, true);
  return new;
end;
$$;

drop trigger if exists mavis_article_sources_content_sync on public.mavis_editorial_articles;
create trigger mavis_article_sources_content_sync
before insert or update of content on public.mavis_editorial_articles
for each row execute function public.sync_mavis_article_sources_into_content();

create or replace function public.attach_mavis_source_to_article(
  p_article_id uuid,
  p_expected_version integer,
  p_source_id uuid,
  p_relation_type text default 'research_background',
  p_citation_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_article public.mavis_editorial_articles%rowtype;
  v_source public.mavis_sources%rowtype;
  v_new_version integer;
  v_sort_order integer;
  v_inserted integer;
  v_label text;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  if p_article_id is null
    or p_source_id is null
    or p_expected_version is null
    or p_expected_version < 1
    or coalesce(p_relation_type, '') not in ('primary_authority', 'secondary_reference', 'research_background', 'image', 'dataset') then
    raise exception 'Invalid source attachment input.' using errcode = '22023';
  end if;

  select * into v_article
  from public.mavis_editorial_articles
  where id = p_article_id
  for update;

  if not found then
    raise exception 'Editorial article not found.' using errcode = 'P0002';
  end if;

  if v_article.status not in ('draft', 'changes_requested', 'needs_update') then
    raise exception 'Sources can only be attached to an editable draft.' using errcode = '55000';
  end if;

  if v_article.current_version <> p_expected_version then
    raise exception 'The article version has changed.' using errcode = '40001';
  end if;

  select * into v_source from public.mavis_sources where id = p_source_id;
  if not found then
    raise exception 'Source record not found.' using errcode = 'P0002';
  end if;

  select coalesce(max(sort_order) + 1, 0)
  into v_sort_order
  from public.mavis_article_sources
  where article_id = p_article_id;

  v_label := left(coalesce(nullif(btrim(p_citation_label), ''), v_source.title), 1000);

  insert into public.mavis_article_sources (
    article_id, source_id, relation_type, citation_label, sort_order
  )
  values (
    p_article_id, p_source_id, p_relation_type, v_label, v_sort_order
  )
  on conflict (article_id, source_id, relation_type) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return jsonb_build_object(
      'ok', true,
      'already_attached', true,
      'source_id', v_source.id,
      'current_version', v_article.current_version,
      'source', jsonb_build_object(
        'id', v_source.id,
        'title', v_source.title,
        'canonical_url', v_source.canonical_url,
        'source_type', v_source.source_type,
        'external_id', v_source.external_id,
        'author_name', v_source.author_name,
        'publisher', v_source.publisher,
        'published_on', v_source.published_on,
        'rights_status', v_source.rights_status,
        'metadata', v_source.metadata,
        'relation_type', p_relation_type,
        'citation_label', v_label
      )
    );
  end if;

  v_new_version := v_article.current_version + 1;

  update public.mavis_editorial_articles
  set
    current_version = v_new_version,
    content = coalesce(content, '{}'::jsonb),
    last_change_note = left('Source attached: ' || v_source.title, 1000),
    updated_by = v_actor,
    updated_at = now()
  where id = p_article_id
  returning * into v_article;

  insert into public.mavis_article_versions (
    article_id, version, snapshot, change_note, created_by
  )
  values (
    p_article_id,
    v_new_version,
    jsonb_build_object(
      'slug', v_article.slug,
      'title', v_article.title,
      'excerpt', v_article.excerpt,
      'category', v_article.category,
      'author_name', v_article.author_name,
      'tags', to_jsonb(coalesce(v_article.tags, '{}'::text[])),
      'content', v_article.content,
      'content_schema_version', v_article.content_schema_version,
      'seo_title', v_article.seo_title,
      'seo_description', v_article.seo_description
    ),
    left('منبع به مقاله متصل شد: ' || v_source.title, 1000),
    v_actor
  );

  insert into public.mavis_article_audit_events (
    article_id, source_id, actor_id, event_type, article_version, metadata
  )
  values (
    p_article_id,
    v_source.id,
    v_actor,
    'source_added',
    v_new_version,
    jsonb_build_object(
      'relation_type', p_relation_type,
      'canonical_url', v_source.canonical_url,
      'source_type', v_source.source_type
    )
  );

  return jsonb_build_object(
    'ok', true,
    'already_attached', false,
    'source_id', v_source.id,
    'current_version', v_new_version,
    'source', jsonb_build_object(
      'id', v_source.id,
      'title', v_source.title,
      'canonical_url', v_source.canonical_url,
      'source_type', v_source.source_type,
      'external_id', v_source.external_id,
      'author_name', v_source.author_name,
      'publisher', v_source.publisher,
      'published_on', v_source.published_on,
      'rights_status', v_source.rights_status,
      'metadata', v_source.metadata,
      'relation_type', p_relation_type,
      'citation_label', v_label
    )
  );
end;
$$;

create or replace function public.add_mavis_manual_article_source(
  p_article_id uuid,
  p_expected_version integer,
  p_source jsonb,
  p_relation_type text default 'research_background'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_title text;
  v_url text;
  v_source_type text;
  v_author text;
  v_publisher text;
  v_external_id text;
  v_published_on date;
  v_metadata jsonb;
  v_citation_label text;
  v_source_id uuid;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_source) <> 'object' then
    raise exception 'Source metadata must be a JSON object.' using errcode = '22023';
  end if;

  v_title := left(btrim(coalesce(p_source ->> 'title', '')), 500);
  v_url := btrim(coalesce(p_source ->> 'sourceUrl', p_source ->> 'canonicalUrl', ''));

  if char_length(v_title) < 2
    or char_length(v_url) < 8
    or char_length(v_url) > 2000
    or v_url !~ '^https://[^[:space:]]+$'
    or v_url ~ '^https://[^/@]+@' then
    raise exception 'A valid title and HTTPS source URL are required.' using errcode = '22023';
  end if;

  v_source_type := coalesce(nullif(btrim(p_source ->> 'sourceType'), ''), 'manual');
  if v_source_type not in ('official_law', 'judiciary', 'government', 'journal', 'academic', 'news', 'rss', 'manual', 'other') then
    raise exception 'Unsupported source type.' using errcode = '22023';
  end if;

  if coalesce(p_relation_type, '') not in ('primary_authority', 'secondary_reference', 'research_background', 'image', 'dataset') then
    raise exception 'Unsupported source relation type.' using errcode = '22023';
  end if;

  v_author := left(nullif(btrim(p_source ->> 'author'), ''), 300);
  v_publisher := left(nullif(btrim(coalesce(p_source ->> 'issuingAuthority', p_source ->> 'publication')), ''), 300);
  v_external_id := left(nullif(btrim(p_source ->> 'documentNumber'), ''), 300);

  begin
    v_published_on := nullif(btrim(p_source ->> 'publicationDate'), '')::date;
  exception when others then
    v_published_on := null;
  end;

  v_metadata := jsonb_strip_nulls(
    jsonb_build_object(
      'document_number', v_external_id,
      'issuing_authority', v_publisher,
      'document_type', left(nullif(btrim(p_source ->> 'documentType'), ''), 200),
      'abstract', left(nullif(btrim(p_source ->> 'abstract'), ''), 1200),
      'source_authority', left(nullif(btrim(p_source ->> 'sourceAuthority'), ''), 100),
      'source_group', left(nullif(btrim(p_source ->> 'sourceGroup'), ''), 100),
      'provider', left(nullif(btrim(p_source ->> 'provider'), ''), 100)
    )
  );

  v_citation_label := left(
    concat_ws(
      ' · ',
      nullif(btrim(p_source ->> 'documentType'), ''),
      v_publisher,
      v_external_id,
      nullif(btrim(p_source ->> 'publicationDate'), '')
    ),
    1000
  );

  insert into public.mavis_sources (
    canonical_url, source_type, external_id, title, author_name, publisher,
    published_on, rights_status, rights_review_note, metadata
  )
  values (
    v_url, v_source_type, v_external_id, v_title, v_author, v_publisher,
    v_published_on, 'metadata_only',
    'Metadata and source link only. Legal validity and reproduction rights have not been independently verified.',
    v_metadata
  )
  on conflict (canonical_url) do nothing;

  select id into v_source_id
  from public.mavis_sources
  where canonical_url = v_url;

  return public.attach_mavis_source_to_article(
    p_article_id, p_expected_version, v_source_id, p_relation_type, v_citation_label
  );
end;
$$;

create or replace function mavis_private.consume_editorial_ai_limit()
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
  v_limit constant integer := 5;
  v_window constant interval := interval '10 minutes';
begin
  if v_actor is null or not public.is_site_admin() then
    return query select false, 0, 60;
    return;
  end if;

  insert into mavis_private.editorial_ai_rate_limits (user_id, window_started_at, request_count)
  values (v_actor, v_now, 1)
  on conflict (user_id) do update
  set
    window_started_at = case
      when mavis_private.editorial_ai_rate_limits.window_started_at + v_window <= v_now then v_now
      else mavis_private.editorial_ai_rate_limits.window_started_at
    end,
    request_count = case
      when mavis_private.editorial_ai_rate_limits.window_started_at + v_window <= v_now then 1
      else mavis_private.editorial_ai_rate_limits.request_count + 1
    end
  returning
    mavis_private.editorial_ai_rate_limits.window_started_at,
    mavis_private.editorial_ai_rate_limits.request_count
  into v_window_started_at, v_request_count;

  return query
  select
    v_request_count <= v_limit,
    greatest(0, v_limit - v_request_count),
    case
      when v_request_count <= v_limit then 0
      else greatest(1, ceil(extract(epoch from (v_window_started_at + v_window - v_now)))::integer)
    end;
end;
$$;

create or replace function public.consume_mavis_editorial_ai_limit()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'allowed', r.allowed,
    'remaining', r.remaining,
    'retry_after_seconds', r.retry_after_seconds
  )
  from mavis_private.consume_editorial_ai_limit() as r;
$$;

revoke all on function public.sync_mavis_article_sources_into_content() from public, anon, authenticated, service_role;
revoke all on function public.attach_mavis_source_to_article(uuid, integer, uuid, text, text) from public, anon, service_role;
revoke all on function public.add_mavis_manual_article_source(uuid, integer, jsonb, text) from public, anon, service_role;
revoke all on function mavis_private.consume_editorial_ai_limit() from public, anon, authenticated, service_role;
revoke all on function public.consume_mavis_editorial_ai_limit() from public, anon, service_role;

grant execute on function public.attach_mavis_source_to_article(uuid, integer, uuid, text, text) to authenticated;
grant execute on function public.add_mavis_manual_article_source(uuid, integer, jsonb, text) to authenticated;
grant execute on function public.consume_mavis_editorial_ai_limit() to authenticated;
