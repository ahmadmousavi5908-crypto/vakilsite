-- MAVIS editorial CMS: versioned article content with public published-only reads.
create table if not exists public.mavis_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  category text not null,
  read_time integer not null default 5,
  content jsonb not null,
  seo_title text,
  seo_description text,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  version integer not null default 1 check (version >= 1),
  source_origin text not null default 'admin_created' check (source_origin in ('admin_created', 'legacy_static_import')),
  last_change_note text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mavis_articles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint mavis_articles_title_length check (char_length(title) between 3 and 180),
  constraint mavis_articles_excerpt_length check (char_length(excerpt) between 20 and 500),
  constraint mavis_articles_category_length check (char_length(category) between 2 and 80),
  constraint mavis_articles_read_time check (read_time between 1 and 120),
  constraint mavis_articles_seo_title_length check (seo_title is null or char_length(seo_title) <= 180),
  constraint mavis_articles_seo_description_length check (seo_description is null or char_length(seo_description) <= 320),
  constraint mavis_articles_content_object check (jsonb_typeof(content) = 'object'),
  constraint mavis_articles_sections_array check (jsonb_typeof(content -> 'sections') = 'array'),
  constraint mavis_articles_checklist_array check (jsonb_typeof(content -> 'checklist') = 'array'),
  constraint mavis_articles_sources_array check (jsonb_typeof(content -> 'sources') = 'array'),
  constraint mavis_articles_intro_text check (char_length(coalesce(content ->> 'intro', '')) between 1 and 12000),
  constraint mavis_articles_warning_text check (char_length(coalesce(content ->> 'warning', '')) between 1 and 4000),
  constraint mavis_articles_published_date check (status <> 'published' or published_at is not null)
);

create index if not exists mavis_articles_publication_idx
  on public.mavis_articles (status, published_at desc);
create index if not exists mavis_articles_category_idx
  on public.mavis_articles (category, status);
create index if not exists mavis_articles_updated_idx
  on public.mavis_articles (updated_at desc);

alter table public.mavis_articles enable row level security;
revoke all on table public.mavis_articles from public, anon, authenticated, service_role;
grant select on table public.mavis_articles to anon, authenticated;
grant insert, update on table public.mavis_articles to authenticated;
grant select, insert, update on table public.mavis_articles to service_role;

drop policy if exists "Public can read published MAVIS articles" on public.mavis_articles;
create policy "Public can read published MAVIS articles"
  on public.mavis_articles for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "MAVIS admins can read all articles" on public.mavis_articles;
create policy "MAVIS admins can read all articles"
  on public.mavis_articles for select
  to authenticated
  using ((select public.is_site_admin()));

drop policy if exists "MAVIS admins can create articles" on public.mavis_articles;
create policy "MAVIS admins can create articles"
  on public.mavis_articles for insert
  to authenticated
  with check ((select public.is_site_admin()));

drop policy if exists "MAVIS admins can update articles" on public.mavis_articles;
create policy "MAVIS admins can update articles"
  on public.mavis_articles for update
  to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

create table if not exists public.mavis_article_versions (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.mavis_articles(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  change_note text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (article_id, version)
);
alter table public.mavis_article_versions enable row level security;
revoke all on table public.mavis_article_versions from public, anon, authenticated, service_role;
grant select on table public.mavis_article_versions to authenticated;
drop policy if exists "MAVIS admins can read article versions" on public.mavis_article_versions;
create policy "MAVIS admins can read article versions"
  on public.mavis_article_versions for select
  to authenticated
  using ((select public.is_site_admin()));

create table if not exists public.mavis_article_audit_events (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.mavis_articles(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'content_updated', 'submitted_for_review', 'published', 'archived', 'status_changed')),
  old_status text,
  new_status text not null,
  article_version integer not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
alter table public.mavis_article_audit_events enable row level security;
revoke all on table public.mavis_article_audit_events from public, anon, authenticated, service_role;
grant select on table public.mavis_article_audit_events to authenticated;
drop policy if exists "MAVIS admins can read article audit" on public.mavis_article_audit_events;
create policy "MAVIS admins can read article audit"
  on public.mavis_article_audit_events for select
  to authenticated
  using ((select public.is_site_admin()));

create or replace function mavis_intake_private_placeholder()
returns void
language sql
as $$ select; $$;
