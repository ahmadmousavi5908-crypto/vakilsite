create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text not null,
  url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_links_platform_length check (char_length(platform) between 2 and 40),
  constraint social_links_label_length check (char_length(label) between 2 and 60),
  constraint social_links_url_length check (char_length(url) between 8 and 500)
);

create index if not exists social_links_active_order_idx
  on public.social_links (is_active, sort_order);

alter table public.profiles enable row level security;
alter table public.social_links enable row level security;

drop policy if exists "Admins can view profiles" on public.profiles;
create policy "Admins can view profiles"
  on public.profiles for select
  to authenticated
  using (public.is_site_admin() or id = (select auth.uid()));

drop policy if exists "Public can read active social links" on public.social_links;
create policy "Public can read active social links"
  on public.social_links for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can manage social links" on public.social_links;
create policy "Admins can manage social links"
  on public.social_links for all
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

grant select on public.social_links to anon, authenticated;
grant all on public.social_links to authenticated;
