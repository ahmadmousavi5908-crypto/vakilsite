begin;
select plan(33);

select has_table('public', 'mavis_search_console_connections', 'Search Console connection storage exists');
select ok((select relrowsecurity from pg_class where oid='public.mavis_search_console_connections'::regclass), 'connection storage has RLS enabled');
select ok(not has_table_privilege('authenticated','public.mavis_search_console_connections','SELECT'), 'authenticated users cannot directly read connection ciphertext');
select ok(not has_table_privilege('anon','public.mavis_search_console_connections','SELECT'), 'anonymous users cannot read connection ciphertext');
select ok(not has_table_privilege('service_role','public.mavis_search_console_connections','SELECT'), 'service role has no direct table read grant');

select has_function('public','store_mavis_search_console_connection',array['text','text'],'connection store RPC exists');
select has_function('public','get_mavis_search_console_connection',array[]::text[],'connection read RPC exists');
select has_function('public','disconnect_mavis_search_console',array[]::text[],'connection disconnect RPC exists');

select ok((select prosecdef from pg_proc where oid='public.store_mavis_search_console_connection(text,text)'::regprocedure),'store RPC is SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.store_mavis_search_console_connection(text,text)'::regprocedure),'store RPC has empty search_path');
select ok((select prosecdef from pg_proc where oid='public.get_mavis_search_console_connection()'::regprocedure),'read RPC is SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.get_mavis_search_console_connection()'::regprocedure),'read RPC has empty search_path');
select ok((select prosecdef from pg_proc where oid='public.disconnect_mavis_search_console()'::regprocedure),'disconnect RPC is SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.disconnect_mavis_search_console()'::regprocedure),'disconnect RPC has empty search_path');

select ok(has_function_privilege('authenticated','public.store_mavis_search_console_connection(text,text)','EXECUTE'),'authenticated can invoke guarded store RPC');
select ok(has_function_privilege('authenticated','public.get_mavis_search_console_connection()','EXECUTE'),'authenticated can invoke guarded read RPC');
select ok(has_function_privilege('authenticated','public.disconnect_mavis_search_console()','EXECUTE'),'authenticated can invoke guarded disconnect RPC');
select ok(not has_function_privilege('anon','public.store_mavis_search_console_connection(text,text)','EXECUTE'),'anon cannot store credentials');
select ok(not has_function_privilege('anon','public.get_mavis_search_console_connection()','EXECUTE'),'anon cannot read credentials');
select ok(not has_function_privilege('anon','public.disconnect_mavis_search_console()','EXECUTE'),'anon cannot disconnect');
select ok(not has_function_privilege('service_role','public.store_mavis_search_console_connection(text,text)','EXECUTE'),'service role cannot store credentials through RPC');
select ok(not has_function_privilege('service_role','public.get_mavis_search_console_connection()','EXECUTE'),'service role cannot read credentials through RPC');
select ok(not has_function_privilege('service_role','public.disconnect_mavis_search_console()','EXECUTE'),'service role cannot disconnect through RPC');

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
('00000000-0000-4000-8000-000000000081','authenticated','authenticated','gsc-editor@example.invalid','',now(),now(),now()),
('00000000-0000-4000-8000-000000000082','authenticated','authenticated','gsc-admin@example.invalid','',now(),now(),now());
insert into public.profiles (id,role)
values
('00000000-0000-4000-8000-000000000081','editor'),
('00000000-0000-4000-8000-000000000082','admin');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000081';
select throws_ok(
  $$select public.store_mavis_search_console_connection('v1.aaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbb.cccccccccccccccc','https://vakilahmadmousavi.ir/')$$,
  '42501','Administrator access required','non-admin editor cannot store credentials'
);
select throws_ok(
  $$select public.get_mavis_search_console_connection()$$,
  '42501','Administrator access required','non-admin editor cannot read credentials'
);
select throws_ok(
  $$select public.disconnect_mavis_search_console()$$,
  '42501','Administrator access required','non-admin editor cannot disconnect'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000082';
select throws_ok(
  $$select public.store_mavis_search_console_connection('plaintext-refresh-token-value','https://vakilahmadmousavi.ir/')$$,
  '22023','Encrypted refresh token is invalid','store RPC rejects plaintext refresh tokens'
);
select is(
  (public.store_mavis_search_console_connection(
    'v1.aaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbb.cccccccccccccccc',
    'https://vakilahmadmousavi.ir/'
  )->>'connected')::boolean,
  true,
  'administrator can store encrypted credentials'
);
select is(
  public.get_mavis_search_console_connection()->>'encryptedRefreshToken',
  'v1.aaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbb.cccccccccccccccc',
  'admin read RPC returns the stored ciphertext for server-side decryption'
);
select is(
  public.get_mavis_search_console_connection()->>'siteUrl',
  'https://vakilahmadmousavi.ir/',
  'admin read RPC returns the configured Search Console property'
);
select is(
  (public.disconnect_mavis_search_console()->>'connected')::boolean,
  false,
  'administrator can disconnect Search Console'
);
select is(
  public.get_mavis_search_console_connection(),
  null::jsonb,
  'disconnect removes the stored credential record'
);

select * from finish();
rollback;
