begin;

select plan(15);

select has_column('public', 'mavis_sources', 'metadata', 'source metadata is stored in a structured private column');
select has_table('mavis_private', 'editorial_ai_rate_limits', 'editorial AI usage has a dedicated private rate-limit table');
select has_trigger('public', 'mavis_editorial_articles', 'mavis_article_sources_content_sync', 'source links are synchronized into versioned article content');

select has_function(
  'public',
  'attach_mavis_source_to_article',
  array['uuid', 'integer', 'uuid', 'text', 'text'],
  'existing sources can be attached through a guarded RPC'
);
select has_function(
  'public',
  'add_mavis_manual_article_source',
  array['uuid', 'integer', 'jsonb', 'text'],
  'manual HTTPS sources can be registered through a guarded RPC'
);
select has_function(
  'public',
  'consume_mavis_editorial_ai_limit',
  array[]::text[],
  'editorial AI calls use a server-side rate-limit RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.attach_mavis_source_to_article(uuid,integer,uuid,text,text)', 'EXECUTE'),
  'authenticated callers can invoke source attachment RPCs'
);
select ok(
  not has_function_privilege('anon', 'public.attach_mavis_source_to_article(uuid,integer,uuid,text,text)', 'EXECUTE'),
  'anonymous callers cannot attach sources'
);
select ok(
  has_function_privilege('authenticated', 'public.add_mavis_manual_article_source(uuid,integer,jsonb,text)', 'EXECUTE'),
  'authenticated callers can invoke manual source registration'
);
select ok(
  not has_function_privilege('anon', 'public.add_mavis_manual_article_source(uuid,integer,jsonb,text)', 'EXECUTE'),
  'anonymous callers cannot register manual sources'
);
select ok(
  has_function_privilege('authenticated', 'public.consume_mavis_editorial_ai_limit()', 'EXECUTE'),
  'authenticated callers can request a guarded AI rate-limit check'
);
select ok(
  not has_function_privilege('anon', 'public.consume_mavis_editorial_ai_limit()', 'EXECUTE'),
  'anonymous callers cannot consume editorial AI quota'
);
select ok(
  not has_column_privilege('anon', 'public.mavis_sources', 'metadata', 'SELECT'),
  'private source metadata is not directly readable by anonymous visitors'
);
select ok(
  not has_table_privilege('authenticated', 'mavis_private.editorial_ai_rate_limits', 'SELECT'),
  'authenticated users cannot read raw AI rate-limit records'
);
select ok(
  not has_table_privilege('anon', 'mavis_private.editorial_ai_rate_limits', 'SELECT'),
  'anonymous users cannot read raw AI rate-limit records'
);

select * from finish();
rollback;
