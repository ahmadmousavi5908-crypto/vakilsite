-- MAVIS Editorial CMS schema foundation.
-- This migration creates isolated editorial tables only. It does not import data,
-- change public article routes, or grant direct CMS write access to application roles.

create table if not exists public.mavis_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  author_name text,
  excerpt text not null,
  category text not null,
  tags text[] not null default '{}'::text[],
  content jsonb not null default '{}'::jsonb,
  content_schema_version smallint not null default 1,
  seo_title text,
  seo_description text,
  status text not null default 'draft',
  origin_type text not null default 'admin_created',
  current_version integer not null default 1,
  last_change_note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint mavis_articles_slug_format
    check (slug ~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$' and char_length(slug) between 3 and 180),
  constraint mavis_articles_title_length
    check (char_length(btrim(title)) between 3 and 300),
  constraint mavis_articles_excerpt_length
    check (char_length(btrim(excerpt)) between 10 and 1200),
  constraint mavis_articles_category_length
    check (char_length(btrim(category)) between 2 and 100),
  constraint mavis_articles_tags_limit
    check (cardinality(tags) <= 40),
  constraint mavis_articles_content_object
    check (jsonb_typeof(content) = 'object'),
  constraint mavis_articles_content_schema_version
    check (content_schema_version between 1 and 20),
  constraint mavis_articles_status
    check (status in ('discovered', 'imported', 'draft', 'in_review', 'approved', 'published', 'changes_requested', 'rejected', 'archived', 'needs_update')),
  constraint mavis_articles_origin_type
    check (origin_type in ('admin_created', 'legacy_static_import', 'licensed_import', 'metadata_only', 'link_only')),
  constraint mavis_articles_current_version
    check (current_version > 0),
  constraint mavis_articles_published_timestamp
    check (status <> 'published' or published_at is not null)
);

create index if not exists mavis_articles_publication_idx
  on public.mavis_articles (published_at desc, id desc)
  where status = 'published';

create index if not exists mavis_articles_category_status_updated_idx
  on public.mavis_articles (category, status, updated_at desc, id desc);

create index if not exists mavis_articles_status_updated_idx
  on public.mavis_articles (status, updated_at desc, id desc);

create table if not exists public.mavis_sources (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null unique,
  source_type text not null,
  external_id text,
  title text not null,
  author_name text,
  publisher text,
  published_on date,
  retrieved_at timestamptz not null default now(),
  rights_status text not null default 'unknown',
  license_name text,
  license_url text,
  permission_evidence_ref text,
  attribution_requirements text,
  permitted_transformations text[] not null default '{}'::text[],
  rights_reviewed_by uuid references auth.users(id) on delete set null,
  rights_reviewed_at timestamptz,
  rights_review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mavis_sources_url_length
    check (char_length(canonical_url) between 8 and 2000),
  constraint mavis_sources_http_url
    check (canonical_url ~ '^https?://'),
  constraint mavis_sources_type
    check (source_type in ('official_law', 'judiciary', 'government', 'journal', 'academic', 'news', 'rss', 'manual', 'other')),
  constraint mavis_sources_rights_status
    check (rights_status in ('unknown', 'metadata_only', 'link_only', 'licensed', 'public_domain', 'permission_denied')),
  constraint mavis_sources_title_length
    check (char_length(btrim(title)) between 2 and 500),
  constraint mavis_sources_review_consistency
    check ((rights_reviewed_at is null) = (rights_reviewed_by is null))
);

create index if not exists mavis_sources_external_id_idx
  on public.mavis_sources (source_type, external_id)
  where external_id is not null;

create table if not exists public.mavis_article_sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.mavis_articles(id) on delete cascade,
  source_id uuid not null references public.mavis_sources(id) on delete restrict,
  relation_type text not null,
  citation_label text,
  section_key text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint mavis_article_sources_relation_type
    check (relation_type in ('primary_authority', 'secondary_reference', 'research_background', 'image', 'dataset')),
  constraint mavis_article_sources_unique_relation
    unique (article_id, source_id, relation_type)
);

create index if not exists mavis_article_sources_source_idx
  on public.mavis_article_sources (source_id, article_id);

create table if not exists public.mavis_article_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.mavis_articles(id) on delete restrict,
  version integer not null,
  snapshot jsonb not null,
  change_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint mavis_article_versions_version_positive check (version > 0),
  constraint mavis_article_versions_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint mavis_article_versions_unique unique (article_id, version)
);

