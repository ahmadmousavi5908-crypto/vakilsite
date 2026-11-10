-- Record a metadata-only audit marker when expired intake submissions are purged.
-- The marker intentionally contains no personal data or submission identifier.

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
