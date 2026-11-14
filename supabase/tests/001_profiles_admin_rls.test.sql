begin;

select plan(14);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has row-level security enabled'
);

select ok(
  (select prosecdef from pg_proc where oid = 'public.is_site_admin()'::regprocedure),
  'is_site_admin runs as SECURITY DEFINER'
);

select ok(
  (select coalesce(proconfig @> array['search_path=""'], false)
   from pg_proc
   where oid = 'public.is_site_admin()'::regprocedure),
  'is_site_admin uses an empty search_path'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.is_site_admin()'::regprocedure
      and acl.grantee = 'anon'::regrole
      and acl.privilege_type = 'EXECUTE'
  ),
  'anonymous role has no direct EXECUTE grant on is_site_admin'
);

select ok(
  has_function_privilege('authenticated', 'public.is_site_admin()', 'EXECUTE'),
  'authenticated role can execute is_site_admin'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.is_site_admin()'::regprocedure
      and acl.grantee = 'service_role'::regrole
      and acl.privilege_type = 'EXECUTE'
  ),
  'service_role has no direct EXECUTE grant on is_site_admin'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.is_site_admin()'::regprocedure
      and acl.grantee = 0::oid
      and acl.privilege_type = 'EXECUTE'
  ),
  'is_site_admin is not executable through the PUBLIC pseudo-role'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ),
  'profiles has no insert, update, delete, or all-operation RLS policy'
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'mavis-editor-test@example.invalid',
    '',
    now(),
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'mavis-admin-test@example.invalid',
    '',
    now(),
    now(),
    now()
  );

insert into public.profiles (id, role)
values
  ('00000000-0000-4000-8000-000000000001', 'editor'),
  ('00000000-0000-4000-8000-000000000002', 'admin');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';

select is(
  public.is_site_admin(),
  false,
  'authenticated editor is not recognized as a site administrator'
);

select results_eq(
  $$select count(*)::bigint
    from public.profiles
    where id in (
      '00000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000002'::uuid
    )$$,
  array[1::bigint],
  'editor can see only the editor profile and cannot read the admin profile'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';

select is(
  public.is_site_admin(),
  true,
  'the seeded administrator is recognized as a site administrator'
);

select results_eq(
  $$select role
    from public.profiles
    where id in (
      '00000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000002'::uuid
    )
    order by role$$,
  array['admin', 'editor']::text[],
  'administrator can read both seeded profiles'
);

reset role;
set local role anon;
reset request.jwt.claim.sub;

select is(
  public.is_site_admin(),
  false,
  'anonymous request context never satisfies the administrator predicate'
);

select results_eq(
  $$select count(*)::bigint
    from public.profiles
    where id in (
      '00000000-0000-4000-8000-000000000001'::uuid,
      '00000000-0000-4000-8000-000000000002'::uuid
    )$$,
  array[0::bigint],
  'anonymous role cannot read either profile'
);

select * from finish();

rollback;
