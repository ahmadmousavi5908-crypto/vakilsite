-- RLS filters rows, but it does not restrict table-wide privileges such as TRUNCATE.
-- Replace broad grants with only the operations used by the application.
revoke all privileges on table public.social_links from public, anon, authenticated;

grant select on table public.social_links to anon, authenticated;
grant insert, update, delete on table public.social_links to authenticated;
