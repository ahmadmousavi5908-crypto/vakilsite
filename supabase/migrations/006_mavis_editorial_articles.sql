-- Versioned editorial content for the MAVIS admin workspace.
-- Draft edits never overwrite the currently published snapshot.

create table if not exists public.mavis_editorial_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 120),
  draft_content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(draft_content) = 'object'),
  published_content jsonb
    check (published_content is null or jsonb_typeof(published_content) = 'object'),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  legal_review_status text not null default 'pending'
    check (legal_review_status in ('pending', 'approved', 'changes_requested')),
  author_name text not null default '',
  reviewer_name text not null default '',
  is_indexable boolean not null default false,
  last_legal_review_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  draft_updated_at timestamptz not null default now(),
  constraint mavis_editorial_published_snapshot_check
    check (status <> 'published' or published_content is not null)
);

create index if not exists mavis_editorial_status_updated_idx
  on public.mavis_editorial_articles (status, updated_at desc);

create index if not exists mavis_editorial_published_idx
  on public.mavis_editorial_articles (published_at desc)
  where status = 'published' and published_content is not null;

alter table public.mavis_editorial_articles enable row level security;

revoke all on table public.mavis_editorial_articles from public, anon, authenticated;
grant select, insert, update, delete on table public.mavis_editorial_articles to authenticated;

drop policy if exists "Admins can read all MAVIS articles" on public.mavis_editorial_articles;
create policy "Admins can read all MAVIS articles"
  on public.mavis_editorial_articles
  for select
  to authenticated
  using (public.is_site_admin());

drop policy if exists "Admins can create MAVIS articles" on public.mavis_editorial_articles;
create policy "Admins can create MAVIS articles"
  on public.mavis_editorial_articles
  for insert
  to authenticated
  with check (public.is_site_admin() and (created_by is null or created_by = auth.uid()));

drop policy if exists "Admins can update MAVIS articles" on public.mavis_editorial_articles;
create policy "Admins can update MAVIS articles"
  on public.mavis_editorial_articles
  for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

drop policy if exists "Admins can delete MAVIS articles" on public.mavis_editorial_articles;
create policy "Admins can delete MAVIS articles"
  on public.mavis_editorial_articles
  for delete
  to authenticated
  using (public.is_site_admin());

comment on table public.mavis_editorial_articles is
  'Versioned editorial CMS. draft_content is private; only published_content is exposed by the public RLS policy.';

-- Public article delivery is exposed through a narrow SECURITY DEFINER function.
-- Anonymous and ordinary authenticated users cannot query draft columns on the base table.
create or replace function public.get_mavis_published_articles()
returns table (
  slug text,
  published_content jsonb,
  is_indexable boolean,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    article.slug,
    article.published_content,
    article.is_indexable,
    article.published_at,
    article.updated_at
  from public.mavis_editorial_articles as article
  where article.status = 'published'
    and article.published_content is not null
  order by article.published_at desc nulls last;
$function$;

revoke all on function public.get_mavis_published_articles()
  from public, anon, authenticated;
grant execute on function public.get_mavis_published_articles()
  to anon, authenticated;
