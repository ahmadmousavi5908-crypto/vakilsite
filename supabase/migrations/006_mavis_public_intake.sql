-- MAVIS public intake: private storage, explicit consent, idempotent submission and persistent rate limiting.
-- This migration does not enable the public endpoint. Runtime activation requires approved privacy settings and trusted proxy configuration.

create extension if not exists pg_cron;

create schema if not exists mavis_intake_private;
revoke all on schema mavis_intake_private from public, anon, authenticated, service_role;

create table if not exists public.mavis_intake_submissions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  public_reference uuid not null unique default pg_catalog.gen_random_uuid(),
  idempotency_key uuid not null unique,
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  preferred_contact_method text not null check (preferred_contact_method in ('phone', 'email')),
  city text not null,
  legal_area text not null,
  matter_summary text not null,
  privacy_notice_version text not null,
  privacy_notice_accepted boolean not null default false,
  contact_consent boolean not null default false,
  third_party_consent boolean not null default false,
  marketing_consent boolean not null default false,
  status text not null default 'new' check (status in ('new', 'reviewing', 'contacted', 'closed', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  retention_due_at timestamptz not null,
  constraint mavis_intake_name_length check (char_length(contact_name) between 2 and 100),
  constraint mavis_intake_phone_length check (char_length(contact_phone) between 8 and 20),
  constraint mavis_intake_email_length check (contact_email is null or char_length(contact_email) <= 254),
  constraint mavis_intake_city_length check (char_length(city) between 2 and 80),
  constraint mavis_intake_area_length check (char_length(legal_area) between 2 and 100),
  constraint mavis_intake_summary_length check (char_length(matter_summary) between 20 and 4000),
  constraint mavis_intake_privacy_version_length check (char_length(privacy_notice_version) between 1 and 40),
  constraint mavis_intake_contact_method_present check (
    (preferred_contact_method = 'phone' and contact_phone <> '')
    or (preferred_contact_method = 'email' and contact_email is not null and contact_email <> '')
  )
);

create index if not exists mavis_intake_created_at_idx
  on public.mavis_intake_submissions (created_at desc);
create index if not exists mavis_intake_status_created_idx
  on public.mavis_intake_submissions (status, created_at desc);
create index if not exists mavis_intake_retention_due_idx
  on public.mavis_intake_submissions (retention_due_at);

alter table public.mavis_intake_submissions enable row level security;
revoke all on table public.mavis_intake_submissions from public, anon, authenticated, service_role;
grant select on table public.mavis_intake_submissions to authenticated;
grant update (status) on table public.mavis_intake_submissions to authenticated;

drop policy if exists "MAVIS admins can read intake submissions" on public.mavis_intake_submissions;
create policy "MAVIS admins can read intake submissions"
  on public.mavis_intake_submissions for select
  to authenticated
  using ((select public.is_site_admin()));

drop policy if exists "MAVIS admins can update intake status" on public.mavis_intake_submissions;
create policy "MAVIS admins can update intake status"
  on public.mavis_intake_submissions for update
  to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

create table if not exists public.mavis_intake_audit_events (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.mavis_intake_submissions(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('status_changed')),
  old_status text not null,
  new_status text not null,
  created_at timestamptz not null default now()
);
alter table public.mavis_intake_audit_events enable row level security;
revoke all on table public.mavis_intake_audit_events from public, anon, authenticated, service_role;
grant select on table public.mavis_intake_audit_events to authenticated;
drop policy if exists "MAVIS admins can read intake audit" on public.mavis_intake_audit_events;
create policy "MAVIS admins can read intake audit"
  on public.mavis_intake_audit_events for select
  to authenticated
  using ((select public.is_site_admin()));

create table if not exists mavis_intake_private.rate_limits (
  rate_key_hmac text primary key check (rate_key_hmac ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 4)
);
alter table mavis_intake_private.rate_limits enable row level security;
revoke all on table mavis_intake_private.rate_limits from public, anon, authenticated, service_role;

create or replace function mavis_intake_private.submit_public_intake(
  p_payload jsonb,
  p_rate_key_hmac text,
  p_idempotency_key uuid,
  p_privacy_notice_version text,
  p_retention_days integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_phone text;
  v_email text;
  v_method text;
  v_city text;
  v_area text;
  v_summary text;
  v_existing_reference uuid;
  v_reference uuid;
  v_window_started_at timestamptz;
  v_request_count integer;
  v_retry_after integer;
begin
  if p_idempotency_key is null
    or p_rate_key_hmac is null
    or p_rate_key_hmac !~ '^[a-f0-9]{64}$'
    or p_privacy_notice_version is null
    or char_length(p_privacy_notice_version) not between 1 and 40
    or p_retention_days is null
    or p_retention_days not between 1 and 3650
    or p_payload is null
    or pg_catalog.jsonb_typeof(p_payload) <> 'object'
  then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_request');
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(p_payload) as payload_key(key)
    where key not in (
      'contact_name', 'contact_phone', 'contact_email', 'preferred_contact_method',
      'city', 'legal_area', 'matter_summary', 'privacy_notice_accepted',
      'contact_consent', 'third_party_consent', 'marketing_consent'
    )
  ) then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'unexpected_fields');
  end if;

  if p_payload ->> 'privacy_notice_accepted' is distinct from 'true'
    or p_payload ->> 'contact_consent' is distinct from 'true'
  then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'consent_required');
  end if;

  v_name := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_payload ->> 'contact_name', ''), '[[:cntrl:]]', '', 'g'));
  v_phone := pg_catalog.regexp_replace(coalesce(p_payload ->> 'contact_phone', ''), '[[:space:]()-]', '', 'g');
  v_email := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_payload ->> 'contact_email', ''))), '');
  v_method := coalesce(p_payload ->> 'preferred_contact_method', 'phone');
  v_city := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_payload ->> 'city', ''), '[[:cntrl:]]', '', 'g'));
  v_area := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_payload ->> 'legal_area', ''), '[[:cntrl:]]', '', 'g'));
  v_summary := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_payload ->> 'matter_summary', ''), '[[:cntrl:]]', ' ', 'g'));

  if pg_catalog.char_length(v_name) not between 2 and 100
    or v_phone !~ '^\+?[0-9]{8,18}$'
    or (v_email is not null and (pg_catalog.char_length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
    or v_method not in ('phone', 'email')
    or (v_method = 'email' and v_email is null)
    or pg_catalog.char_length(v_city) not between 2 and 80
    or pg_catalog.char_length(v_area) not between 2 and 100
    or pg_catalog.char_length(v_summary) not between 20 and 4000
  then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_fields');
  end if;

  select public_reference
    into v_existing_reference
    from public.mavis_intake_submissions
   where idempotency_key = p_idempotency_key;

  if found then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'reference_code', v_existing_reference,
      'duplicate', true
    );
  end if;

  delete from mavis_intake_private.rate_limits
   where window_started_at < now() - interval '1 day';

  insert into mavis_intake_private.rate_limits (rate_key_hmac, window_started_at, request_count)
  values (p_rate_key_hmac, now(), 1)
  on conflict (rate_key_hmac) do update
    set request_count = case
          when mavis_intake_private.rate_limits.window_started_at <= now() - interval '15 minutes' then 1
          else least(mavis_intake_private.rate_limits.request_count + 1, 4)
        end,
        window_started_at = case
          when mavis_intake_private.rate_limits.window_started_at <= now() - interval '15 minutes' then now()
          else mavis_intake_private.rate_limits.window_started_at
        end
  returning window_started_at, request_count
    into v_window_started_at, v_request_count;

  if v_request_count > 3 then
    v_retry_after := greatest(1, ceil(extract(epoch from (v_window_started_at + interval '15 minutes' - now())))::integer);
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'rate_limited', 'retry_after_seconds', v_retry_after);
  end if;

  insert into public.mavis_intake_submissions (
    idempotency_key, contact_name, contact_phone, contact_email,
    preferred_contact_method, city, legal_area, matter_summary,
    privacy_notice_version, privacy_notice_accepted, contact_consent,
    third_party_consent, marketing_consent, retention_due_at
  ) values (
    p_idempotency_key, v_name, v_phone, v_email, v_method, v_city, v_area, v_summary,
    p_privacy_notice_version, true, true,
    coalesce(p_payload ->> 'third_party_consent' = 'true', false),
    coalesce(p_payload ->> 'marketing_consent' = 'true', false),
    now() + (p_retention_days * interval '1 day')
  )
  on conflict (idempotency_key) do nothing
  returning public_reference into v_reference;

  if v_reference is null then
    select public_reference into v_reference
      from public.mavis_intake_submissions
     where idempotency_key = p_idempotency_key;
  end if;

  if v_reference is null then
    raise exception 'MAVIS intake persistence failed';
  end if;

  return pg_catalog.jsonb_build_object('ok', true, 'reference_code', v_reference, 'duplicate', false);
