# MAVIS Article CMS — Data Model and Security Design

**Status:** Initial schema and guarded draft-write foundation implemented in migrations 007–008 and covered by local pgTAP tests. Production remains unchanged.
**Target branch:** `feature/mavis-cms-inventory-preview-20261114`
**Scope:** Editorial articles and their source/provenance records. This design does not cover private client files, legal casework, or public intake conversations.

## 1. Decisions and non-negotiable boundaries

1. The existing `src/data/articles.js` remains the public content source until a database-backed read path is separately implemented, tested, and explicitly released.
2. The current admin catalog remains read-only until the authenticated draft editor and its end-to-end tests are delivered. Migration 008 adds only an administrator-checked draft save operation; it does not import, approve, publish, archive, or deploy content.
3. Imported legacy articles start as `draft`. Importing a row must never imply legal review, copyright permission, approval, or publication.
4. Every publication requires an explicit approval record for the exact current article version. A status update alone is not approval.
5. No CMS write path may use a Supabase secret/service-role key. The guarded draft RPC uses the signed-in administrator's JWT, checks the database admin predicate, and atomically writes the draft, immutable version, and audit event. A service-role credential bypasses RLS and is not an authorization boundary.
6. Public reads are limited to published rows. Admin reads and mutations are independently authorized in both the server data-access layer and PostgreSQL.
7. Article content, source metadata, permission evidence, approval, version history, and audit events are separate concepts. A source URL alone is not proof of a republication licence.
8. Public-site styling and existing article URLs must remain unchanged during the CMS backend rollout.

## 2. Proposed relational model

Use UUID primary keys for editorial entities and foreign keys with deliberate deletion behavior. Prefer relational source and approval records over hiding provenance in an unvalidated JSON blob.

### 2.1 `public.mavis_articles`

One row per canonical article.

| Field | Type / rule | Purpose |
|---|---|---|
| `id` | uuid PK | Stable identity |
| `slug` | text UNIQUE, normalized | Stable public route key |
| `title`, `excerpt`, `category` | bounded text, NOT NULL | Editorial listing metadata |
| `read_time_minutes` | smallint, bounded | Display estimate |
| `content` | jsonb object, NOT NULL | Intro, ordered sections, checklist, warning |
| `seo_title`, `seo_description` | nullable bounded text | Search metadata |
| `status` | constrained enum/check | Workflow state |
| `origin_type` | constrained text | admin-created, legacy-static-import, licensed-import, link-only |
| `created_by`, `updated_by` | nullable auth.users FK | Actor attribution |
| `created_at`, `updated_at` | timestamptz | Server-maintained timestamps |
| `published_at` | nullable timestamptz | Set only by guarded publication |
| `current_version` | positive integer | Monotonic version number |
| `last_change_note` | bounded nullable text | Human-readable change reason |

Content JSON must be validated at the application boundary and constrained in SQL for its top-level shape and required arrays. Keep a stable schema version in content metadata so future editors can migrate old content safely. Never accept arbitrary HTML as trusted markup.

### 2.2 `public.mavis_sources`

One record per distinct external or internal source.

- Identity: `id`, canonical URL, normalized URL hash, source type.
- Bibliographic metadata: title, author/organization, publication date, retrieval date, publisher, DOI/ISBN or official identifier when available.
- Rights: `rights_status` (unknown, metadata_only, link_only, licensed, public_domain, permission_denied), licence name, licence URL, permission evidence reference, attribution requirements, permitted transformations, expiry/review date.
- Verification: `verification_status`, verifier, verified_at, verification note.
- Do not store copied full text unless rights explicitly allow it. Store a short permitted excerpt only where its legal basis and limit are recorded.

A discovered source defaults to `unknown`, never `licensed`.

### 2.3 `public.mavis_article_sources`

Many-to-many link between article and source.

- `article_id`, `source_id`, relation type (primary_authority, secondary_reference, research_background, image, dataset), display label, citation order, claim/section reference, access date.
- Unique constraint prevents duplicate links for the same article/source/relation.
- The relation must not imply endorsement or republication permission.

### 2.4 `public.mavis_article_versions`

Append-only snapshots of article editorial state.

