# MAVIS Admin Authorization — Existing Database Audit

**Audit date:** 2026-11-14
**Scope:** Read-only source audit of the current `main` migrations and the admin helper included in the CMS preview branch.
**Database access:** No live database connection was used. Catalog ownership, effective grants, default privileges, and deployed migration state remain unverified.
**Change status:** Documentation only. No SQL migration, database mutation, or deployment.

## 1. Source evidence

### 1.1 `public.is_site_admin()` in migration 001

The checked-in migration defines the function as:

- SQL, `STABLE`, `SECURITY DEFINER`.
- `SET search_path = ''`.
- Reads `public.profiles` using `(select auth.uid())` and requires `role = 'admin'`.
- Revokes function privileges from `PUBLIC`.
- Grants function execution to `authenticated` only.

This is a reasonable minimal role-check pattern, provided the deployed function owner and grants match the migration and the profile role cannot be modified by untrusted actors.

### 1.2 `public.profiles` in migration 001

The migration creates `profiles(id, role, created_at)`, enables RLS, and adds a SELECT policy for the user's own profile or all profiles when the caller is an admin.

The checked-in migrations do not define an INSERT, UPDATE, or DELETE policy for `profiles`. This means those operations should be denied by RLS even if a SQL grant exists, but the effective grants and any out-of-band policies must be inspected in the deployed database.

There is no checked-in admin-provisioning flow in the inspected migration. Admin role assignment therefore appears to require a trusted out-of-band process; that process must be documented and access-controlled.

### 1.3 Application-side `requireAdmin()`

The CMS preview branch contains a fail-closed helper that:

- Catches client creation, claims retrieval, and admin RPC exceptions.
- Distinguishes missing configuration, unavailable authentication, signed-out state, and unavailable admin check.
- Treats the caller as an administrator only when the RPC has no error and returns exactly boolean `true`.

This is an improvement over the current `main` implementation, but it does not replace server-side authorization on every Route Handler and Server Action. The read-only catalog page itself must continue to call the helper on the server.

## 2. Risks and unresolved facts

| Item | Source-audit result | Required live verification |
|---|---|---|
| Function search_path | Empty in migration | Confirm deployed `proconfig` |
| Function SECURITY DEFINER | Enabled in migration | Confirm deployed `prosecdef` |
| Function owner | Not established by source | Confirm owner and role attributes |
| Function EXECUTE grants | PUBLIC revoked; authenticated granted | Inspect ACL, including anon/service_role |
| Profile RLS | Enabled; SELECT policy only in checked-in migrations | Inspect all deployed policies |
| Profile table grants | Not explicitly revoked/granted in migration 001 | Inspect table ACL and default privileges |
| Role provisioning | No in-repo controlled flow found in inspected migrations | Identify trusted admin provisioning procedure |
| Helper fail-closed behavior | Present on CMS preview branch | Test thrown errors and returned errors |
| All admin endpoints | Not exhaustively audited in this document | Inventory every Server Action and Route Handler |

Important distinction: a missing RLS policy does not revoke SQL privileges. Grants and RLS must both be inspected and tested. A SECURITY DEFINER function runs with its owner's privileges, so ownership is security-relevant.

## 3. Read-only SQL inspection pack

Run these queries only against a development/staging database first. They are SELECT-only and do not change database state.

### 3.1 Confirm migration state

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

### 3.2 Function owner, security mode, search_path, and ACL

```sql
select
  p.oid::regprocedure as function_name,
  r.rolname as owner,
  p.prosecdef as security_definer,
  p.provolatile as volatility,
  p.proconfig as function_settings,
  p.proacl as explicit_acl,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_roles r on r.oid = p.proowner
where p.oid = 'public.is_site_admin()'::regprocedure;
```

Expected source-aligned result: `security_definer = true`, `search_path = ""`, anon cannot execute, authenticated can execute. Review service_role explicitly rather than assuming its effective privileges.

### 3.3 Profile table owner, RLS, and effective grants

```sql
select
  c.oid::regclass as table_name,
  r.rolname as owner,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
  has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
  has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', c.oid, 'DELETE') as authenticated_delete,
  has_table_privilege('service_role', c.oid, 'UPDATE') as service_role_update
from pg_class c
join pg_roles r on r.oid = c.relowner
where c.oid = 'public.profiles'::regclass;
```

