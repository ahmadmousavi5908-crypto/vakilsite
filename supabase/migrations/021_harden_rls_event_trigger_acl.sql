-- Event-trigger functions are invoked by PostgreSQL's event-trigger mechanism, not by application roles.
-- Some isolated local Supabase test stacks do not install this project-level event trigger.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role';
  end if;
end;
$$;
