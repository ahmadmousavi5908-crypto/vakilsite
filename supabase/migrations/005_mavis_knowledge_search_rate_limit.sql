-- Atomic per-user fixed-window limit for the internal MAVIS knowledge-search endpoint.
-- The counter table is private and is only writable by its owning security-definer function.

create schema if not exists mavis_private;

revoke all on schema mavis_private from public, anon, authenticated, service_role;

create table if not exists mavis_private.knowledge_search_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 31)
);

alter table mavis_private.knowledge_search_rate_limits enable row level security;

revoke all privileges on table mavis_private.knowledge_search_rate_limits
  from public, anon, authenticated, service_role;

create or replace function public.consume_mavis_knowledge_search_limit()
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return query select false, 60;
    return;
  end if;

  insert into mavis_private.knowledge_search_rate_limits as current_counter (
    user_id,
    window_started_at,
    request_count
  )
  values (v_user_id, v_now, 1)
  on conflict (user_id) do update
    set window_started_at = case
      when current_counter.window_started_at <= v_now - interval '60 seconds'
        then v_now
      else current_counter.window_started_at
    end,
    request_count = case
      when current_counter.window_started_at <= v_now - interval '60 seconds'
        then 1
      else least(current_counter.request_count + 1, 31)
    end
  returning window_started_at, request_count
  into v_window_started_at, v_request_count;

  return query
  select
    v_request_count <= 30,
    case
      when v_request_count <= 30 then 0
      else greatest(
        1,
        ceil(extract(epoch from (v_window_started_at + interval '60 seconds' - v_now)))::integer
      )
    end;
end;
$function$;

revoke all on function public.consume_mavis_knowledge_search_limit()
  from public, anon, authenticated;
grant execute on function public.consume_mavis_knowledge_search_limit()
  to authenticated;
