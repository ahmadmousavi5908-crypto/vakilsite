begin;

select plan(12);

select ok(
  has_table_privilege('authenticated', 'public.social_links', 'SELECT'),
  'authenticated can read social links subject to RLS'
);
select ok(
  has_table_privilege('authenticated', 'public.social_links', 'INSERT'),
  'authenticated has the insert privilege required by the admin policy'
);
select ok(
  has_table_privilege('authenticated', 'public.social_links', 'UPDATE'),
  'authenticated has the update privilege required by the admin policy'
);
select ok(
  has_table_privilege('authenticated', 'public.social_links', 'DELETE'),
  'authenticated has the delete privilege required by the admin policy'
);
select ok(
  not has_table_privilege('authenticated', 'public.social_links', 'TRUNCATE'),
  'authenticated cannot truncate social links outside row policies'
);
select ok(
  not has_table_privilege('authenticated', 'public.social_links', 'REFERENCES'),
  'authenticated cannot create foreign keys referencing social links'
);
select ok(
  not has_table_privilege('authenticated', 'public.social_links', 'TRIGGER'),
  'authenticated cannot attach triggers to social links'
);
select ok(
  has_table_privilege('anon', 'public.social_links', 'SELECT'),
  'anonymous visitors can read active social links subject to RLS'
);
select ok(
  not has_table_privilege('anon', 'public.social_links', 'INSERT'),
  'anonymous visitors cannot insert social links'
);
select ok(
  not has_table_privilege('anon', 'public.social_links', 'UPDATE'),
  'anonymous visitors cannot update social links'
);
select ok(
  not has_table_privilege('anon', 'public.social_links', 'DELETE'),
  'anonymous visitors cannot delete social links'
);
select ok(
  not has_table_privilege('anon', 'public.social_links', 'TRUNCATE'),
  'anonymous visitors cannot truncate social links'
);

select * from finish();

rollback;
