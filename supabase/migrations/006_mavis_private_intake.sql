-- Private persistence boundary for public MAVIS intake.
-- No anonymous or authenticated SQL access is granted. Only the server-side secret-key client
-- may access submissions and audit events. The service role cannot read or write rate-limit
-- counters directly; it can invoke the narrow SECURITY DEFINER rate-limit function.

create schema if not exists mavis_intake_private;

revoke all on schema mavis_intake_private from public, anon, authenticated, service_role;
grant usage on schema mavis_intake_private to service_role;

create table mavis_intake_private.submissions (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  full_name text not null check (char_length(full_name) between 3 and 100),
  phone text not null check (phone ~ '^\+989[0-9]{9}$'),
  case_type text not null check (case_type in (
    'civil', 'criminal', 'family', 'property',
    'commercial', 'labor', 'administrative', 'other'
  )),
  summary text not null check (char_length(summary) between 30 and 6000),
  urgency text not null check (urgency in ('routine', 'soon', 'urgent')),
  opposing_party text check (opposing_party is null or char_length(opposing_party) <= 120),
  initial_review_consent boolean not null default true check (initial_review_consent),
  initial_review_consent_at timestamptz not null,
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  third_party_data_notice_acknowledged boolean not null default false,
  third_party_data_notice_acknowledged_at timestamptz,
  review_priority text not null check (review_priority in (
    'urgent_human_review', 'priority_human_review', 'standard_human_review'
  )),
  detected_signals text[] not null default '{}',
  requires_deadline_check boolean not null default false,
  status text not null default 'pending_human_review'
    check (status in ('pending_human_review', 'in_review', 'closed', 'retention_hold')),
  retention_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mavis_intake_marketing_consent_timestamp
    check ((marketing_consent and marketing_consent_at is not null)
      or (not marketing_consent and marketing_consent_at is null)),
  constraint mavis_intake_third_party_notice_timestamp
    check ((third_party_data_notice_acknowledged and third_party_data_notice_acknowledged_at is not null)
      or (not third_party_data_notice_acknowledged and third_party_data_notice_acknowledged_at is null)),
  constraint mavis_intake_retention_after_creation
    check (retention_expires_at > created_at)
);

create index mavis_intake_submissions_created_idx
  on mavis_intake_private.submissions (created_at desc);

create index mavis_intake_submissions_review_idx
  on mavis_intake_private.submissions (status, review_priority, created_at);

create index mavis_intake_submissions_retention_idx
  on mavis_intake_private.submissions (retention_expires_at);

create table mavis_intake_private.audit_events (
  id bigint generated always as identity primary key,
  submission_id uuid references mavis_intake_private.submissions(id) on delete set null,
  event_code text not null check (event_code in (
    'submission_received', 'human_review_started',
    'status_changed', 'retention_hold_applied', 'submission_purged',
    'submission_list_viewed', 'submission_status_updated'
  )),
  actor_type text not null check (actor_type in ('system', 'admin')),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index mavis_intake_audit_created_idx
  on mavis_intake_private.audit_events (created_at);

create table mavis_intake_private.rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 6),
  expires_at timestamptz not null
);

create index mavis_intake_rate_limits_expiry_idx
  on mavis_intake_private.rate_limits (expires_at);

alter table mavis_intake_private.submissions enable row level security;
alter table mavis_intake_private.audit_events enable row level security;
alter table mavis_intake_private.rate_limits enable row level security;

revoke all privileges on table mavis_intake_private.submissions
  from public, anon, authenticated, service_role;
revoke all privileges on table mavis_intake_private.audit_events
  from public, anon, authenticated, service_role;
revoke all privileges on table mavis_intake_private.rate_limits
  from public, anon, authenticated, service_role;

grant select, insert, update on table mavis_intake_private.submissions to service_role;
grant usage, select on sequence mavis_intake_private.audit_events_id_seq to service_role;
grant select, insert on table mavis_intake_private.audit_events to service_role;

