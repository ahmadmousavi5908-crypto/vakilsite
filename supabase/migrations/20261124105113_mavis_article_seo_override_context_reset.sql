-- Scope temporary SEO snapshot overrides explicitly and clear the active flag
-- before returning the pooled PostgREST connection to service.

CREATE OR REPLACE FUNCTION public.sync_mavis_article_version_seo_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_override_active boolean := current_setting('mavis.article_seo_override_active', true) = '1';
  v_focus_override text := current_setting('mavis.article_focus_keyword', true);
  v_related_override text := current_setting('mavis.article_related_keywords', true);
  v_focus_keyword text;
  v_related_keywords text[];
  v_related_json jsonb;
BEGIN
  IF v_override_active THEN
    IF v_focus_override IS NULL OR v_related_override IS NULL THEN
      RAISE EXCEPTION USING errcode = '22023', message = 'Incomplete SEO snapshot override';
    END IF;

    v_focus_keyword := nullif(v_focus_override, '');

    BEGIN
      v_related_json := v_related_override::jsonb;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING errcode = '22023', message = 'Invalid related keyword metadata';
    END;

    IF jsonb_typeof(v_related_json) IS DISTINCT FROM 'array'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_related_json) AS item(value)
        WHERE jsonb_typeof(value) IS DISTINCT FROM 'string'
      ) THEN
      RAISE EXCEPTION USING errcode = '22023', message = 'Invalid related keyword metadata';
    END IF;

    SELECT coalesce(array_agg(value), '{}'::text[])
      INTO v_related_keywords
      FROM jsonb_array_elements_text(v_related_json) AS item(value);
  ELSE
    SELECT article.focus_keyword, article.related_keywords
      INTO v_focus_keyword, v_related_keywords
      FROM public.mavis_editorial_articles AS article
      WHERE article.id = NEW.article_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING errcode = 'P0002', message = 'Article not found for version snapshot';
    END IF;
  END IF;

  NEW.snapshot := NEW.snapshot || jsonb_build_object(
    'focus_keyword', v_focus_keyword,
    'related_keywords', to_jsonb(coalesce(v_related_keywords, '{}'::text[]))
  );

  RETURN NEW;
END;
$function$;

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
  v_focus_keyword text := nullif(btrim(coalesce(p_focus_keyword, '')), '');
  v_related_keywords text[] := p_related_keywords;
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

  PERFORM set_config('mavis.article_seo_override_active', '1', true);
  PERFORM set_config('mavis.article_focus_keyword', coalesce(v_focus_keyword, ''), true);
  PERFORM set_config('mavis.article_related_keywords', to_json(v_related_keywords)::text, true);

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

  UPDATE public.mavis_editorial_articles
    SET focus_keyword = v_focus_keyword,
        related_keywords = v_related_keywords
    WHERE id = v_article_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING errcode = 'P0002', message = 'The saved article was not found';
  END IF;

  PERFORM set_config('mavis.article_seo_override_active', '0', true);

  RETURN v_article_id;
END;
$function$;

COMMENT ON FUNCTION public.save_mavis_article_draft_with_metadata(
  jsonb, text, text[], uuid, integer, text, jsonb
) IS
  'Atomically saves independent SEO metadata into append-only article version snapshots. Temporary override state is explicitly disabled before returning pooled connections. Never publishes.';