- `article_id`, `version`, full editorial snapshot, actor, change note, timestamp.
- Unique `(article_id, version)`.
- No direct INSERT/UPDATE/DELETE grants to browser roles. A database-owned trigger or guarded server function records snapshots atomically with the article change.
- Versions are retained when an article is unpublished or archived.

### 2.5 `public.mavis_article_approvals`

Explicit review decisions bound to a precise version.

- `article_id`, `article_version`, decision (approved, changes_requested, rejected), reviewer, decision note, timestamp.
- An approval for version N does not approve version N+1.
- Publication requires an approved record for `current_version`.
- Approval records are append-only; a new decision creates a new record.
- Whether a second-person reviewer is mandatory is a policy decision still open; the workflow must support it without redesign.

### 2.6 `public.mavis_article_audit_events`

Append-only security and workflow audit trail.

- Actor (nullable for controlled system events), article ID, event type, old/new status, version, timestamp, request/correlation ID, minimal metadata.
- Record create, content update, source/rights change, review submission, approval, publication, unpublication, archive, restore, and rejected transition.
- Never log article bodies, access tokens, credentials, or private client data.
- Application logs and audit events are complementary, not substitutes.

### 2.7 Optional ingestion tables, later phase only

`mavis_import_jobs` and `mavis_import_items` may be introduced only when source adapters are designed. They must record adapter, external identifier, discovery time, deduplication key, rights state, import result, and error class. Discovery never creates a published article.

## 3. Workflow and transition rules

Proposed states:

`discovered → imported → draft → in_review → approved → published`

Additional terminal/side states: `changes_requested`, `rejected`, `archived`, `needs_update`.

- `discovered` and `imported` are intake states, not publication states.
- Import creates a draft or metadata-only record. It never sets `approved` or `published`.
- Submitting for review freezes the reviewed version number.
- Any content or material source/rights change increments the version and invalidates approval for the prior version.
- Publish is a dedicated database operation, not a generic status update. It checks the current administrator, current version, approval record, rights state, required metadata, and valid slug.
- Unpublish removes the article from public queries immediately; archive does the same while retaining history.
- Restore is a new audited transition and must not silently republish.
- Rejected or changes-requested content cannot be published until a new review decision exists.

## 4. Database authorization model

### Public reads

- Enable RLS on every exposed table.
- Anonymous visitors receive SELECT only on a narrowly scoped published-article view or published rows.
- Use a Postgres 15+ `security_invoker = true` view if a view is used, so the caller's RLS policies remain effective.
- No public access to source permission evidence, draft content, approvals, versions, or audit events.

### Administrator access

- Server Components, Server Actions, and Route Handlers call the existing fail-closed `requireAdmin()` and independently check authorization for every operation.
- PostgreSQL policies also check the existing `public.is_site_admin()` authorization primitive. Its owner, grants, search_path, and failure behavior must be audited before CMS migration.
- Browser-provided actor IDs, approval IDs, status values, and version numbers are untrusted. Actor identity is derived from the authenticated database session.
- Admin SELECT is allowed through RLS; mutation is exposed only through narrowly scoped guarded functions or carefully constrained table grants and policies.
- Prefer dedicated RPCs for submit-review, approve, publish, unpublish, and archive. Each RPC checks the authenticated actor and performs the state transition atomically.
- Any `SECURITY DEFINER` function must use `SET search_path = ''`, schema-qualify every object, revoke default EXECUTE grants, and grant execution only to the intended role.

### Service role and elevated credentials

- Do not grant `service_role` table or RPC access for ordinary CMS operations.
- Never treat RLS as protection from a service-role credential; it bypasses RLS.
- No import job may directly write `status = 'published'`. If a future trusted worker is needed, give it a separate narrowly scoped ingestion function that can only create draft/intake records and cannot approve or publish.
- Keep secret keys server-only and absent from client bundles, commits, logs, and database content.

### Grants

For each table, explicitly REVOKE default privileges from `PUBLIC`, `anon`, `authenticated`, and `service_role`, then GRANT only the exact required operations. Test both grants and RLS; a policy does not revoke an existing SQL grant.

## 5. Query, scale, and public-route behavior

