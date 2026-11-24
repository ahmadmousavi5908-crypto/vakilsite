-- Event-trigger functions are invoked by PostgreSQL's event-trigger mechanism, not by application roles.
-- Keep the RLS automation trigger active while removing unnecessary direct EXECUTE grants.
revoke all on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;
