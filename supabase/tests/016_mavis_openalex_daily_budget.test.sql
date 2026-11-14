begin;
select plan(15);

select has_table('public','mavis_provider_usage_daily','provider daily usage ledger exists');
select ok((select relrowsecurity from pg_class where oid='public.mavis_provider_usage_daily'::regclass),'provider usage ledger has RLS enabled');
select ok(not has_table_privilege('anon','public.mavis_provider_usage_daily','SELECT'),'anonymous users cannot read provider usage');
select ok(not has_table_privilege('authenticated','public.mavis_provider_usage_daily','SELECT'),'authenticated users cannot read provider usage directly');
select has_function('public','consume_mavis_openalex_daily_budget',array[]::text[],'OpenAlex budget reservation RPC exists');
select ok((select prosecdef from pg_proc where oid='public.consume_mavis_openalex_daily_budget()'::regprocedure),'budget RPC is SECURITY DEFINER');
select ok((select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid='public.consume_mavis_openalex_daily_budget()'::regprocedure),'budget RPC has empty search_path');
select ok(has_function_privilege('authenticated','public.consume_mavis_openalex_daily_budget()','EXECUTE'),'authenticated can invoke guarded budget RPC');
select ok(not has_function_privilege('anon','public.consume_mavis_openalex_daily_budget()','EXECUTE'),'anonymous users cannot reserve provider budget');
select ok(not has_function_privilege('service_role','public.consume_mavis_openalex_daily_budget()','EXECUTE'),'service role cannot reserve provider budget');

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values ('00000000-0000-4000-8000-000000000083','authenticated','authenticated','openalex-budget-admin@example.invalid','',now(),now(),now());
insert into public.profiles (id,role)
values ('00000000-0000-4000-8000-000000000083','admin');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000083';

select is((public.consume_mavis_openalex_daily_budget()->>'allowed')::boolean,true,'administrator can reserve the first OpenAlex request');
select is((
  select count(*)::integer
  from generate_series(1,49)
  where (public.consume_mavis_openalex_daily_budget()->>'allowed')::boolean
),49,'shared budget allows the remaining 49 requests within the daily ceiling');
select is((public.consume_mavis_openalex_daily_budget()->>'allowed')::boolean,false,'the 51st request is rejected before upstream usage');
select is((select request_count from public.mavis_provider_usage_daily where provider='openalex'),50,'daily ledger records exactly 50 reserved requests');
select is((select reserved_usd from public.mavis_provider_usage_daily where provider='openalex'),0.0500::numeric,'daily ledger never exceeds USD 0.05');

select * from finish();
rollback;
