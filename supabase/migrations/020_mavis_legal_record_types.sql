-- Extend the versioned editorial JSON contract with typed Iranian legal records.
-- No table, permission, RLS, or public route changes are made by this migration.
DO $migration$
DECLARE
  v_signature regprocedure := to_regprocedure('public.save_mavis_article_draft(jsonb,uuid,integer,text)');
  v_definition text;
  v_original text;
BEGIN
  IF v_signature IS NULL THEN
    RAISE EXCEPTION 'MAVIS draft RPC is missing; legal record type migration cannot continue.';
  END IF;

  v_definition := pg_get_functiondef(v_signature);
  v_original := v_definition;

  v_definition := regexp_replace(
    v_definition,
    'ARRAY\s*\[\s*''intro''\s*,\s*''sections''\s*,\s*''checklist''\s*,\s*''warning''\s*\]::text\[\]',
    'ARRAY[''intro'', ''sections'', ''checklist'', ''warning'', ''record_type'', ''legal_metadata'']::text[]',
    'i'
  );

  v_definition := regexp_replace(
    v_definition,
    'if p_payload \? ''author_name''',
    $validation$
  IF p_payload->'content' ? 'record_type'
    AND (
      jsonb_typeof(p_payload->'content'->'record_type') IS DISTINCT FROM 'string'
      OR (p_payload->'content'->>'record_type') NOT IN (
        'article', 'law', 'unifying_opinion', 'judicial_decision',
        'advisory_opinion', 'legal_interpretation', 'legal_analysis',
        'official_circular', 'academic_research'
      )
    ) THEN
    RAISE EXCEPTION USING errcode = '22023', message = 'Invalid legal record type';
  END IF;

  IF p_payload->'content' ? 'legal_metadata' THEN
    IF jsonb_typeof(p_payload->'content'->'legal_metadata') IS DISTINCT FROM 'object'
      OR (p_payload->'content'->'legal_metadata' - ARRAY[
        'document_number', 'issuing_authority', 'document_date',
        'publication_date', 'effective_from', 'effective_until',
        'validity_status', 'related_law'
      ]::text[]) <> '{}'::jsonb THEN
      RAISE EXCEPTION USING errcode = '22023', message = 'Invalid legal metadata object';
    END IF;

    IF p_payload->'content'->'legal_metadata'->>'validity_status'
      NOT IN ('unknown', 'current', 'amended', 'repealed', 'historical', 'disputed') THEN
      RAISE EXCEPTION USING errcode = '22023', message = 'Invalid legal validity status';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_each(p_payload->'content'->'legal_metadata') AS item(key, value)
      WHERE jsonb_typeof(value) IS DISTINCT FROM 'string'
        OR length(value #>> '{}') > 500
    ) THEN
      RAISE EXCEPTION USING errcode = '22023', message = 'Invalid legal metadata value';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM unnest(ARRAY['document_date', 'publication_date', 'effective_from', 'effective_until']) AS field_name
      WHERE nullif(p_payload->'content'->'legal_metadata'->>field_name, '') IS NOT NULL
        AND (p_payload->'content'->'legal_metadata'->>field_name) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    ) THEN
      RAISE EXCEPTION USING errcode = '22023', message = 'Invalid legal metadata date';
    END IF;
  END IF;

  IF p_payload->'content' ? 'record_type'
    AND NOT (p_payload->'content' ? 'legal_metadata') THEN
    RAISE EXCEPTION USING errcode = '22023', message = 'Legal metadata object is required with a record type';
  END IF;

  IF p_payload ? 'author_name'$
$validation$,
    'i'
  );

  IF v_definition = v_original
    OR position('record_type' IN v_definition) = 0
    OR position('Invalid legal record type' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Could not safely extend the MAVIS draft RPC contract; no function was changed.';
  END IF;

  EXECUTE v_definition;
END;
$migration$;

COMMENT ON FUNCTION public.save_mavis_article_draft(jsonb, uuid, integer, text) IS
  'Creates or updates an administrator draft with versioned, structured article or Iranian legal-record metadata.';
