create table if not exists public.mavis_source_candidates (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('crossref','semantic_scholar','openalex')),
  provider_record_id text not null,
  provider_aliases jsonb not null default '[]'::jsonb check (jsonb_typeof(provider_aliases)='array'),
  doi text,
  doi_normalized text generated always as (lower(nullif(btrim(doi),''))) stored,
  title text not null,
  authors text[] not null default '{}'::text[],
  publisher text,
  venue text,
  publication_date_text text,
  publication_date_precision text not null default 'unknown' check (publication_date_precision in ('unknown','year','month','day')),
  canonical_url text not null check (canonical_url ~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'),
  source_type text not null default 'academic' check (source_type='academic'),
  rights_status text not null default 'unknown' check (rights_status='unknown'),
  state text not null default 'discovered' check (state in ('discovered','imported','ignored')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  imported_source_id uuid references public.mavis_sources(id) on delete set null,
  imported_article_id uuid references public.mavis_articles(id) on delete set null,
  discovered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_record_id),
  check (char_length(btrim(provider_record_id)) between 1 and 300),
  check (char_length(btrim(title)) between 3 and 500),
  check ((state='imported') = (imported_article_id is not null and imported_source_id is not null))
);

create unique index if not exists mavis_source_candidates_doi_uidx
  on public.mavis_source_candidates(doi_normalized) where doi_normalized is not null;
create index if not exists mavis_source_candidates_state_updated_idx
  on public.mavis_source_candidates(state, updated_at desc, id desc);

create table if not exists public.mavis_source_candidate_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.mavis_source_candidates(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('discovered','refreshed','imported','ignored')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);
create index if not exists mavis_source_candidate_events_candidate_idx
  on public.mavis_source_candidate_events(candidate_id, created_at desc);

alter table public.mavis_source_candidates enable row level security;
alter table public.mavis_source_candidate_events enable row level security;
drop policy if exists "Admins can read source candidates" on public.mavis_source_candidates;
create policy "Admins can read source candidates" on public.mavis_source_candidates
  for select to authenticated using (public.is_site_admin());
drop policy if exists "Admins can read source candidate events" on public.mavis_source_candidate_events;
create policy "Admins can read source candidate events" on public.mavis_source_candidate_events
  for select to authenticated using (public.is_site_admin());

revoke all on public.mavis_source_candidates from public, anon, authenticated, service_role;
revoke all on public.mavis_source_candidate_events from public, anon, authenticated, service_role;
grant select on public.mavis_source_candidates to authenticated;
grant select on public.mavis_source_candidate_events to authenticated;