- Admin listing uses server-side pagination, not downloading all rows to the browser.
- Use keyset pagination ordered by `updated_at DESC, id DESC`; avoid large OFFSET scans. Search/filter columns and indexes must be selected from measured query patterns.
- Initial indexes: unique slug, `(status, published_at DESC, id)`, `(category, status, updated_at DESC, id)`, and any full-text index only after Persian normalization/search behavior is tested.
- Article details are fetched by slug with public status enforced in the database query, not only in page code.
- The existing static fallback must not reappear after a database article is unpublished or archived. Once a slug is database-managed, a missing/unpublished DB row must return not-found; it must not fall back to an old static copy.
- Preserve existing slugs and canonical URLs. Any slug change requires an explicit redirect record and a redirect-loop test.
- Benchmark with realistic article counts (500, 5,000, 20,000) before choosing full-text indexing or an external search service.

## 6. Required test matrix before any migration is approved

| Actor / operation | Read published | Read draft | Create draft | Edit draft | Approve | Publish | Read audit |
|---|---:|---:|---:|---:|---:|---:|---:|
| anon | Allow | Deny | Deny | Deny | Deny | Deny | Deny |
| authenticated non-admin | Allow | Deny | Deny | Deny | Deny | Deny | Deny |
| site admin | Allow | Allow | Allow | Allow | Allow | Only via guarded operation | Allow |
| service_role | No CMS grant | No CMS grant | No CMS grant | No CMS grant | No CMS grant | No CMS grant | No CMS grant |

Required negative tests:
- Missing/expired session and admin RPC failure fail closed.
- User-supplied actor ID cannot impersonate an administrator.
- Direct status update to published is rejected.
- Publishing without approval is rejected.
- Approval for an older version cannot publish a newer version.
- Unknown/denied rights state blocks publication where external content is used.
- Anonymous and non-admin cannot enumerate draft/source/audit/version rows.
- Direct table writes cannot forge audit or approval records.
- Unpublish/archive immediately remove public visibility.
- Service-role requests cannot accidentally become the CMS write path.
- Malformed JSON, oversized text, invalid slug, duplicate slug, invalid URLs, and XSS payloads are rejected or safely rendered.
- Concurrent edits use optimistic version checks; stale updates return a conflict rather than overwriting newer content.

Use pgTAP via `supabase test db` for database grants, policies, functions, triggers, and state transitions, plus application-level tests through the same Supabase SSR client used by the site. CI must run both. A green build alone is not proof of RLS correctness.

## 7. Migration and rollout sequence

1. Audit the current `is_site_admin()` function and existing grants/default privileges.
2. Approve this model and resolve the open policy decisions below.
3. Create a new numbered migration; never edit a migration already applied.
4. Add schema, constraints, indexes, RLS, explicit grants, guarded transition functions, version/audit triggers, and pgTAP tests in the same reviewed change set.
5. Run local Supabase migrations and tests on an isolated database with synthetic data.
6. Import legacy articles into a staging table or draft state only; compare counts, slugs, content, and sources. Do not switch public reads.
7. Test admin pagination, optimistic concurrency, and all negative authorization cases.
8. Run backup and restore verification before any production migration.
9. Only after explicit approval, apply migration and perform a separately approved controlled import.
10. Switch public reads behind a reversible feature flag only after parity checks; preserve URL behavior and remove static fallback for database-managed slugs.
11. Monitor errors and query latency; rollback by disabling the read flag and using the documented compensation plan. Do not delete version/audit history.

## 8. Open decisions that block implementation

- Is one site administrator sufficient, or should publication require a second reviewer?
- Which exact source categories may be republished, and who records permission evidence?
- Retention duration for versions, audit events, import metadata, and backups.
- Whether images/files are in scope for the first CMS release; if yes, storage bucket policies and malware/content validation need a separate design.
- Whether editorial status vocabulary should distinguish `approved` from `published` in the UI.
- Exact Persian full-text search behavior and normalization requirements.

## 9. Official security references

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Postgres roles: https://supabase.com/docs/guides/database/postgres/roles
- Supabase database testing: https://supabase.com/docs/guides/local-development/testing/overview
- Supabase pgTAP RLS testing: https://supabase.com/docs/guides/database/postgres/testing-row-level-security
- Supabase API security and grants: https://supabase.com/docs/guides/api/securing-your-api
