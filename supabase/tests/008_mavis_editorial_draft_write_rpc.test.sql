begin;

select plan(19);

select has_function('public', 'save_mavis_article_draft', array['jsonb', 'uuid', 'integer', 'text'], 'guarded draft save function exists');

select ok(
  (select prosecdef from pg_proc where oid = 'public.save_mavis_article_draft(jsonb,uuid,integer,text)'::regprocedure),
  'draft save function is SECURITY DEFINER'
);

select ok(
  (select coalesce(proconfig @> array['search_path=""'], false)
   from pg_proc
   where oid = 'public.save_mavis_article_draft(jsonb,uuid,integer,text)'::regprocedure),
  'draft save function uses an empty search_path'
);

select ok(
  has_function_privilege('authenticated', 'public.save_mavis_article_draft(jsonb,uuid,integer,text)', 'EXECUTE'),
  'authenticated role can invoke guarded draft save'
);

select ok(
  not has_function_privilege('anon', 'public.save_mavis_article_draft(jsonb,uuid,integer,text)', 'EXECUTE'),
  'anonymous role cannot invoke draft save'
);

select ok(
  not has_function_privilege('service_role', 'public.save_mavis_article_draft(jsonb,uuid,integer,text)', 'EXECUTE'),
  'service role cannot invoke draft save'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.save_mavis_article_draft(jsonb,uuid,integer,text)'::regprocedure
      and acl.grantee = 0::oid
      and acl.privilege_type = 'EXECUTE'
  ),
  'PUBLIC has no direct EXECUTE grant on draft save'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000041', 'authenticated', 'authenticated', 'cms-editor-write@example.invalid', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000042', 'authenticated', 'authenticated', 'cms-admin-write@example.invalid', '', now(), now(), now());

insert into public.profiles (id, role)
values
  ('00000000-0000-4000-8000-000000000041', 'editor'),
  ('00000000-0000-4000-8000-000000000042', 'admin');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000041';

select throws_ok(
  $$select public.save_mavis_article_draft(
    '{"slug":"secure-draft-test","title":"Secure draft test","excerpt":"A sufficiently long excerpt for this test.","category":"Test","tags":[],"content":{"intro":"A sufficiently long introduction for this test.","sections":[{"heading":"A heading","body":"A sufficiently long section body for this test."}]}}'::jsonb
  )$$,
  '42501',
  'Administrator access required',
  'non-admin editor cannot create a draft'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000042';

select is(
  public.save_mavis_article_draft(
    '{"slug":"secure-draft-test","title":"Secure draft test","author_name":"Editorial Team","excerpt":"A sufficiently long excerpt for this test.","category":"Test","tags":["test"],"content":{"intro":"A sufficiently long introduction for this test.","sections":[{"heading":"A heading","body":"A sufficiently long section body for this test."}]}}'::jsonb
  ) is not null,
  true,
  'administrator can create a draft'
);

select is(
  (select status from public.mavis_articles where slug = 'secure-draft-test'),
  'draft',
  'new article is always created as draft'
);

select is(
  (select current_version from public.mavis_articles where slug = 'secure-draft-test'),
  1,
  'new article starts at version one'
);

select is(
  (select count(*)::integer from public.mavis_article_versions v
   join public.mavis_articles a on a.id = v.article_id
   where a.slug = 'secure-draft-test' and v.version = 1),
  1,
  'creating a draft writes its immutable version snapshot'
);

select is(
  (select count(*)::integer from public.mavis_article_audit_events e
   join public.mavis_articles a on a.id = e.article_id
   where a.slug = 'secure-draft-test' and e.event_type = 'article_created'),
  1,
  'creating a draft writes an audit event'
);

select is(
  public.save_mavis_article_draft(
    '{"slug":"secure-draft-test","title":"Secure draft test updated","excerpt":"A sufficiently long updated excerpt for this test.","category":"Test","tags":["test","updated"],"content":{"intro":"A sufficiently long updated introduction for this test.","sections":[{"heading":"Updated heading","body":"A sufficiently long updated section body for this test."}]}}'::jsonb,
    (select id from public.mavis_articles where slug = 'secure-draft-test'),
    1,
    'Update draft'
  ),
  (select id from public.mavis_articles where slug = 'secure-draft-test'),
  'administrator can update the expected draft version'
);

select is(
  (select current_version from public.mavis_articles where slug = 'secure-draft-test'),
  2,
  'updating increments the article version'
);

select is(
  (select count(*)::integer from public.mavis_article_versions v
   join public.mavis_articles a on a.id = v.article_id
   where a.slug = 'secure-draft-test'),
  2,
  'updating preserves both immutable snapshots'
);

select throws_ok(
  $$select public.save_mavis_article_draft(
    '{"slug":"secure-draft-test","title":"Stale update","excerpt":"A sufficiently long updated excerpt for this test.","category":"Test","tags":[],"content":{"intro":"A sufficiently long updated introduction for this test.","sections":[{"heading":"Heading","body":"A sufficiently long section body for this test."}]}}'::jsonb,
    (select id from public.mavis_articles where slug = 'secure-draft-test'),
    1,
    'Stale update'
  )$$,
  '40001',
  'Article version conflict; reload before saving',
  'stale editor cannot overwrite a newer article version'
);

select throws_ok(
  $$select public.save_mavis_article_draft(
    '{"slug":"invalid-draft-test","title":"Invalid draft test","excerpt":"A sufficiently long excerpt for this test.","category":"Test","tags":[],"content":{"intro":"A sufficiently long introduction for this test.","sections":[]}}'::jsonb
  )$$,
  '22023',
  'Invalid structured article content',
  'empty article sections are rejected'
);

select throws_ok(
  $select public.save_mavis_article_draft(
    '{"slug":"missing-tags-test","title":"Missing tags test","excerpt":"A sufficiently long excerpt for this test.","category":"Test","content":{"intro":"A sufficiently long introduction for this test.","sections":[{"heading":"Heading","body":"A sufficiently long section body for this test."}]}}'::jsonb
  )$,
  '22023',
  'Article tags must be an array of at most 40 items',
  'missing required tags are rejected instead of being silently accepted'
);

select * from finish();

rollback;
