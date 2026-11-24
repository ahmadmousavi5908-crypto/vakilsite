-- Event-trigger functions are invoked by PostgreSQL's event-trigger mechanism, not by application roles.
-- Keep the RLS automation trigger active while removing unnecessary direct EXECUTE grants.
REVOKE ALL ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated, service_role;