create table if not exists public.mavis_article_approvals (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null,
  article_version integer not null,
  decision text not null,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision_note text,
  created_at timestamptz not null default now(),
  constraint mavis_article_approvals_decision
    check (decision in ('approved', 'changes_requested', 'rejected')),
  constraint mavis_article_approvals_version_fk
    foreign key (article_id, article_version)
    references public.mavis_article_versions(article_id, version)
    on delete restrict
);

create index if not exists mavis_article_approvals_version_idx
  on public.mavis_article_approvals (article_id, article_version, created_at desc);

create table if not exists public.mavis_article_audit_events (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.mavis_articles(id) on delete set null,
  source_id uuid references public.mavis_sources(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  previous_status text,
  next_status text,
  article_version integer,
  request_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint mavis_article_audit_event_type
    check (event_type in (
      'article_created', 'article_updated', 'source_added', 'source_rights_changed',
      'review_submitted', 'approval_recorded', 'article_published',
      'article_unpublished', 'article_archived', 'article_restored',
      'import_discovered', 'import_completed', 'import_failed'
    )),
  constraint mavis_article_audit_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint mavis_article_audit_version_positive
    check (article_version is null or article_version > 0)
);

create index if not exists mavis_article_audit_article_created_idx
  on public.mavis_article_audit_events (article_id, created_at desc);

create index if not exists mavis_article_audit_created_idx
  on public.mavis_article_audit_events (created_at desc);

-- RLS is enabled before any application access is granted.
alter table public.mavis_articles enable row level security;
alter table public.mavis_sources enable row level security;
alter table public.mavis_article_sources enable row level security;
alter table public.mavis_article_versions enable row level security;
alter table public.mavis_article_approvals enable row level security;
alter table public.mavis_article_audit_events enable row level security;

-- No browser role or service role receives direct mutation privileges.
revoke all on table
  public.mavis_articles,
  public.mavis_sources,
  public.mavis_article_sources,
  public.mavis_article_versions,
  public.mavis_article_approvals,
  public.mavis_article_audit_events
from public, anon, authenticated, service_role;

-- Public article data is readable only when its status is published.
grant select on public.mavis_articles to authenticated;
grant select (
  id, slug, title, author_name, excerpt, category, tags, content,
  content_schema_version, seo_title, seo_description, status,
  current_version, created_at, updated_at, published_at
) on public.mavis_articles to anon;
create policy "Public can read published MAVIS articles"
  on public.mavis_articles
  for select
  to anon, authenticated
  using (status = 'published');

create policy "Site admins can read all MAVIS articles"
  on public.mavis_articles
  for select
  to authenticated
  using (public.is_site_admin());

-- Editorial provenance, rights evidence, approvals, versions, and audit data are admin-only.
grant select on
  public.mavis_sources,
  public.mavis_article_sources,
  public.mavis_article_versions,
  public.mavis_article_approvals,
  public.mavis_article_audit_events
to authenticated;

create policy "Site admins can read MAVIS sources"
  on public.mavis_sources
  for select
  to authenticated
  using (public.is_site_admin());

create policy "Site admins can read MAVIS article source links"
  on public.mavis_article_sources
  for select
  to authenticated
  using (public.is_site_admin());

create policy "Site admins can read MAVIS article versions"
  on public.mavis_article_versions
  for select
  to authenticated
  using (public.is_site_admin());

create policy "Site admins can read MAVIS article approvals"
  on public.mavis_article_approvals
  for select
  to authenticated
  using (public.is_site_admin());

create policy "Site admins can read MAVIS article audit events"
  on public.mavis_article_audit_events
  for select
  to authenticated
  using (public.is_site_admin());

comment on table public.mavis_articles is
  'Editorial article records. Direct application writes are intentionally disabled until guarded workflow RPCs are added.';
comment on table public.mavis_sources is
  'Source provenance and reuse-rights evidence. Unknown rights never imply permission to republish.';
comment on table public.mavis_article_versions is
  'Version snapshots; application roles have read-only access through administrator RLS.';
comment on table public.mavis_article_approvals is
  'Append-only approval decisions tied to an exact article version.';
comment on table public.mavis_article_audit_events is
  'Append-only editorial audit history; sensitive article bodies and secrets must not be logged.';
