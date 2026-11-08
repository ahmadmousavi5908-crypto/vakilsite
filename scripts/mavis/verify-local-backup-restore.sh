#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_TEMP="${RUNNER_TEMP:-/tmp}"
RUN_ID="${GITHUB_RUN_ID:-local}"
WORK_DIR="$RUN_TEMP/mavis-backup-restore-$RUN_ID"
RESTORE_DIR="$WORK_DIR/restore-project"
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

cleanup() {
  if [[ -f "$RESTORE_DIR/supabase/config.toml" ]]; then
    (cd "$RESTORE_DIR" && supabase stop >/dev/null 2>&1) || true
  fi
  (cd "$PROJECT_ROOT" && supabase stop >/dev/null 2>&1) || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

if ! command -v psql >/dev/null 2>&1; then
  echo "PostgreSQL client is required for the local restore check." >&2
  exit 1
fi

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

psql --no-psqlrc --set ON_ERROR_STOP=1 --dbname "$DB_URL" <<'SQL'
CREATE TABLE mavis_intake_private.ci_backup_restore_probe (
  id integer PRIMARY KEY,
  marker text NOT NULL
);
INSERT INTO mavis_intake_private.ci_backup_restore_probe (id, marker)
VALUES (1, 'mavis-local-backup-restore-ok');
SQL

supabase db dump --local --role-only --file "$WORK_DIR/roles.sql"
supabase db dump --local --file "$WORK_DIR/schema.sql"
supabase db dump --local --data-only --use-copy \
  --exclude storage.buckets_vectors \
  --exclude storage.vector_indexes \
  --file "$WORK_DIR/data.sql"

for dump_file in roles.sql schema.sql data.sql; do
  if [[ ! -s "$WORK_DIR/$dump_file" ]]; then
    echo "Backup dump is missing or empty: $dump_file" >&2
    exit 1
  fi
done

psql --no-psqlrc --set ON_ERROR_STOP=1 --dbname "$DB_URL" \
  --command 'DROP TABLE mavis_intake_private.ci_backup_restore_probe;'

supabase stop >/dev/null

mkdir -p "$RESTORE_DIR"
(
  cd "$RESTORE_DIR"
  supabase init
  if ! supabase start -x imgproxy,logflare,vector,mailpit > "$WORK_DIR/restore-start.log" 2>&1; then
    awk 'tolower($0) ~ /(key|secret|token|jwt|sb_)/ { print "[REDACTED: sensitive startup output]"; next } { print }' "$WORK_DIR/restore-start.log"
    exit 1
  fi
)

psql --no-psqlrc --set ON_ERROR_STOP=1 --single-transaction --dbname "$DB_URL" \
  --file "$WORK_DIR/roles.sql" \
  --command 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;' \
  --file "$WORK_DIR/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$WORK_DIR/data.sql"

VERIFY_SQL="
SELECT CASE WHEN
  EXISTS (
    SELECT 1
    FROM mavis_intake_private.ci_backup_restore_probe
    WHERE id = 1 AND marker = 'mavis-local-backup-restore-ok'
  )
  AND COALESCE((
    SELECT bool_and(c.relrowsecurity)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'mavis_intake_private'
      AND c.relname IN ('submissions', 'audit_events', 'rate_limits')
  ), false)
  AND NOT has_table_privilege('anon', 'mavis_intake_private.submissions', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'mavis_intake_private.submissions', 'SELECT')
  AND NOT has_table_privilege('service_role', 'mavis_intake_private.submissions', 'SELECT')
  AND EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'mavis_intake_private'
      AND p.proname = 'submit_public_intake'
  )
THEN 'PASS' ELSE 'FAIL' END;
"
RESULT="$(psql --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --dbname "$DB_URL" --command "$VERIFY_SQL")"
if [[ "$RESULT" != "PASS" ]]; then
  echo "Restored database did not preserve the expected data, RLS, grants, or intake RPC." >&2
  exit 1
fi

psql --no-psqlrc --set ON_ERROR_STOP=1 --dbname "$DB_URL" \
  --command 'DROP TABLE mavis_intake_private.ci_backup_restore_probe;'

echo "Synthetic local database backup/restore check passed."
