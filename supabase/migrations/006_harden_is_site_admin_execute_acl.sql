-- Restrict the administrator predicate to authenticated application sessions.
-- Supabase default function privileges can grant EXECUTE directly to anon and service_role.
revoke all on function public.is_site_admin()
  from public, anon, service_role;

grant execute on function public.is_site_admin()
  to authenticated;
