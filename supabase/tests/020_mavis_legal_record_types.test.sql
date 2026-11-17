begin;

select plan(9);

select has_function(
  'public',
  'save_mavis_article_draft',
  array['jsonb', 'uuid', 'integer', 'text'],
  'the guarded draft RPC remains available after legal record extension'
);

select ok(
  has_function_privilege('authenticated', 'public.save_mavis_article_draft(jsonb,uuid,integer,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.save_mavis_article_draft(jsonb,uuid,integer,text)', 'EXECUTE'),
  'legal record extension preserves administrator-only RPC grants'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-000000000042',
  'authenticated',
  'authenticated',
  'cms-admin-legal-record@example.invalid',
  '',
  now(),
  now(),
  now()
);

insert into public.profiles (id, role)
values ('00000000-0000-4000-8000-000000000042', 'admin');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000042';

select is(
  public.save_mavis_article_draft(
    '{
      "slug": "legal-record-type-test",
      "title": "قانون نمونه برای آزمون",
      "excerpt": "خلاصه کافی برای آزمون ثبت نوع مدرک حقوقی.",
      "category": "حقوق عمومی",
      "tags": ["قانون"],
      "content": {
        "intro": "مقدمه کافی برای آزمون ثبت مدرک حقوقی.",
        "sections": [{"heading": "ماده نخست", "body": "متن کافی برای آزمون ذخیره بخش قانونی."}],
        "record_type": "law",
        "legal_metadata": {
          "document_number": "۱۲۳",
          "issuing_authority": "مرجع رسمی",
          "document_date": "2026-01-15",
          "validity_status": "unknown"
        }
      }
    }'::jsonb
  ) is not null,
  true,
  'administrator can save a typed legal record with structured metadata'
);

select is(
  (select content->>'record_type' from public.mavis_editorial_articles where slug = 'legal-record-type-test'),
  'law',
  'legal record type is persisted on the article'
);

select is(
  (select content->'legal_metadata'->>'document_number' from public.mavis_editorial_articles where slug = 'legal-record-type-test'),
  '۱۲۳',
  'legal metadata is persisted with the article'
);

select is(
  (select snapshot->'content'->>'record_type'
   from public.mavis_article_versions version
   join public.mavis_editorial_articles article on article.id = version.article_id
   where article.slug = 'legal-record-type-test' and version.version = 1),
  'law',
  'legal record type is included in the immutable version snapshot'
);

select throws_ok(
  $$select public.save_mavis_article_draft(
    '{"slug":"invalid-legal-type","title":"Invalid legal type","excerpt":"A sufficiently long excerpt for this test.","category":"Test","tags":[],"content":{"intro":"A sufficiently long introduction for this test.","sections":[{"heading":"Heading","body":"A sufficiently long section body for this test."}],"record_type":"made_up","legal_metadata":{"validity_status":"unknown"}}}'::jsonb
  )$$,
  '22023',
  'Invalid legal record type',
  'unsupported legal record types are rejected'
);

select throws_ok(
  $$select public.save_mavis_article_draft(
    '{"slug":"invalid-legal-date","title":"Invalid legal date","excerpt":"A sufficiently long excerpt for this test.","category":"Test","tags":[],"content":{"intro":"A sufficiently long introduction for this test.","sections":[{"heading":"Heading","body":"A sufficiently long section body for this test."}],"record_type":"law","legal_metadata":{"validity_status":"unknown","document_date":"1405/01/01"}}}'::jsonb
  )$$,
  '22023',
  'Invalid legal metadata date',
  'malformed legal dates are rejected by the database'
);

select throws_ok(
  $$select public.save_mavis_article_draft(
    '{"slug":"invalid-legal-status","title":"Invalid legal status","excerpt":"A sufficiently long excerpt for this test.","category":"Test","tags":[],"content":{"intro":"A sufficiently long introduction for this test.","sections":[{"heading":"Heading","body":"A sufficiently long section body for this test."}],"record_type":"law","legal_metadata":{"validity_status":"guessed"}}}'::jsonb
  )$$,
  '22023',
  'Invalid legal validity status',
  'unrecognized legal validity statuses are rejected'
);

select * from finish();

rollback;