create or replace function mavis_intake_private.consume_public_intake_rate_limit(p_key_hash text)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    return query select false, 900;
    return;
  end if;

  delete from mavis_intake_private.rate_limits
  where expires_at <= v_now;

  insert into mavis_intake_private.rate_limits as current_counter (
    key_hash, window_started_at, request_count, expires_at
  )
  values (p_key_hash, v_now, 1, v_now + interval '24 hours')
  on conflict (key_hash) do update
    set window_started_at = case
      when current_counter.window_started_at <= v_now - interval '15 minutes'
        then v_now
      else current_counter.window_started_at
    end,
    request_count = case
      when current_counter.window_started_at <= v_now - interval '15 minutes'
        then 1
      else least(current_counter.request_count + 1, 6)
    end,
    expires_at = v_now + interval '24 hours'
  returning window_started_at, request_count
  into v_window_started_at, v_request_count;

  return query
  select
    v_request_count <= 5,
    case
      when v_request_count <= 5 then 0
      else greatest(
        1,
        ceil(extract(epoch from (v_window_started_at + interval '15 minutes' - v_now)))::integer
      )
    end;
end;
$function$;

revoke all on function mavis_intake_private.consume_public_intake_rate_limit(text)
  from public, anon, authenticated, service_role;
grant execute on function mavis_intake_private.consume_public_intake_rate_limit(text)
  to service_role;

