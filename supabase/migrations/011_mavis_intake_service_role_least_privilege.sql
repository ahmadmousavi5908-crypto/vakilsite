-- The service-role key may invoke narrowly scoped SECURITY DEFINER RPCs,
-- but it must not have direct table or sequence access to private intake data.

revoke all privileges on table mavis_intake_private.submissions
  from service_role;
revoke all privileges on table mavis_intake_private.audit_events
  from service_role;
revoke all privileges on sequence mavis_intake_private.audit_events_id_seq
  from service_role;

comment on table mavis_intake_private.submissions is
  'Contains personal intake data. Direct service-role table access is revoked; use narrowly scoped server-authorized RPCs.';
comment on table mavis_intake_private.audit_events is
  'Metadata-only audit trail. Direct service-role table access is revoked; use narrowly scoped SECURITY DEFINER RPCs.';
