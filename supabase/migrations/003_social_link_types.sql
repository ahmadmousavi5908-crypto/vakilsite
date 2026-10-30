-- Separate direct contact methods from social/community channels.
alter table public.social_links
  add column if not exists link_type text not null default 'social';

alter table public.social_links
  drop constraint if exists social_links_link_type_check;

alter table public.social_links
  add constraint social_links_link_type_check
  check (link_type in ('contact', 'social'));

create index if not exists social_links_type_active_order_idx
  on public.social_links (link_type, is_active, sort_order);
