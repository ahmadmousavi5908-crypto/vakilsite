-- Fail closed until the owner approves minimum retention periods.
-- This migration intentionally inserts no active policy and schedules no purge job.

create table if not exists mavis_intake_private.retention_policy (
  singleton boolean primary key default true check (singleton),
  submission_min_retention_days integer not null
    check (submission_min_retention_days between 1 and 3650),
  audit_min_retention_days integer not null
    check (audit_min_retention_days between 1 and 3650),
  approval_reference text not null
    check (char_length(btrim(approval_reference)) between 8 and 120),
  approved_at timestamptz not null,
  enabled boolean not null default false
);

alter table mavis_intake_private.retention_policy enable row level security;

revoke all privileges on table mavis_intake_private.retention_policy
  from public, anon, authenticated, service_role;

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
  v_now timestamptz := clock_timestamp();
  v_policy record;
  v_submissions_deleted bigint;
  v_audit_events_deleted bigint;
begin
  if p_audit_before is null or p_audit_before > v_now then
    raise exception 'A valid audit retention cutoff is required';
  end if;

  select
    submission_min_retention_days,
    audit_min_retention_days
  into v_policy
  from mavis_intake_private.retention_policy
  where singleton = true
    and enabled = true
    and approved_at <= v_now;

  if not found then
    raise exception 'An approved retention policy is required before purge';
  end if;

  if p_audit_before > v_now - make_interval(days => v_policy.audit_min_retention_days) then
    raise exception 'Audit retention cutoff is shorter than the approved minimum';
  end if;

  delete from mavis_intake_private.submissions
  where retention_expires_at <= v_now
    and created_at <= v_now - make_interval(days => v_policy.submission_min_retention_days)
    and status <> 'retention_hold';
  get diagnostics v_submissions_deleted = row_count;

  if v_submissions_deleted > 0 then
    insert into mavis_intake_private.audit_events (
      submission_id, event_code, actor_type
    )
    values (null, 'submission_purged', 'system');
  end if;

  delete from mavis_intake_private.audit_events
  where created_at < p_audit_before;
  get diagnostics v_audit_events_deleted = row_count;

  return query select v_submissions_deleted, v_audit_events_deleted;
end;
$function$;

comment on table mavis_intake_private.retention_policy is
  'Owner-approved minimum retention policy. No row is seeded; purge remains disabled until approval is recorded and enabled.';