create or replace function mavis_intake_private.purge_expired_public_intake(p_audit_before timestamptz)
returns table (
  submissions_deleted bigint,
  audit_events_deleted bigint
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_submissions_deleted bigint;
  v_audit_events_deleted bigint;
begin
  if p_audit_before is null or p_audit_before > clock_timestamp() then
    raise exception 'A valid audit retention cutoff is required';
  end if;

  delete from mavis_intake_private.submissions
  where retention_expires_at <= clock_timestamp()
    and status <> 'retention_hold';
  get diagnostics v_submissions_deleted = row_count;

  delete from mavis_intake_private.audit_events
  where created_at < p_audit_before;
  get diagnostics v_audit_events_deleted = row_count;

  return query select v_submissions_deleted, v_audit_events_deleted;
end;
$function$;

revoke all on function mavis_intake_private.purge_expired_public_intake(timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function mavis_intake_private.purge_expired_public_intake(timestamptz)
  to service_role;


create or replace function mavis_intake_private.submit_public_intake(
  p_payload jsonb,
  p_review_priority text,
  p_detected_signals text[],
  p_requires_deadline_check boolean,
  p_retention_expires_at timestamptz,
  p_consent_version text
)
returns table (
  id uuid,
  tracking_code text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_full_name text;
  v_phone text;
  v_case_type text;
  v_summary text;
  v_urgency text;
  v_opposing_party text;
  v_marketing_consent boolean;
  v_third_party_notice boolean;
  v_submission_id uuid;
  v_tracking_code text;
  v_created_at timestamptz;
begin
  if jsonb_typeof(p_payload) <> 'object'
    or p_payload - array[
      'fullName', 'phone', 'caseType', 'summary', 'urgency',
      'opposingParty', 'consent', 'marketingConsent',
      'thirdPartyDataNoticeAcknowledged'
    ]::text[] <> '{}'::jsonb then
    raise exception 'Invalid intake payload shape';
  end if;

  v_full_name := btrim(coalesce(p_payload ->> 'fullName', ''));
  v_phone := regexp_replace(coalesce(p_payload ->> 'phone', ''), '[[:space:]()\-]', '', 'g');
  v_case_type := p_payload ->> 'caseType';
  v_summary := btrim(coalesce(p_payload ->> 'summary', ''));
  v_urgency := p_payload ->> 'urgency';
  v_opposing_party := nullif(btrim(coalesce(p_payload ->> 'opposingParty', '')), '');
  v_marketing_consent := coalesce((p_payload ->> 'marketingConsent')::boolean, false);
  v_third_party_notice := coalesce((p_payload ->> 'thirdPartyDataNoticeAcknowledged')::boolean, false);

  if v_phone ~ '^09[0-9]{9}$' then
    v_phone := '+98' || substr(v_phone, 2);
  elsif v_phone ~ '^00989[0-9]{9}$' then
    v_phone := '+' || substr(v_phone, 3);
  elsif v_phone ~ '^989[0-9]{9}$' then
    v_phone := '+' || v_phone;
  end if;

  if char_length(v_full_name) not between 3 and 100
    or v_phone !~ '^\+989[0-9]{9}$'
    or v_case_type not in ('civil', 'criminal', 'family', 'property', 'commercial', 'labor', 'administrative', 'other')
    or char_length(v_summary) not between 30 and 6000
    or v_urgency not in ('routine', 'soon', 'urgent')
    or (v_opposing_party is not null and char_length(v_opposing_party) > 120)
    or p_payload ->> 'consent' is distinct from 'true'
    or p_review_priority not in ('urgent_human_review', 'priority_human_review', 'standard_human_review')
    or p_detected_signals is null
    or not (p_detected_signals <@ array['time_sensitive', 'liberty_or_criminal', 'family_safety', 'enforcement_or_property']::text[])
    or p_requires_deadline_check is null
    or p_retention_expires_at is null
    or p_retention_expires_at <= clock_timestamp()
    or p_retention_expires_at > clock_timestamp() + interval '10 years'
    or p_consent_version is null
    or char_length(p_consent_version) not between 1 and 40 then
    raise exception 'Intake validation failed';
  end if;

  insert into mavis_intake_private.submissions as inserted (
    full_name, phone, case_type, summary, urgency, opposing_party,
    initial_review_consent, initial_review_consent_at, consent_version,
    marketing_consent, marketing_consent_at,
    third_party_data_notice_acknowledged, third_party_data_notice_acknowledged_at,
    review_priority, detected_signals, requires_deadline_check,
    retention_expires_at
  )
  values (
    v_full_name, v_phone, v_case_type, v_summary, v_urgency, v_opposing_party,
    true, clock_timestamp(), p_consent_version,
    v_marketing_consent, case when v_marketing_consent then clock_timestamp() else null end,
    v_third_party_notice, case when v_third_party_notice then clock_timestamp() else null end,
    p_review_priority, p_detected_signals, p_requires_deadline_check,
    p_retention_expires_at
  )
  returning inserted.id, inserted.tracking_code, inserted.created_at
  into v_submission_id, v_tracking_code, v_created_at;

  insert into mavis_intake_private.audit_events (submission_id, event_code, actor_type)
  values (v_submission_id, 'submission_received', 'system');

  return query select v_submission_id, v_tracking_code, v_created_at;
end;
$function$;

revoke all on function mavis_intake_private.submit_public_intake(
  jsonb, text, text[], boolean, timestamptz, text
) from public, anon, authenticated, service_role;
grant execute on function mavis_intake_private.submit_public_intake(
  jsonb, text, text[], boolean, timestamptz, text
) to service_role;

-- Public-schema invoker wrappers keep the private schema outside PostgREST's exposed schemas.
create or replace function public.consume_mavis_public_intake_rate_limit(p_key_hash text)
returns table (allowed boolean, retry_after_seconds integer)
language sql
security invoker
set search_path = ''
as $function$
  select * from mavis_intake_private.consume_public_intake_rate_limit(p_key_hash);
$function$;

create or replace function public.submit_mavis_public_intake(
  p_payload jsonb,
  p_review_priority text,
  p_detected_signals text[],
  p_requires_deadline_check boolean,
  p_retention_expires_at timestamptz,
  p_consent_version text
)
returns table (id uuid, tracking_code text, created_at timestamptz)
language sql
security invoker
set search_path = ''
as $function$
  select * from mavis_intake_private.submit_public_intake(
    p_payload, p_review_priority, p_detected_signals,
    p_requires_deadline_check, p_retention_expires_at, p_consent_version
  );
$function$;

create or replace function public.purge_mavis_expired_public_intake(p_audit_before timestamptz)
returns table (submissions_deleted bigint, audit_events_deleted bigint)
language sql
security invoker
set search_path = ''
as $function$
  select * from mavis_intake_private.purge_expired_public_intake(p_audit_before);
$function$;

revoke all on function public.consume_mavis_public_intake_rate_limit(text)
  from public, anon, authenticated, service_role;
revoke all on function public.submit_mavis_public_intake(
  jsonb, text, text[], boolean, timestamptz, text
) from public, anon, authenticated, service_role;
revoke all on function public.purge_mavis_expired_public_intake(timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function public.consume_mavis_public_intake_rate_limit(text) to service_role;
grant execute on function public.submit_mavis_public_intake(
  jsonb, text, text[], boolean, timestamptz, text
) to service_role;
grant execute on function public.purge_mavis_expired_public_intake(timestamptz) to service_role;


create or replace function mavis_intake_private.list_public_intake_submissions(
  p_actor_user_id uuid,
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  tracking_code text,
  full_name text,
  phone text,
  case_type text,
  summary text,
  urgency text,
  opposing_party text,
  review_priority text,
  detected_signals text[],
  requires_deadline_check boolean,
  status text,
  created_at timestamptz,
  retention_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.profiles
    where profiles.id = p_actor_user_id and profiles.role = 'admin'
  ) then
    raise exception 'Forbidden';
  end if;

  if p_limit is null or p_limit not between 1 and 100
    or p_offset is null or p_offset not between 0 and 10000
    or (p_status is not null and p_status not in (
      'pending_human_review', 'in_review', 'closed', 'retention_hold'
    )) then
    raise exception 'Invalid intake list query';
  end if;

  insert into mavis_intake_private.audit_events (
    event_code, actor_type, actor_user_id
  )
  values ('submission_list_viewed', 'admin', p_actor_user_id);

  return query
  select
    s.id, s.tracking_code, s.full_name, s.phone, s.case_type,
    s.summary, s.urgency, s.opposing_party, s.review_priority,
    s.detected_signals, s.requires_deadline_check, s.status,
    s.created_at, s.retention_expires_at
  from mavis_intake_private.submissions as s
  where p_status is null or s.status = p_status
  order by s.created_at desc, s.id desc
  limit p_limit
  offset p_offset;
end;
$function$;

revoke all on function mavis_intake_private.list_public_intake_submissions(uuid, text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function mavis_intake_private.list_public_intake_submissions(uuid, text, integer, integer)
  to service_role;

create or replace function mavis_intake_private.update_public_intake_status(
  p_actor_user_id uuid,
  p_submission_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_submission_id uuid;
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.profiles
    where profiles.id = p_actor_user_id and profiles.role = 'admin'
  ) then
    raise exception 'Forbidden';
  end if;

  if p_submission_id is null or p_status is null or p_status not in (
    'pending_human_review', 'in_review', 'closed', 'retention_hold'
  ) then
    raise exception 'Invalid intake status update';
  end if;

  update mavis_intake_private.submissions as s
  set status = p_status, updated_at = clock_timestamp()
  where s.id = p_submission_id
  returning s.id into v_submission_id;

  if v_submission_id is null then
    return false;
  end if;

  insert into mavis_intake_private.audit_events (
    submission_id, event_code, actor_type, actor_user_id
  )
  values (v_submission_id, 'submission_status_updated', 'admin', p_actor_user_id);

  return true;
end;
$function$;

revoke all on function mavis_intake_private.update_public_intake_status(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function mavis_intake_private.update_public_intake_status(uuid, uuid, text)
  to service_role;

create or replace function public.list_mavis_public_intake_submissions(
  p_actor_user_id uuid,
  p_status text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  tracking_code text,
  full_name text,
  phone text,
  case_type text,
  summary text,
  urgency text,
  opposing_party text,
  review_priority text,
  detected_signals text[],
  requires_deadline_check boolean,
  status text,
  created_at timestamptz,
  retention_expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $function$
  select * from mavis_intake_private.list_public_intake_submissions(
    p_actor_user_id, p_status, p_limit, p_offset
  );
$function$;

create or replace function public.update_mavis_public_intake_status(
  p_actor_user_id uuid,
  p_submission_id uuid,
  p_status text
)
returns boolean
language sql
security invoker
set search_path = ''
as $function$
  select mavis_intake_private.update_public_intake_status(
    p_actor_user_id, p_submission_id, p_status
  );
$function$;

revoke all on function public.list_mavis_public_intake_submissions(uuid, text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.update_mavis_public_intake_status(uuid, uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.list_mavis_public_intake_submissions(uuid, text, integer, integer)
  to service_role;
grant execute on function public.update_mavis_public_intake_status(uuid, uuid, text)
  to service_role;

comment on schema mavis_intake_private is
  'Private MAVIS intake data; do not expose through Supabase Data API schemas.';
comment on table mavis_intake_private.submissions is
  'Contains personal intake data. Access only through server-side authorization and approved retention policy.';
comment on table mavis_intake_private.audit_events is
  'Metadata-only audit trail; never store intake text, phone numbers, names, or credentials here.';
comment on table mavis_intake_private.rate_limits is
  'Short-lived HMAC-derived request buckets; raw client IP addresses must never be stored.';
