-- Enforce a shared UTC daily spend ceiling before each OpenAlex search.
-- OpenAlex text search costs USD 0.001 per request under the published pricing.
create table if not exists public.mavis_provider_usage_daily (
  provider text not null check (provider in ('openalex')),
  usage_date date not null,
  request_count integer not null default 0 check (request_count between 0 and 50),
  reserved_usd numeric(10, 4) not null default 0 check (reserved_usd between 0 and 0.0500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider, usage_date)
);

alter table public.mavis_provider_usage_daily enable row level security;
revoke all on public.mavis_provider_usage_daily from public, anon, authenticated, service_role;

create or replace function public.consume_mavis_openalex_daily_budget()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_date date := (now() at time zone 'UTC')::date;
  v_count integer;
  v_spend numeric(10,4);
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode='42501', message='Administrator access required';
  end if;

  insert into public.mavis_provider_usage_daily(provider, usage_date, request_count, reserved_usd)
  values ('openalex', v_date, 1, 0.0010)
  on conflict (provider, usage_date) do update
    set request_count = public.mavis_provider_usage_daily.request_count + 1,
        reserved_usd = public.mavis_provider_usage_daily.reserved_usd + 0.0010,
        updated_at = now()
    where public.mavis_provider_usage_daily.reserved_usd + 0.0010 <= 0.0500
  returning request_count, reserved_usd into v_count, v_spend;

  if not found then
    select request_count, reserved_usd into v_count, v_spend
    from public.mavis_provider_usage_daily
    where provider='openalex' and usage_date=v_date;
    return jsonb_build_object(
      'allowed', false,
      'request_count', coalesce(v_count,0),
      'reserved_usd', coalesce(v_spend,0),
      'daily_limit_usd', 0.0500,
      'reset_at', (v_date + 1)::text || 'T00:00:00Z'
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'request_count', v_count,
    'reserved_usd', v_spend,
    'daily_limit_usd', 0.0500
  );
end;
$function$;

revoke all on function public.consume_mavis_openalex_daily_budget() from public, anon, service_role;
grant execute on function public.consume_mavis_openalex_daily_budget() to authenticated;
comment on function public.consume_mavis_openalex_daily_budget() is
  'Atomically reserves USD 0.001 per OpenAlex search with a shared USD 0.05 UTC daily ceiling.';