create or replace function public.store_mavis_source_candidates(p_candidates jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_item jsonb;
  v_provider text;
  v_record_id text;
  v_doi text;
  v_title text;
  v_url text;
  v_authors text[];
  v_date text;
  v_precision text;
  v_alias jsonb;
  v_id uuid;
  v_state text;
  v_new boolean;
  v_result jsonb := '[]'::jsonb;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode='42501', message='Administrator access required';
  end if;
  if p_candidates is null or jsonb_typeof(p_candidates) is distinct from 'array' then
    raise exception using errcode='22023', message='Candidate batch must be a JSON array';
  end if;
  if jsonb_array_length(p_candidates)>15 then
    raise exception using errcode='22023', message='Candidate batch must contain at most 15 records';
  end if;

  for v_item in select value from jsonb_array_elements(p_candidates) loop
    if jsonb_typeof(v_item) is distinct from 'object' then
      raise exception using errcode='22023', message='Candidate must be a JSON object';
    end if;
    if v_item - array['provider','providerRecordId','doi','title','authors','publisher','venue','publicationDate','sourceUrl','sourceType','rightsStatus']::text[] <> '{}'::jsonb then
      raise exception using errcode='22023', message='Candidate contains unsupported fields';
    end if;

    v_provider := v_item->>'provider';
    v_record_id := btrim(coalesce(v_item->>'providerRecordId',''));
    v_title := btrim(coalesce(v_item->>'title',''));
    v_url := btrim(coalesce(v_item->>'sourceUrl',''));
    if v_provider is null or v_provider not in ('crossref','semantic_scholar','openalex')
      or v_item->>'sourceType' is distinct from 'academic' then
      raise exception using errcode='22023', message='Unsupported source provider or type';
    end if;
    if length(v_record_id) not between 1 and 300 then
      raise exception using errcode='22023', message='Invalid provider record identifier';
    end if;
    if length(v_title) not between 3 and 500 then
      raise exception using errcode='22023', message='Invalid candidate title';
    end if;
    if length(v_url)>2000 or v_url !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$' then
      raise exception using errcode='22023', message='Invalid HTTPS source URL';
    end if;

    v_doi := nullif(lower(btrim(coalesce(v_item->>'doi',''))),'');
    if v_doi is not null and (length(v_doi) not between 7 and 200 or v_doi !~ '^10\.[0-9]{4,9}/[^[:space:]]+$') then
      raise exception using errcode='22023', message='Invalid candidate DOI';
    end if;

    v_authors := '{}'::text[];
    if v_item ? 'authors' then
      if jsonb_typeof(v_item->'authors') is distinct from 'array' then
        raise exception using errcode='22023', message='Invalid candidate authors';
      end if;
      if jsonb_array_length(v_item->'authors')>30 then
        raise exception using errcode='22023', message='Invalid candidate authors';
      end if;
      if exists (
        select 1 from jsonb_array_elements(v_item->'authors') a(value)
        where jsonb_typeof(a.value) is distinct from 'string' or length(btrim(a.value #>> '{}'))>180
      ) then
        raise exception using errcode='22023', message='Invalid candidate author name';
      end if;
      select coalesce(array_agg(left(btrim(value),180) order by ordinal),'{}'::text[])
        into v_authors from jsonb_array_elements_text(v_item->'authors') with ordinality a(value,ordinal);
    end if;

    v_date := nullif(btrim(coalesce(v_item->>'publicationDate','')),'');
    v_precision := 'unknown';
    if v_date is not null then
      if v_date ~ '^[0-9]{4}$' then
        v_precision := 'year';
      elsif v_date ~ '^[0-9]{4}-[0-9]{2}$' and substring(v_date,6,2)::integer between 1 and 12 then
        v_precision := 'month';
      elsif v_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        begin
          if to_char(v_date::date,'YYYY-MM-DD') <> v_date then
            raise exception using errcode='22023', message='Invalid candidate publication date';
          end if;
          v_precision := 'day';
        exception when others then
          raise exception using errcode='22023', message='Invalid candidate publication date';
        end;
      else
        raise exception using errcode='22023', message='Invalid candidate publication date';
      end if;
    end if;

    v_alias := jsonb_build_object('provider',v_provider,'providerRecordId',v_record_id,'sourceUrl',v_url);
    perform pg_advisory_xact_lock(hashtextextended(v_provider || ':' || v_record_id,0));
    if v_doi is not null then
      perform pg_advisory_xact_lock(hashtextextended('doi:' || v_doi,0));
    end if;

    select id,state into v_id,v_state
    from public.mavis_source_candidates
    where (v_doi is not null and doi_normalized=v_doi)
       or (provider=v_provider and provider_record_id=v_record_id)
    order by case when v_doi is not null and doi_normalized=v_doi then 0 else 1 end
    limit 1 for update;
    v_new := not found;

    if v_new then
      insert into public.mavis_source_candidates(
        provider,provider_record_id,provider_aliases,doi,title,authors,publisher,venue,
        publication_date_text,publication_date_precision,canonical_url,source_type,
        rights_status,state,metadata,discovered_by
      ) values (
        v_provider,v_record_id,jsonb_build_array(v_alias),v_doi,v_title,v_authors,
        nullif(left(btrim(coalesce(v_item->>'publisher','')),300),''),
        nullif(left(btrim(coalesce(v_item->>'venue','')),300),''),
        v_date,v_precision,v_url,'academic','unknown','discovered',
        jsonb_build_object('rightsStatus','unknown'),v_actor
      ) returning id into v_id;
      v_state := 'discovered';
      insert into public.mavis_source_candidate_events(candidate_id,actor_id,event_type,metadata)
      values(v_id,v_actor,'discovered',jsonb_build_object('provider',v_provider));
    else
      update public.mavis_source_candidates
      set provider_aliases=case when provider_aliases @> jsonb_build_array(v_alias) then provider_aliases else provider_aliases || jsonb_build_array(v_alias) end,
          title=v_title,
          authors=case when cardinality(v_authors)>0 then v_authors else authors end,
          publisher=coalesce(nullif(left(btrim(coalesce(v_item->>'publisher','')),300),''),publisher),
          venue=coalesce(nullif(left(btrim(coalesce(v_item->>'venue','')),300),''),venue),
          publication_date_text=coalesce(v_date,publication_date_text),
          publication_date_precision=case when v_precision='unknown' then publication_date_precision else v_precision end,
          updated_at=now()
      where id=v_id;
      insert into public.mavis_source_candidate_events(candidate_id,actor_id,event_type,metadata)
      values(v_id,v_actor,'refreshed',jsonb_build_object('provider',v_provider));
    end if;

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'id',v_id,'provider',v_provider,'providerRecordId',v_record_id,'doi',v_doi,
      'title',v_title,'authors',to_jsonb(v_authors),'publisher',v_item->>'publisher',
      'venue',v_item->>'venue','publicationDate',v_date,'sourceUrl',v_url,
      'sourceType','academic','rightsStatus','unknown','state',v_state,'created',v_new,
      'articleId',(select imported_article_id from public.mavis_source_candidates where id=v_id),
      'sourceId',(select imported_source_id from public.mavis_source_candidates where id=v_id)
    ));
  end loop;
  return jsonb_build_object('candidates',v_result);
end;
$function$;

create or replace function public.import_mavis_source_candidate_from_queue(p_candidate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_candidate public.mavis_source_candidates%rowtype;
  v_import jsonb;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode='42501', message='Administrator access required';
  end if;
  select * into v_candidate from public.mavis_source_candidates where id=p_candidate_id for update;
  if not found then raise exception using errcode='P0002', message='Source candidate not found'; end if;
  if v_candidate.state='ignored' then raise exception using errcode='55000', message='Ignored candidate cannot be imported'; end if;
  if v_candidate.state='imported' then
    return jsonb_build_object('candidateId',v_candidate.id,'articleId',v_candidate.imported_article_id,'sourceId',v_candidate.imported_source_id,'created',false,'status','existing');
  end if;

  v_import := public.import_mavis_source_candidate(jsonb_build_object(
    'provider',v_candidate.provider,
    'providerRecordId',v_candidate.provider_record_id,
    'doi',v_candidate.doi,
    'title',v_candidate.title,
    'authors',to_jsonb(v_candidate.authors),
    'publisher',coalesce(v_candidate.publisher,v_candidate.venue),
    'publicationDate',v_candidate.publication_date_text,
    'sourceUrl',v_candidate.canonical_url,
    'sourceType',v_candidate.source_type,
    'rightsStatus','unknown'
  ));

  update public.mavis_source_candidates
  set state='imported',
      imported_source_id=(v_import->>'sourceId')::uuid,
      imported_article_id=(v_import->>'articleId')::uuid,
      updated_at=now()
  where id=v_candidate.id;
  insert into public.mavis_source_candidate_events(candidate_id,actor_id,event_type,metadata)
  values(v_candidate.id,v_actor,'imported',jsonb_build_object('article_id',v_import->>'articleId','source_id',v_import->>'sourceId'));
  return v_import || jsonb_build_object('candidateId',v_candidate.id,'status','imported');
end;
$function$;

create or replace function public.ignore_mavis_source_candidate(p_candidate_id uuid,p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_state text;
begin
  if v_actor is null or not public.is_site_admin() then
    raise exception using errcode='42501', message='Administrator access required';
  end if;
  if length(coalesce(p_note,''))>1000 then
    raise exception using errcode='22023', message='Candidate note is too long';
  end if;
  select state into v_state from public.mavis_source_candidates where id=p_candidate_id for update;
  if not found then raise exception using errcode='P0002', message='Source candidate not found'; end if;
  if v_state='imported' then raise exception using errcode='55000', message='Imported candidate cannot be ignored'; end if;
  if v_state<>'ignored' then
    update public.mavis_source_candidates set state='ignored',updated_at=now() where id=p_candidate_id;
    insert into public.mavis_source_candidate_events(candidate_id,actor_id,event_type,metadata)
    values(p_candidate_id,v_actor,'ignored',jsonb_build_object('note',nullif(btrim(coalesce(p_note,'')),'')));
  end if;
  return jsonb_build_object('candidateId',p_candidate_id,'status','ignored');
end;
$function$;

revoke all on function public.store_mavis_source_candidates(jsonb) from public,anon,service_role;
revoke all on function public.import_mavis_source_candidate_from_queue(uuid) from public,anon,service_role;
revoke all on function public.ignore_mavis_source_candidate(uuid,text) from public,anon,service_role;
grant execute on function public.store_mavis_source_candidates(jsonb) to authenticated;
grant execute on function public.import_mavis_source_candidate_from_queue(uuid) to authenticated;
grant execute on function public.ignore_mavis_source_candidate(uuid,text) to authenticated;