### 3.4 All profile policies

```sql
select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;
```

### 3.5 Default privileges for future public tables and functions

```sql
select
  coalesce(r.rolname, 'GLOBAL') as grantor,
  coalesce(n.nspname, 'ALL SCHEMAS') as schema_name,
  d.defaclobjtype as object_type,
  d.defaclacl as default_acl
from pg_default_acl d
left join pg_roles r on r.oid = d.defaclrole
left join pg_namespace n on n.oid = d.defaclnamespace
where d.defaclnamespace = 'public'::regnamespace
   or d.defaclnamespace = 0
order by schema_name, object_type;
```

### 3.6 Check all functions named like admin checks

```sql
select
  p.oid::regprocedure as function_name,
  r.rolname as owner,
  p.prosecdef as security_definer,
  p.proconfig,
  p.proacl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_roles r on r.oid = p.proowner
where n.nspname in ('public', 'mavis_private', 'mavis_cms_private')
  and (p.proname ilike '%admin%' or p.proname ilike '%role%')
order by n.nspname, p.proname;
```

## 4. Required negative authorization tests

Run against an isolated database with synthetic users. Do not test by changing the production administrator's role.

1. Anonymous caller: `is_site_admin()` cannot be invoked; no profile rows are readable unless an explicit public policy is intended.
2. Authenticated non-admin: function returns false; cannot read another user's profile; cannot insert, update, or delete profile rows.
3. Admin: function returns true; admin read access works as intended; profile role changes remain unavailable through the public client unless a separately audited provisioning path is explicitly designed.
4. Spoofing: supplying another user's UUID in request JSON or query parameters never changes the actor identity derived from `auth.uid()`.
5. Error behavior: if the RPC returns an error or throws, application authorization denies access.
6. Expired or invalid session: helper denies access; no cached previous admin state is reused.
7. Privilege regression: anon and authenticated cannot execute any unintended SECURITY DEFINER function.
8. Role escalation: no user-facing path can change their own `profiles.role` to `admin`.

## 5. CMS implementation gates

Do not create or apply the CMS migration until:

- The live SQL inspection results are captured and reviewed.
- The trusted admin-provisioning process is identified.
- Every admin Route Handler and Server Action is inventoried and tested.
- The CMS schema uses explicit grants and RLS for every exposed table.
- CMS state transitions are guarded by database functions and cannot be performed by direct status updates.
- pgTAP tests cover anon, non-admin, admin, and service_role behavior.
- The source rights and approval rules are agreed.
- Backup and restore verification is complete for the target database.

## 6. Official references

- Supabase Database Functions and SECURITY DEFINER: https://supabase.com/docs/guides/database/functions
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Securing the Data API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase pgTAP RLS testing: https://supabase.com/docs/guides/database/postgres/testing-row-level-security


## 7. pgTAP regression test added

A transaction-scoped test file now exists at:

`supabase/tests/001_profiles_admin_rls.test.sql`

It contains 12 assertions covering:

- RLS enabled on `public.profiles`.
- `is_site_admin()` SECURITY DEFINER and empty `search_path`.
- Effective EXECUTE privileges for anon, authenticated, and service_role.
- Absence of profile INSERT/UPDATE/DELETE/ALL policies.
- Editor cannot be identified as an administrator and sees only their own profile.
- Administrator is identified correctly and can read both seeded profiles.
- Anonymous role cannot read the seeded profiles.

The test inserts synthetic users and profiles inside a transaction and rolls everything back.

### Execution status and command

The repository currently has no `supabase/config.toml` and no database-test workflow. Therefore the SQL test has been added but **has not been executed** against PostgreSQL. Do not treat it as a passing database test.

After initializing/configuring a local Supabase stack in an isolated development workspace, run:

```sh
supabase start
supabase test db
```

Review the output for the specific file and `Result: PASS`. Do not run `supabase db reset` against any shared or production database; it recreates the local database and can destroy its data.

The test intentionally does not mutate any existing migration or production database. If it exposes a missing table grant or policy mismatch, inspect the failure first; do not weaken the test or add broad grants merely to make it pass.
