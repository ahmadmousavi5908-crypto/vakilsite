-- Atomic, draft-only import of normalized scholarly source candidates.
-- No source text is fetched and unknown reuse rights are never upgraded.

create or replace function public.import_mavis_source_candidate(p_candidate jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_provider text;
  v_provider_record_id text;
  v_title text;
  v_doi text;
  v_source_url text;
  v_canonical_url text;
  v_author_name text;
  v_publisher text;
  v_publication_date date;
  v_source_id uuid;
  v_article_id uuid;
  v_slug text;
  v_snapshot jsonb;
  v_existing_article_id uuid;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode = '42501', message = 'Administrator access required';
  end if;

  if p_candidate is null or jsonb_typeof(p_candidate) <> 'object' then
    raise exception using errcode = '22023', message = 'Source candidate must be a JSON object';
  end if;

  if p_candidate - array[
    'provider', 'providerRecordId', 'doi', 'title', 'authors',
    'publisher', 'venue', 'publicationDate', 'sourceUrl', 'sourceType', 'rightsStatus'
  ]::text[] <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Source candidate contains unsupported fields';
  end if;

  v_provider := p_candidate->>'provider';
  if p_candidate->>'sourceType' is distinct from 'academic' then
    raise exception using errcode = '22023', message = 'Unsupported source type';
  end if;

  if v_provider is null or v_provider not in ('crossref', 'semantic_scholar', 'openalex') then
    raise exception using errcode = '22023', message = 'Unsupported source provider';
  end if;

  if jsonb_typeof(p_candidate->'providerRecordId') is distinct from 'string'
    or length(btrim(p_candidate->>'providerRecordId')) not between 1 and 300 then
    raise exception using errcode = '22023', message = 'Invalid provider record identifier';
  end if;
  v_provider_record_id := btrim(p_candidate->>'providerRecordId');

  if jsonb_typeof(p_candidate->'title') is distinct from 'string'
    or length(btrim(p_candidate->>'title')) not between 3 and 500 then
    raise exception using errcode = '22023', message = 'Invalid source title';
  end if;
  v_title := btrim(p_candidate->>'title');

  if jsonb_typeof(p_candidate->'sourceUrl') is distinct from 'string'
    or length(btrim(p_candidate->>'sourceUrl')) not between 8 and 2000
    or btrim(p_candidate->>'sourceUrl') !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]]*)?$'
    or btrim(p_candidate->>'sourceUrl') ~ '^https://[^/]*@' then
    raise exception using errcode = '22023', message = 'Invalid HTTPS source URL';
  end if;
  v_source_url := btrim(p_candidate->>'sourceUrl');

  if p_candidate ? 'doi' and p_candidate->'doi' <> 'null'::jsonb then
    if jsonb_typeof(p_candidate->'doi') is distinct from 'string'
      or length(btrim(p_candidate->>'doi')) not between 7 and 200
      or lower(btrim(p_candidate->>'doi')) !~ '^10\.[0-9]{4,9}/[^[:space:]]+$' then
      raise exception using errcode = '22023', message = 'Invalid DOI';
    end if;
    v_doi := lower(btrim(p_candidate->>'doi'));
  end if;

  if p_candidate ? 'authors' then
    if jsonb_typeof(p_candidate->'authors') is distinct from 'array'
      or jsonb_array_length(p_candidate->'authors') > 30 then
      raise exception using errcode = '22023', message = 'Invalid source authors';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_candidate->'authors') as author(value)
      where jsonb_typeof(author.value) is distinct from 'string'
        or length(btrim(author.value #>> '{}')) > 180
    ) then
      raise exception using errcode = '22023', message = 'Invalid source author name';
    end if;
    select nullif(string_agg(btrim(value), ', ' order by ordinal), '')
      into v_author_name
      from jsonb_array_elements_text(p_candidate->'authors') with ordinality as authors(value, ordinal);
  end if;

  v_publisher := nullif(left(btrim(coalesce(p_candidate->>'publisher', p_candidate->>'venue', '')), 300), '');

  if coalesce(p_candidate->>'publicationDate', '') ~ '^\\d{4}-\\d{2}-\\d{2}$' then
    begin
      if to_char(to_date(p_candidate->>'publicationDate', 'YYYY-MM-DD'), 'YYYY-MM-DD') = p_candidate->>'publicationDate' then
        v_publication_date := (p_candidate->>'publicationDate')::date;
      end if;
    exception when others then
      v_publication_date := null;
    end;
  end if;

  -- DOI is the stable canonical identity when available; otherwise retain the provider URL.
  v_canonical_url := case when v_doi is not null
    then 'https://doi.org/' || v_doi
    else v_source_url
  end;

  insert into public.mavis_sources (
    canonical_url, source_type, external_id, title, author_name, publisher,
    published_on, rights_status
  )
  values (
    v_canonical_url, 'academic', v_provider || ':' || v_provider_record_id,
    v_title, v_author_name, v_publisher, v_publication_date, 'unknown'
  )
  on conflict (canonical_url) do update
    set title = excluded.title,
        author_name = coalesce(excluded.author_name, public.mavis_sources.author_name),
        publisher = coalesce(excluded.publisher, public.mavis_sources.publisher),
        published_on = coalesce(excluded.published_on, public.mavis_sources.published_on),
        updated_at = now()
  returning id into v_source_id;

  -- Repeated imports of the same source return the existing generated draft.
  select article.id into v_existing_article_id
  from public.mavis_article_sources article_source
  join public.mavis_articles article on article.id = article_source.article_id
  where article_source.source_id = v_source_id
    and article_source.relation_type = 'research_background'
    and article.origin_type = 'metadata_only'
  order by article.created_at asc
  limit 1;

  if v_existing_article_id is not null then
    return jsonb_build_object(
      'articleId', v_existing_article_id,
      'sourceId', v_source_id,
      'created', false,
      'status', 'existing'
    );
  end if;

  v_slug := 'source-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 24);

  insert into public.mavis_articles (
    slug, title, author_name, excerpt, category, tags, content,
    content_schema_version, seo_title, seo_description, status,
    origin_type, current_version, last_change_note, created_by, updated_by
  )
  values (
    v_slug,
    left(v_title, 300),
    v_author_name,
    'پیش‌نویس اولیه بر پایه فراداده منبع؛ متن کامل هنوز تدوین نشده است.',
    'پژوهش حقوقی',
    array[]::text[],
    jsonb_build_object(
      'intro', 'این پیش‌نویس فقط از فراداده منبع ساخته شده و نیازمند بررسی و تکمیل مدیر است.',
      'sections', jsonb_build_array(jsonb_build_object(
        'heading', 'یادداشت تدوین و بررسی',
        'body', 'متن علمی یا حقوقی این مقاله هنوز تهیه نشده است. مدیر باید محتوا، اعتبار منبع، ارتباط آن با حقوق ایران و وضعیت حقوق نشر را جداگانه بررسی کند.'
      )),
      'warning', 'حقوق بازنشر نامشخص است. از درج متن کامل، چکیده یا تصویر منبع بدون مجوز معتبر خودداری شود.'
    ),
    1,
    left(v_title, 300),
    'پیش‌نویس نیازمند بررسی و تکمیل مدیر؛ منبع و حقوق استفاده باید جداگانه ارزیابی شوند.',
    'draft',
    'metadata_only',
    1,
    'Imported source metadata; editorial completion required',
    v_actor,
    v_actor
  )
  returning id into v_article_id;

  insert into public.mavis_article_sources (
    article_id, source_id, relation_type, citation_label, sort_order
  )
  values (
    v_article_id, v_source_id, 'research_background', 'منبع کشف‌شده؛ حقوق استفاده بررسی‌نشده', 0
  );

  select jsonb_build_object(
    'slug', slug,
    'title', title,
    'author_name', author_name,
    'excerpt', excerpt,
    'category', category,
    'tags', to_jsonb(tags),
    'content', content,
    'content_schema_version', content_schema_version,
    'seo_title', seo_title,
    'seo_description', seo_description,
    'status', status
  )
  into v_snapshot
  from public.mavis_articles
  where id = v_article_id;

  insert into public.mavis_article_versions (
    article_id, version, snapshot, change_note, created_by
  )
  values (
    v_article_id, 1, v_snapshot,
    'Imported source metadata; editorial completion required', v_actor
  );

  insert into public.mavis_article_audit_events (
    article_id, source_id, actor_id, event_type, previous_status,
    next_status, article_version, metadata
  )
  values (
    v_article_id, v_source_id, v_actor, 'import_completed', null,
    'draft', 1,
    jsonb_build_object(
      'provider', v_provider,
      'provider_record_id', v_provider_record_id,
      'rights_status', 'unknown',
      'import_mode', 'metadata_only'
    )
  );

  return jsonb_build_object(
    'articleId', v_article_id,
    'sourceId', v_source_id,
    'created', true,
    'status', 'draft'
  );
end;
$function$;

revoke all on function public.import_mavis_source_candidate(jsonb)
  from public, anon, service_role;
grant execute on function public.import_mavis_source_candidate(jsonb)
  to authenticated;

comment on function public.import_mavis_source_candidate(jsonb) is
  'Atomically imports normalized source metadata into a new draft with provenance, unknown rights, immutable version one, and audit event. Never imports source text or publishes.';

    or btrim(p_candidate->>'sourceUrl') ~ '^https://[^/]*@' then
    raise exception using errcode = '22023', message = 'Invalid HTTPS source URL';
  end if;
  v_source_url := btrim(p_candidate->>'sourceUrl');

  if p_candidate ? 'doi' and p_candidate->'doi' <> 'null'::jsonb then
    if jsonb_typeof(p_candidate->'doi') is distinct from 'string'
      or length(btrim(p_candidate->>'doi')) not between 7 and 200
      or lower(btrim(p_candidate->>'doi')) !~ '^10\.[0-9]{4,9}/[^[:space:]]+$' then
      raise exception using errcode = '22023', message = 'Invalid DOI';
    end if;
    v_doi := lower(btrim(p_candidate->>'doi'));
  end if;

  if p_candidate ? 'authors' then
    if jsonb_typeof(p_candidate->'authors') is distinct from 'array'
      or jsonb_array_length(p_candidate->'authors') > 30 then
      raise exception using errcode = '22023', message = 'Invalid source authors';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_candidate->'authors') as author(value)
      where jsonb_typeof(author.value) is distinct from 'string'
        or length(btrim(author.value #>> '{}')) > 180
    ) then
      raise exception using errcode = '22023', message = 'Invalid source author name';
    end if;
    select nullif(string_agg(btrim(value), ', ' order by ordinal), '')
      into v_author_name
      from jsonb_array_elements_text(p_candidate->'authors') with ordinality as authors(value, ordinal);
  end if;

  v_publisher := nullif(left(btrim(coalesce(p_candidate->>'publisher', p_candidate->>'venue', '')), 300), '');

  if coalesce(p_candidate->>'publicationDate', '') ~ '^\d{4}-\d{2}-\d{2}$'
    and to_char(to_date(p_candidate->>'publicationDate', 'YYYY-MM-DD'), 'YYYY-MM-DD') = p_candidate->>'publicationDate' then
    v_publication_date := (p_candidate->>'publicationDate')::date;
  end if;

  -- DOI is the stable canonical identity when available; otherwise retain the provider URL.
  v_canonical_url := case when v_doi is not null
    then 'https://doi.org/' || v_doi
    else v_source_url
  end;

  insert into public.mavis_sources (
    canonical_url, source_type, external_id, title, author_name, publisher,
    published_on, rights_status
  )
  values (
    v_canonical_url, 'academic', v_provider || ':' || v_provider_record_id,
    v_title, v_author_name, v_publisher, v_publication_date, 'unknown'
  )
  on conflict (canonical_url) do update
    set title = excluded.title,
        author_name = coalesce(excluded.author_name, public.mavis_sources.author_name),
        publisher = coalesce(excluded.publisher, public.mavis_sources.publisher),
        published_on = coalesce(excluded.published_on, public.mavis_sources.published_on),
        updated_at = now()
  returning id into v_source_id;

  -- Repeated imports of the same source return the existing generated draft.
  select article.id into v_existing_article_id
  from public.mavis_article_sources article_source
  join public.mavis_articles article on article.id = article_source.article_id
  where article_source.source_id = v_source_id
    and article_source.relation_type = 'research_background'
    and article.origin_type = 'metadata_only'
  order by article.created_at asc
  limit 1;

  if v_existing_article_id is not null then
    return jsonb_build_object(
      'articleId', v_existing_article_id,
      'sourceId', v_source_id,
      'created', false,
      'status', 'existing'
    );
  end if;

  v_slug := 'source-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 24);

  insert into public.mavis_articles (
    slug, title, author_name, excerpt, category, tags, content,
    content_schema_version, seo_title, seo_description, status,
    origin_type, current_version, last_change_note, created_by, updated_by
  )
  values (
    v_slug,
    v_title,
    v_author_name,
    'پیش‌نویس اولیه بر پایه فراداده منبع؛ متن کامل هنوز تدوین نشده است.',
    'پژوهش حقوقی',
    array[]::text[],
    jsonb_build_object(
      'intro', 'این پیش‌نویس فقط از فراداده منبع ساخته شده و نیازمند بررسی و تکمیل مدیر است.',
      'sections', jsonb_build_array(jsonb_build_object(
        'heading', 'یادداشت تدوین و بررسی',
        'body', 'متن علمی یا حقوقی این مقاله هنوز تهیه نشده است. مدیر باید محتوا، اعتبار منبع، ارتباط آن با حقوق ایران و وضعیت حقوق نشر را جداگانه بررسی کند.'
      )),
      'warning', 'حقوق بازنشر نامشخص است. از درج متن کامل، چکیده یا تصویر منبع بدون مجوز معتبر خودداری شود.'
    ),
    1,
    left(v_title, 300),
    'پیش‌نویس نیازمند بررسی و تکمیل مدیر؛ منبع و حقوق استفاده باید جداگانه ارزیابی شوند.',
    'draft',
    'metadata_only',
    1,
    'Imported source metadata; editorial completion required',
    v_actor,
    v_actor
  )
  returning id into v_article_id;

  insert into public.mavis_article_sources (
    article_id, source_id, relation_type, citation_label, sort_order
  )
  values (
    v_article_id, v_source_id, 'research_background', 'منبع کشف‌شده؛ حقوق استفاده بررسی‌نشده', 0
  );

  select jsonb_build_object(
    'slug', slug,
    'title', title,
    'author_name', author_name,
    'excerpt', excerpt,
    'category', category,
    'tags', to_jsonb(tags),
    'content', content,
    'content_schema_version', content_schema_version,
    'seo_title', seo_title,
    'seo_description', seo_description,
    'status', status
  )
  into v_snapshot
  from public.mavis_articles
  where id = v_article_id;

  insert into public.mavis_article_versions (
    article_id, version, snapshot, change_note, created_by
  )
  values (
    v_article_id, 1, v_snapshot,
    'Imported source metadata; editorial completion required', v_actor
  );

  insert into public.mavis_article_audit_events (
    article_id, source_id, actor_id, event_type, previous_status,
    next_status, article_version, metadata
  )
  values (
    v_article_id, v_source_id, v_actor, 'import_completed', null,
    'draft', 1,
    jsonb_build_object(
      'provider', v_provider,
      'provider_record_id', v_provider_record_id,
      'rights_status', 'unknown',
      'import_mode', 'metadata_only'
    )
  );

  return jsonb_build_object(
    'articleId', v_article_id,
    'sourceId', v_source_id,
    'created', true,
    'status', 'draft'
  );
end;
$function$;

revoke all on function public.import_mavis_source_candidate(jsonb)
  from public, anon, service_role;
grant execute on function public.import_mavis_source_candidate(jsonb)
  to authenticated;

comment on function public.import_mavis_source_candidate(jsonb) is
  'Atomically imports normalized source metadata into a new draft with provenance, unknown rights, immutable version one, and audit event. Never imports source text or publishes.';
