-- Reconcile the richer editorial workflow with the approved Mother Two CMS table name.
-- mavis_editorial_articles is the single canonical table.
-- mavis_articles remains only as a simple, security-invoker compatibility view.

DO $migration_guard$
DECLARE
  legacy_row_count bigint;
BEGIN
  IF to_regclass('public.mavis_editorial_articles') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.mavis_editorial_articles'
      INTO legacy_row_count;

    IF legacy_row_count > 0 THEN
      RAISE EXCEPTION
        'MAVIS CMS reconciliation stopped: public.mavis_editorial_articles already contains % rows. Export and reconcile those records before applying this migration.',
        legacy_row_count;
    END IF;
  END IF;

  IF to_regclass('public.mavis_articles') IS NULL THEN
    RAISE EXCEPTION
      'MAVIS CMS reconciliation stopped: expected public.mavis_articles table was not found.';
  END IF;
END;
$migration_guard$;

-- Remove the legacy zero-argument reader before dropping an empty legacy table.
DROP FUNCTION IF EXISTS public.get_mavis_published_articles();

DO $rename_canonical_table$
BEGIN
  IF to_regclass('public.mavis_editorial_articles') IS NOT NULL THEN
    DROP TABLE public.mavis_editorial_articles;
  END IF;

  ALTER TABLE public.mavis_articles
    RENAME TO mavis_editorial_articles;
END;
$rename_canonical_table$;

ALTER TABLE public.mavis_editorial_articles
  ADD COLUMN IF NOT EXISTS draft_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_content jsonb,
  ADD COLUMN IF NOT EXISTS legal_review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_indexable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_legal_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS draft_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS published_version integer;

UPDATE public.mavis_editorial_articles
SET author_name = ''
WHERE author_name IS NULL;

ALTER TABLE public.mavis_editorial_articles
  ALTER COLUMN author_name SET DEFAULT '',
  ALTER COLUMN author_name SET NOT NULL;

UPDATE public.mavis_editorial_articles
SET published_version = current_version
WHERE status = 'published'
  AND published_version IS NULL;

UPDATE public.mavis_editorial_articles AS article
SET
  draft_content = COALESCE(
    (
      SELECT version.snapshot
      FROM public.mavis_article_versions AS version
      WHERE version.article_id = article.id
        AND version.version = article.current_version
      LIMIT 1
    ),
    jsonb_build_object(
      'slug', article.slug,
      'title', article.title,
      'author_name', article.author_name,
      'excerpt', article.excerpt,
      'category', article.category,
      'tags', to_jsonb(article.tags),
      'content', article.content,
      'content_schema_version', article.content_schema_version,
      'seo_title', article.seo_title,
      'seo_description', article.seo_description
    )
  ),
  published_content = CASE
    WHEN article.published_version IS NULL THEN NULL
    ELSE COALESCE(
      (
        SELECT version.snapshot
        FROM public.mavis_article_versions AS version
        WHERE version.article_id = article.id
          AND version.version = article.published_version
        LIMIT 1
      ),
      (
        SELECT version.snapshot
        FROM public.mavis_article_versions AS version
        WHERE version.article_id = article.id
          AND version.version = article.current_version
        LIMIT 1
      ),
      jsonb_build_object(
        'slug', article.slug,
        'title', article.title,
        'author_name', article.author_name,
        'excerpt', article.excerpt,
        'category', article.category,
        'tags', to_jsonb(article.tags),
        'content', article.content,
        'content_schema_version', article.content_schema_version,
        'seo_title', article.seo_title,
        'seo_description', article.seo_description
      )
    )
  END,
  legal_review_status = CASE
    WHEN article.status IN ('approved', 'published') THEN 'approved'
    WHEN article.status = 'changes_requested' THEN 'changes_requested'
    ELSE 'pending'
  END,
  is_indexable = article.status = 'published',
  draft_updated_at = article.updated_at,
  reviewer_name = COALESCE((
    SELECT NULLIF(user_record.raw_user_meta_data ->> 'full_name', '')
      FROM public.mavis_article_approvals AS approval
      LEFT JOIN auth.users AS user_record
        ON user_record.id = approval.reviewer_id
      WHERE approval.article_id = article.id
        AND approval.article_version = COALESCE(article.published_version, article.current_version)
      ORDER BY approval.created_at DESC
      LIMIT 1
  ), ''),
  last_legal_review_at = (
    SELECT approval.created_at
    FROM public.mavis_article_approvals AS approval
    WHERE approval.article_id = article.id
      AND approval.article_version = COALESCE(article.published_version, article.current_version)
    ORDER BY approval.created_at DESC
    LIMIT 1
  );

ALTER TABLE public.mavis_editorial_articles
  ADD CONSTRAINT mavis_editorial_draft_content_object
    CHECK (jsonb_typeof(draft_content) = 'object'),
  ADD CONSTRAINT mavis_editorial_published_content_object
    CHECK (published_content IS NULL OR jsonb_typeof(published_content) = 'object'),
  ADD CONSTRAINT mavis_editorial_legal_review_status
    CHECK (legal_review_status IN ('pending', 'approved', 'changes_requested')),
  ADD CONSTRAINT mavis_editorial_published_version_positive
    CHECK (published_version IS NULL OR published_version > 0),
  ADD CONSTRAINT mavis_editorial_published_snapshot_check
    CHECK (status <> 'published' OR published_content IS NOT NULL);

CREATE OR REPLACE FUNCTION public.sync_mavis_editorial_legacy_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_snapshot jsonb;
  published_snapshot jsonb;
  latest_reviewer_name text;
  latest_reviewed_at timestamptz;