end;
$$;

revoke all on function mavis_intake_private.submit_public_intake(jsonb, text, uuid, text, integer) from public, anon, authenticated, service_role;

create or replace function public.submit_mavis_public_intake(
  p_payload jsonb,
  p_rate_key_hmac text,
  p_idempotency_key uuid,
  p_privacy_notice_version text,
  p_retention_days integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return mavis_intake_private.submit_public_intake(
    p_payload,
    p_rate_key_hmac,
    p_idempotency_key,
    p_privacy_notice_version,
    p_retention_days
  );
end;
$$;

revoke all on function public.submit_mavis_public_intake(jsonb, text, uuid, text, integer) from public, anon, authenticated, service_role;
grant execute on function public.submit_mavis_public_intake(jsonb, text, uuid, text, integer) to service_role;

create or replace function mavis_intake_private.audit_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    new.updated_at := now();
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
    insert into public.mavis_intake_audit_events (
      submission_id, actor_id, event_type, old_status, new_status
    ) values (
      new.id, auth.uid(), 'status_changed', old.status, new.status
    );
  end if;
  return new;
end;
$$;

revoke all on function mavis_intake_private.audit_status_change() from public, anon, authenticated, service_role;
drop trigger if exists mavis_intake_status_audit on public.mavis_intake_submissions;
create trigger mavis_intake_status_audit
before update of status on public.mavis_intake_submissions
for each row execute function mavis_intake_private.audit_status_change();

create or replace function mavis_intake_private.purge_expired_submissions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.mavis_intake_submissions
   where retention_due_at <= now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke all on function mavis_intake_private.purge_expired_submissions() from public, anon, authenticated, service_role;

create or replace function public.purge_expired_mavis_intake()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  return mavis_intake_private.purge_expired_submissions();
end;
$$;
revoke all on function public.purge_expired_mavis_intake() from public, anon, authenticated;
grant execute on function public.purge_expired_mavis_intake() to service_role;

-- Retention cleanup runs daily. The retention period itself is configured server-side
-- and stored per submission; no record is deleted before its configured due date.
select cron.schedule(
  'mavis-intake-retention-purge',
  '17 2 * * *',
  'select public.purge_expired_mavis_intake();'
)
where not exists (
  select 1 from cron.job where jobname = 'mavis-intake-retention-purge'
);
