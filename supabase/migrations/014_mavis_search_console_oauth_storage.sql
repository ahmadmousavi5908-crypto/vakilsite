-- Store only authenticated-encryption ciphertext for the administrator's
-- Google Search Console refresh token. Browser roles cannot read the table.
create table if not exists public.mavis_search_console_connections (
  id smallint primary key default 1 check (id = 1),
  encrypted_refresh_token text not null,
  site_url text not null,
  connected_by uuid not null references auth.users(id) on delete restrict,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mavis_search_console_encrypted_token_format
    check (
      char_length(encrypted_refresh_token) between 32 and 8192
      and encrypted_refresh_token ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
    ),
  constraint mavis_search_console_site_url_format
    check (
      site_url ~ '^https://[^/@[:space:]]+(/[^[:space:]]*)?$'
      or site_url ~ '^sc-domain:[a-z0-9.-]+$'
    )
);

alter table public.mavis_search_console_connections enable row level security;

revoke all on table public.mavis_search_console_connections
  from public, anon, authenticated, service_role;

create or replace function public.store_mavis_search_console_connection(
  p_encrypted_refresh_token text,
  p_site_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_connected_at timestamptz;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_encrypted_refresh_token is null
    or char_length(p_encrypted_refresh_token) not between 32 and 8192
    or p_encrypted_refresh_token !~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' then
    raise exception using errcode = '22023', message = 'Encrypted refresh token is invalid';
  end if;

  if p_site_url is null
    or not (
      p_site_url ~ '^https://[^/@[:space:]]+(/[^[:space:]]*)?$'
      or p_site_url ~ '^sc-domain:[a-z0-9.-]+$'
    ) then
    raise exception using errcode = '22023', message = 'Search Console property URL is invalid';
  end if;

  insert into public.mavis_search_console_connections (
    id, encrypted_refresh_token, site_url, connected_by, connected_at, updated_at
  )
  values (1, p_encrypted_refresh_token, p_site_url, v_actor, now(), now())
  on conflict (id) do update
    set encrypted_refresh_token = excluded.encrypted_refresh_token,
        site_url = excluded.site_url,
        connected_by = excluded.connected_by,
        connected_at = now(),
        updated_at = now()
  returning connected_at into v_connected_at;

  return jsonb_build_object(
    'connected', true,
    'siteUrl', p_site_url,
    'connectedAt', v_connected_at
  );
end;
$function$;

create or replace function public.get_mavis_search_console_connection()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_connection public.mavis_search_console_connections%rowtype;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  select * into v_connection
  from public.mavis_search_console_connections
  where id = 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'connected', true,
    'encryptedRefreshToken', v_connection.encrypted_refresh_token,
    'siteUrl', v_connection.site_url,
    'connectedAt', v_connection.connected_at
  );
end;
$function$;

create or replace function public.disconnect_mavis_search_console()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  delete from public.mavis_search_console_connections where id = 1;
  return jsonb_build_object('connected', false);
end;
$function$;

revoke all on function public.store_mavis_search_console_connection(text, text)
  from public, anon, service_role;
revoke all on function public.get_mavis_search_console_connection()
  from public, anon, service_role;
revoke all on function public.disconnect_mavis_search_console()
  from public, anon, service_role;

grant execute on function public.store_mavis_search_console_connection(text, text)
  to authenticated;
grant execute on function public.get_mavis_search_console_connection()
  to authenticated;
grant execute on function public.disconnect_mavis_search_console()
  to authenticated;

comment on table public.mavis_search_console_connections is
  'Single administrator-owned Google Search Console connection. Refresh tokens are stored only as AES-256-GCM ciphertext and exposed through admin-only RPCs.';