BEGIN
  -- Imported and manually authored drafts may omit an author; preserve the
  -- legacy Mother Two contract without rejecting otherwise valid drafts.
  NEW.author_name := COALESCE(NEW.author_name, '');

  IF NEW.status = 'published' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.published_version := NEW.current_version;
    ELSIF OLD.status IS DISTINCT FROM 'published' THEN
      NEW.published_version := NEW.current_version;
    END IF;
  END IF;

  SELECT version.snapshot
  INTO current_snapshot
  FROM public.mavis_article_versions AS version
  WHERE version.article_id = NEW.id
    AND version.version = NEW.current_version
  LIMIT 1;

  NEW.draft_content := COALESCE(
    current_snapshot,
    jsonb_build_object(
      'slug', NEW.slug,
      'title', NEW.title,
      'author_name', NEW.author_name,
      'excerpt', NEW.excerpt,
      'category', NEW.category,
      'tags', to_jsonb(NEW.tags),
      'content', NEW.content,
      'content_schema_version', NEW.content_schema_version,
      'seo_title', NEW.seo_title,
      'seo_description', NEW.seo_description
    )
  );

  IF NEW.published_version IS NOT NULL THEN
    SELECT version.snapshot
    INTO published_snapshot
    FROM public.mavis_article_versions AS version
    WHERE version.article_id = NEW.id
      AND version.version = NEW.published_version
    LIMIT 1;

    NEW.published_content := COALESCE(
      published_snapshot,
      NEW.published_content,
      CASE WHEN NEW.status = 'published' THEN NEW.draft_content ELSE NULL END
    );
  END IF;

  IF NEW.status = 'published' AND NEW.published_content IS NULL THEN
    NEW.published_content := NEW.draft_content;
  END IF;

  NEW.legal_review_status := CASE
    WHEN NEW.status IN ('approved', 'published') THEN 'approved'
    WHEN NEW.status = 'changes_requested' THEN 'changes_requested'
    ELSE 'pending'
  END;

  NEW.is_indexable := NEW.status = 'published'
    AND NEW.published_content IS NOT NULL;

  IF TG_OP = 'INSERT' OR NEW.current_version IS DISTINCT FROM OLD.current_version THEN
    NEW.draft_updated_at := COALESCE(NEW.updated_at, now());
  END IF;

  SELECT
    COALESCE(
      NULLIF(user_record.raw_user_meta_data ->> 'full_name', ''),
      user_record.email,
      ''
    ),
    approval.created_at
  INTO latest_reviewer_name, latest_reviewed_at
  FROM public.mavis_article_approvals AS approval
  LEFT JOIN auth.users AS user_record
    ON user_record.id = approval.reviewer_id
  WHERE approval.article_id = NEW.id
    AND approval.article_version = COALESCE(NEW.published_version, NEW.current_version)
  ORDER BY approval.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    NEW.reviewer_name := latest_reviewer_name;
    NEW.last_legal_review_at := latest_reviewed_at;
  ELSE
    NEW.reviewer_name := COALESCE(NEW.reviewer_name, '');
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_mavis_editorial_legacy_fields()
  FROM public, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS mavis_editorial_legacy_fields_sync
  ON public.mavis_editorial_articles;

CREATE TRIGGER mavis_editorial_legacy_fields_sync
  BEFORE INSERT OR UPDATE ON public.mavis_editorial_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_mavis_editorial_legacy_fields();

-- The compatibility view is owned by the authenticated role, not by the table owner.
-- This preserves the authenticated RLS policy boundary while allowing the anonymous
-- role to receive only the deliberately limited public columns from the view.
CREATE VIEW public.mavis_articles
WITH (security_invoker = false)
AS
SELECT *
FROM public.mavis_editorial_articles;

ALTER VIEW public.mavis_articles OWNER TO authenticated;

REVOKE ALL ON TABLE public.mavis_articles
  FROM public, anon, authenticated, service_role;

-- A security-invoker view requires the caller to hold matching privileges
-- on its base table; RLS remains the row-level access boundary.
GRANT SELECT ON TABLE public.mavis_editorial_articles TO authenticated;

GRANT SELECT ON TABLE public.mavis_articles TO authenticated;

GRANT SELECT (
  id, slug, title, author_name, excerpt, category, tags, content,
  content_schema_version, seo_title, seo_description, status,
  current_version, created_at, updated_at, published_at
) ON TABLE public.mavis_articles TO anon;

CREATE OR REPLACE FUNCTION public.get_mavis_published_articles()
RETURNS TABLE (
  slug text,
  published_content jsonb,
  is_indexable boolean,
  published_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    article.slug,
    article.published_content,
    article.is_indexable,
    article.published_at,
    article.updated_at
  FROM public.mavis_editorial_articles AS article
  WHERE article.status = 'published'
    AND article.published_content IS NOT NULL
  ORDER BY article.published_at DESC NULLS LAST;
$function$;

REVOKE ALL ON FUNCTION public.get_mavis_published_articles()
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mavis_published_articles()
  TO anon, authenticated;

COMMENT ON TABLE public.mavis_editorial_articles IS
  'Canonical MAVIS editorial CMS table. Versioning, source provenance, approvals, and publication share this single record store.';

COMMENT ON VIEW public.mavis_articles IS
  'Automatically updatable compatibility view over public.mavis_editorial_articles; not a second CMS table.';

-- Preserve the existing administrator predicate boundary after the table reconciliation.
REVOKE ALL ON FUNCTION public.is_site_admin()
  FROM public, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_site_admin()
  TO authenticated;
