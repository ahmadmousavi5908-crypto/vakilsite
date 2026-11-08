-- MAVIS editorial CMS: versioned article content with public published-only reads.
create schema if not exists mavis_cms_private;
revoke all on schema mavis_cms_private from public, anon, authenticated, service_role;

create table if not exists public.mavis_articles (
  id uuid primary key default pg_catalog.gen_random_uuid(),
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
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint mavis_articles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint mavis_articles_title_length check (char_length(title) between 3 and 180),
  constraint mavis_articles_excerpt_length check (char_length(excerpt) between 20 and 500),
  constraint mavis_articles_category_length check (char_length(category) between 2 and 80),
  constraint mavis_articles_read_time check (read_time between 1 and 120),
  constraint mavis_articles_seo_title_length check (seo_title is null or char_length(seo_title) <= 180),
  constraint mavis_articles_seo_description_length check (seo_description is null or char_length(seo_description) <= 320),
  constraint mavis_articles_content_object check (pg_catalog.jsonb_typeof(content) = 'object'),
  constraint mavis_articles_sections_array check (pg_catalog.jsonb_typeof(content -> 'sections') = 'array'),
  constraint mavis_articles_checklist_array check (pg_catalog.jsonb_typeof(content -> 'checklist') = 'array'),
  constraint mavis_articles_sources_array check (pg_catalog.jsonb_typeof(content -> 'sources') = 'array'),
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
  created_at timestamptz not null default pg_catalog.now(),
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
  created_at timestamptz not null default pg_catalog.now(),
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

create or replace function mavis_cms_private.prepare_article_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.version := 1;
    new.created_at := coalesce(new.created_at, pg_catalog.now());
    new.updated_at := pg_catalog.now();
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    if new.status = 'published' then
      new.published_at := coalesce(new.published_at, pg_catalog.now());
      new.approved_at := coalesce(new.approved_at, pg_catalog.now());
      new.approved_by := auth.uid();
    end if;
    return new;
  end if;

  new.version := old.version + 1;
  new.created_at := old.created_at;
  new.created_by := old.created_by;
  new.updated_at := pg_catalog.now();
  new.updated_by := auth.uid();

  if new.status = 'published' and old.status <> 'published' then
    new.published_at := pg_catalog.now();
    new.approved_at := pg_catalog.now();
    new.approved_by := auth.uid();
  elsif new.status <> 'published' and old.status = 'published' then
    new.published_at := null;
  end if;

  return new;
end;
$$;
revoke all on function mavis_cms_private.prepare_article_write() from public, anon, authenticated, service_role;

create or replace function mavis_cms_private.record_article_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_type text;
  v_old_status text;
begin
  if tg_op = 'INSERT' then
    v_event_type := 'created';
    v_old_status := null;
  else
    v_old_status := old.status;
    if new.status = 'published' and old.status <> 'published' then
      v_event_type := 'published';
    elsif new.status = 'archived' and old.status <> 'archived' then
      v_event_type := 'archived';
    elsif new.status = 'review' and old.status <> 'review' then
      v_event_type := 'submitted_for_review';
    elsif new.status is distinct from old.status then
      v_event_type := 'status_changed';
    else
      v_event_type := 'content_updated';
    end if;
  end if;

  insert into public.mavis_article_versions (
    article_id, version, snapshot, change_note, actor_id
  ) values (
    new.id,
    new.version,
    pg_catalog.jsonb_build_object(
      'slug', new.slug,
      'title', new.title,
      'excerpt', new.excerpt,
      'category', new.category,
      'read_time', new.read_time,
      'content', new.content,
      'seo_title', new.seo_title,
      'seo_description', new.seo_description,
      'status', new.status,
      'published_at', new.published_at
    ),
    new.last_change_note,
    auth.uid()
  );

  insert into public.mavis_article_audit_events (
    article_id, actor_id, event_type, old_status, new_status, article_version, metadata
  ) values (
    new.id,
    auth.uid(),
    v_event_type,
    v_old_status,
    new.status,
    new.version,
    pg_catalog.jsonb_build_object('source_origin', new.source_origin)
  );

  return new;
end;
$$;
revoke all on function mavis_cms_private.record_article_version() from public, anon, authenticated, service_role;

drop trigger if exists mavis_articles_prepare_write on public.mavis_articles;
create trigger mavis_articles_prepare_write
before insert or update on public.mavis_articles
for each row execute function mavis_cms_private.prepare_article_write();

drop trigger if exists mavis_articles_record_version on public.mavis_articles;
create trigger mavis_articles_record_version
after insert or update on public.mavis_articles
for each row execute function mavis_cms_private.record_article_version();
