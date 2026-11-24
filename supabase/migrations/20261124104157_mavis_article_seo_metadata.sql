-- Keep SEO metadata independent from editorial tags and preserve it in immutable versions.
-- This migration changes the Staging schema only when applied to the Staging project.

ALTER TABLE public.mavis_editorial_articles
  ADD COLUMN IF NOT EXISTS focus_keyword text,
  ADD COLUMN IF NOT EXISTS related_keywords text[] NOT NULL DEFAULT '{}'::text[];

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mavis_editorial_focus_keyword_length'
      AND conrelid = 'public.mavis_editorial_articles'::regclass
  ) THEN
    ALTER TABLE public.mavis_editorial_articles
      ADD CONSTRAINT mavis_editorial_focus_keyword_length
      CHECK (focus_keyword IS NULL OR char_length(focus_keyword) <= 240);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mavis_editorial_related_keywords_count'
      AND conrelid = 'public.mavis_editorial_articles'::regclass
  ) THEN
    ALTER TABLE public.mavis_editorial_articles
      ADD CONSTRAINT mavis_editorial_related_keywords_count
      CHECK (cardinality(related_keywords) <= 20);
  END IF;
END;
$constraints$;

-- Keep the compatibility view aligned with the canonical CMS table.
CREATE OR REPLACE VIEW public.mavis_articles
WITH (security_invoker = true)
AS
SELECT
  id, slug, title, author_name, excerpt, category, tags, content,
  content_schema_version, seo_title, seo_description, status,
  current_version, created_at, updated_at, published_at,
  focus_keyword, related_keywords
FROM public.mavis_editorial_articles;

GRANT SELECT (focus_keyword, related_keywords)
  ON public.mavis_editorial_articles TO anon;

-- Every new immutable version carries the SEO metadata stored on its article.
-- This also covers versions created when a source is attached after draft saving.
CREATE OR REPLACE FUNCTION public.sync_mavis_article_version_seo_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_focus_keyword text;
  v_related_keywords text[];
BEGIN
  SELECT article.focus_keyword, article.related_keywords
    INTO v_focus_keyword, v_related_keywords
    FROM public.mavis_editorial_articles AS article
    WHERE article.id = NEW.article_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING errcode = 'P0002', message = 'Article not found for version snapshot';
  END IF;

  NEW.snapshot := NEW.snapshot || jsonb_build_object(
    'focus_keyword', v_focus_keyword,
    'related_keywords', to_jsonb(coalesce(v_related_keywords, '{}'::text[]))
  );

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_mavis_article_version_seo_metadata()
  FROM public, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS mavis_article_version_seo_metadata_sync
  ON public.mavis_article_versions;

CREATE TRIGGER mavis_article_version_seo_metadata_sync
  BEFORE INSERT ON public.mavis_article_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_mavis_article_version_seo_metadata();

-- Wrap the existing guarded draft/image RPCs so SEO metadata and image metadata
-- are committed atomically with the exact draft version. No publication occurs.
CREATE OR REPLACE FUNCTION public.save_mavis_article_draft_with_metadata(
  p_payload jsonb,
  p_focus_keyword text,
  p_related_keywords text[],
  p_article_id uuid DEFAULT NULL,
  p_expected_version integer DEFAULT NULL,
  p_change_note text DEFAULT NULL,
  p_image jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_article_id uuid;
  v_current_version integer;
  v_focus_keyword text := nullif(btrim(coalesce(p_focus_keyword, '')), '');
  v_related_keywords text[] := p_related_keywords;
  v_updated integer;
BEGIN
  IF v_actor IS NULL OR NOT public.is_site_admin() THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'Administrator access required';
  END IF;

  IF char_length(coalesce(v_focus_keyword, '')) > 240 THEN
    RAISE EXCEPTION USING errcode = '22023', message = 'Invalid focus keyword';
  END IF;

  IF v_related_keywords IS NULL
    OR cardinality(v_related_keywords) > 20 THEN
    RAISE EXCEPTION USING errcode = '22023', message = 'Related keywords must contain at most 20 items';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_related_keywords) AS item(keyword)
    WHERE keyword IS NULL
      OR char_length(btrim(keyword)) NOT BETWEEN 1 AND 120
  ) THEN
    RAISE EXCEPTION USING errcode = '22023', message = 'Invalid related keyword';
  END IF;

  IF p_image IS NULL THEN
    v_article_id := public.save_mavis_article_draft(
      p_payload,
      p_article_id,
      p_expected_version,
      p_change_note
    );
  ELSE
    v_article_id := public.save_mavis_article_draft_with_image(
      p_payload,
      p_image,
      p_article_id,
      p_expected_version,
      p_change_note
    );
  END IF;

  SELECT article.current_version
    INTO v_current_version
    FROM public.mavis_editorial_articles AS article
    WHERE article.id = v_article_id;

  IF v_current_version IS NULL THEN
    RAISE EXCEPTION USING errcode = '55000', message = 'The saved article version was not found';
  END IF;

  UPDATE public.mavis_article_versions
    SET snapshot = snapshot || jsonb_build_object(
      'focus_keyword', v_focus_keyword,
      'related_keywords', to_jsonb(v_related_keywords)
    )
    WHERE article_id = v_article_id
      AND version = v_current_version;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION USING errcode = '55000', message = 'The saved article version snapshot was not found';
  END IF;

  -- The legacy-field synchronization trigger reads the now-enriched snapshot.
  UPDATE public.mavis_editorial_articles
    SET focus_keyword = v_focus_keyword,
        related_keywords = v_related_keywords
    WHERE id = v_article_id;

  RETURN v_article_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_mavis_article_draft_with_metadata(
  jsonb, text, text[], uuid, integer, text, jsonb
) FROM public, anon, service_role;

GRANT EXECUTE ON FUNCTION public.save_mavis_article_draft_with_metadata(
  jsonb, text, text[], uuid, integer, text, jsonb
) TO authenticated;

COMMENT ON FUNCTION public.save_mavis_article_draft_with_metadata(
  jsonb, text, text[], uuid, integer, text, jsonb
) IS
  'Atomically saves an administrator draft with independent focus/related SEO keywords and optional versioned image metadata. Never publishes.';
