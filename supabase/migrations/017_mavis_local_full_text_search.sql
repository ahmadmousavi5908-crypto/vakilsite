-- Build an administrator-only offline search index over MAVIS records already stored locally.
-- Trigger-maintained vectors avoid generated-column volatility differences across PostgreSQL builds.
-- This migration does not contact external providers or ingest copyrighted full text.

alter table public.mavis_articles
  add column if not exists search_vector tsvector;
alter table public.mavis_sources
  add column if not exists search_vector tsvector;
alter table public.mavis_source_candidates
  add column if not exists search_vector tsvector;

create or replace function public.mavis_normalize_search_text(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $function$
  select translate(
    translate(coalesce(p_value, ''), 'يىكۀةؤإأٱ', 'ییکههوااا'),
    'ًٌٍَُِّْٰـ',
    ''
  );
$function$;

create or replace function public.refresh_mavis_article_search_vector()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.search_vector :=
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.title)), 'A') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.excerpt)), 'B') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.content::text)), 'C') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(array_to_string(new.tags, ' '))), 'B');
  return new;
end;
$function$;

create or replace function public.refresh_mavis_source_search_vector()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.search_vector :=
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.title)), 'A') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.author_name)), 'B') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.publisher)), 'C') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.canonical_url)), 'D');
  return new;
end;
$function$;

create or replace function public.refresh_mavis_source_candidate_search_vector()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.search_vector :=
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.title)), 'A') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(array_to_string(new.authors, ' '))), 'B') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.venue)), 'C') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.publisher)), 'C') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.doi)), 'D') ||
    setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(new.canonical_url)), 'D');
  return new;
end;
$function$;

drop trigger if exists mavis_articles_refresh_search_vector on public.mavis_articles;
create trigger mavis_articles_refresh_search_vector
  before insert or update of title, excerpt, tags, content
  on public.mavis_articles
  for each row execute function public.refresh_mavis_article_search_vector();

drop trigger if exists mavis_sources_refresh_search_vector on public.mavis_sources;
create trigger mavis_sources_refresh_search_vector
  before insert or update of title, author_name, publisher, canonical_url
  on public.mavis_sources
  for each row execute function public.refresh_mavis_source_search_vector();

drop trigger if exists mavis_source_candidates_refresh_search_vector on public.mavis_source_candidates;
create trigger mavis_source_candidates_refresh_search_vector
  before insert or update of title, authors, venue, publisher, doi, canonical_url
  on public.mavis_source_candidates
  for each row execute function public.refresh_mavis_source_candidate_search_vector();

-- Backfill records that existed before this index was introduced.
update public.mavis_articles
set search_vector =
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(title)), 'A') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(excerpt)), 'B') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(content::text)), 'C') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(array_to_string(tags, ' '))), 'B');

update public.mavis_sources
set search_vector =
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(title)), 'A') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(author_name)), 'B') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(publisher)), 'C') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(canonical_url)), 'D');

update public.mavis_source_candidates
set search_vector =
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(title)), 'A') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(array_to_string(authors, ' '))), 'B') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(venue)), 'C') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(publisher)), 'C') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(doi)), 'D') ||
  setweight(to_tsvector('simple'::regconfig, public.mavis_normalize_search_text(canonical_url)), 'D');

create index if not exists mavis_articles_search_vector_gin_idx
  on public.mavis_articles using gin (search_vector);
create index if not exists mavis_sources_search_vector_gin_idx
  on public.mavis_sources using gin (search_vector);
create index if not exists mavis_source_candidates_search_vector_gin_idx
  on public.mavis_source_candidates using gin (search_vector);

create or replace function public.search_mavis_local_archive(
  p_query text,
  p_limit integer default 30
)
returns table (
  record_type text,
  record_id uuid,
  title text,
  excerpt text,
  status text,
  source_url text,
  target_path text,
  updated_at timestamptz,
  relevance real
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_query tsquery;
  v_term text := public.mavis_normalize_search_text(btrim(coalesce(p_query, '')));
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 50);
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if length(v_term) < 2 or length(v_term) > 200 then
    raise exception using errcode = '22023', message = 'Search query must contain between 2 and 200 characters';
  end if;

  v_query := websearch_to_tsquery('simple'::regconfig, v_term);
  if numnode(v_query) = 0 then
    return;
  end if;

  return query
  select
    result.record_type,
    result.record_id,
    result.title,
    result.excerpt,
    result.status,
    result.source_url,
    result.target_path,
    result.updated_at,
    result.relevance
  from (
    select
      'article'::text as record_type,
      article.id as record_id,
      article.title,
      left(coalesce(article.excerpt, '') || ' ' || coalesce(article.content::text, ''), 360) as excerpt,
      article.status,
      null::text as source_url,
      case when article.status = 'published'
        then '/articles/' || article.slug
        else '/admin/mavis/articles/' || article.id::text || '/edit'
      end as target_path,
      article.updated_at,
      ts_rank_cd(article.search_vector, v_query) as relevance
    from public.mavis_articles as article
    where article.search_vector @@ v_query

    union all

    select
      'candidate'::text,
      candidate.id,
      candidate.title,
      left(
        coalesce(array_to_string(candidate.authors, ', '), '') || ' ' ||
        coalesce(candidate.venue, '') || ' ' ||
        coalesce(candidate.publisher, '') || ' ' ||
        coalesce(candidate.doi, ''),
        360
      ),
      candidate.state,
      candidate.canonical_url,
      '/admin/mavis/articles?candidateState=' || candidate.state,
      candidate.updated_at,
      ts_rank_cd(candidate.search_vector, v_query)
    from public.mavis_source_candidates as candidate
    where candidate.search_vector @@ v_query

    union all

    select
      'source'::text,
      source.id,
      source.title,
      left(
        coalesce(source.author_name, '') || ' ' ||
        coalesce(source.publisher, '') || ' ' ||
        coalesce(source.rights_status, ''),
        360
      ),
      source.rights_status,
      source.canonical_url,
      '/admin/mavis/articles',
      source.updated_at,
      ts_rank_cd(source.search_vector, v_query)
    from public.mavis_sources as source
    where source.search_vector @@ v_query
  ) as result
  order by result.relevance desc, result.updated_at desc
  limit v_limit;
end;
$function$;

revoke all on function public.search_mavis_local_archive(text, integer)
  from public, anon, service_role;
grant execute on function public.search_mavis_local_archive(text, integer)
  to authenticated;

comment on function public.search_mavis_local_archive(text, integer) is
  'Searches the locally stored MAVIS article, source, and candidate metadata index. Admin-only, provider-independent, and does not call external search providers.';
