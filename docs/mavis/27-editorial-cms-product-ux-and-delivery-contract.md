# MAVIS Editorial CMS — Product, UX, and Delivery Contract

**Status:** Implementation specification for the prioritized Editorial CMS.  
**Priority:** Current primary engineering track.  
**Product baseline:** `VAKILSITE-MOTHER-TWO-UPDATED-20261106`.  
**Public UI boundary:** Existing homepage, header, menu, floating docks, MAVIS avatar, contact dock, profile, and approved public appearance are protected. New article-library and article-detail routes may receive their own polished editorial design.

## 1. Product outcome

Build an end-to-end, rights-aware editorial system that discovers candidate articles, extracts metadata, assists with permitted content preparation, allows a site administrator to edit every field, records review and version history, and publishes only after an explicit human approval.

The public result must support at least 500–700 articles and grow to several thousand without loading the entire corpus into the browser or redesigning the system.

A read-only catalog preview is not a completed CMS.

## 2. Administrator experience

The editorial workspace must be understandable without technical knowledge. Use Persian RTL labels, clear workflow status, short help text, visible validation errors, and a predictable navigation structure.

### Main work areas
- **Overview:** counts by workflow status, recent activity, failed imports, and items requiring review.
- **Discover:** search approved sources or submit a URL; show source identity, publication date, duplicate matches, and rights status before import.
- **Inbox:** discovered/imported candidates with filters for source, category, date, rights, duplicate status, and processing state.
- **Editor:** editable title, slug, author, source, dates, category, tags, excerpt, article body, images, legal references, SEO title/description, canonical URL, and publication settings.
- **Review:** compare current and previous versions, inspect source/rights evidence, validate required fields, and approve or request changes for one exact version.
- **Published:** search, edit, unpublish, archive, and inspect the public page.
- **History:** immutable version timeline and audit events.

### Editor behavior
- Autosave drafts with explicit save status and safe retry.
- No silent overwrite: use optimistic version checks and show a conflict-resolution screen for stale edits.
- Structured rich-text blocks, not arbitrary trusted HTML.
- Preview must match the public article renderer.
- Every AI-suggested field is editable and visibly identified as machine-assisted until reviewed.
- AI operations are per-field or clearly scoped; never replace an entire article without preview and confirmation.
- Provide clear source/rights warnings beside the affected content.
- Publishing controls stay disabled until all workflow, rights, authorization, and validation gates pass.

## 3. Article intake and AI assistance

AI is an editorial assistant, not an autonomous publisher or legal authority.

### Candidate discovery
- Initial adapters: OpenAlex, Crossref, Semantic Scholar, selected RSS feeds/journals, and manually supplied URLs.
- Provider constraints, rights boundaries, metadata contract, duplicate signals, and network safety requirements are specified in `docs/mavis/28-source-discovery-adapter-design.md`.
- Adapters must be modular, timeout-bounded, retry-safe, and rate-limited.
- Persist external identifiers and canonical URL hashes for deduplication.
- A failed adapter must not block other sources.
- Discovery stores metadata and a candidate record; it does not copy full text or publish.

### Extraction and preparation
For each candidate, the system may extract or propose:
- Title, author, publisher, DOI/identifier, publication date, source URL.
- Language, subject/category, keywords, and short abstract/excerpt.
- A proposed original summary or locally authored commentary where legally permissible.
- SEO title and description.
- Suggested internal links and related existing articles.
- Source and legal references requiring human verification.

Every value must retain provenance: source-extracted, model-suggested, manually edited, or system-derived. Store model/provider, prompt/schema version, timestamp, and source references for generated suggestions where appropriate.

### Rights gate
- Default rights state is `unknown`.
- Unknown or denied rights prohibit copying/republication of full text.
- Metadata, canonical link, and a separately authored short analysis may be used only within applicable legal permissions.
- A URL, public accessibility, or AI paraphrase does not itself establish a republication licence.
- Store licence terms, permission evidence, attribution requirements, permitted transformations, expiry/review date, and verifier when known.
- Rights changes are audited and can block future publication.

## 4. Editorial workflow

`discovered → imported → draft → in_review → approved → published`

Additional states: `changes_requested`, `rejected`, `archived`, `needs_update`.

Rules:
- Imports always create a candidate or draft, never an approved/published article.
- Approval is bound to an immutable article version.
- Any material content, attribution, or rights change increments the version and invalidates prior approval.
- Publish is a dedicated guarded operation, never a generic status update.
- Unpublish removes public visibility immediately.
- Archive retains history and removes public visibility.
- Restore is an audited action and does not silently republish.
- Publication requires required metadata, a unique safe slug, acceptable rights state, a current-version approval, and a valid public render.

## 5. Public article-library experience

The new article-library page and detail pages must feel like a coherent premium legal publication, while preserving the existing website's approved design language.

### Library page
- Clear page title, short introduction, and useful category navigation.
- Search across title, excerpt, category, and indexed content.
- Category and topic filters.
- Featured article area only when a real editorial choice exists.
- Expandable rows/cards with a clear plus/minus control; expansion reveals a concise excerpt and a link to the full article.
- The plus control is progressive enhancement, not the only way to access content.
- Each article has a stable, independently indexable URL.
- Pagination or cursor-based navigation; never render hundreds of full article bodies on one request.
- Helpful empty, loading, and error states.
- Accessible keyboard interaction, visible focus, semantic headings, and reduced-motion support.
- Mobile layout must avoid horizontal overflow and preserve readable typography.

### Article detail page
- Unique title, excerpt, accurate author/byline, category, and publication/updated dates.
- Readable content hierarchy and table of contents for long articles.
- Source citations and rights-compliant attribution.
- Related articles based on actual category/topic relationships.
- Clear general-information disclaimer appropriate to legal content.
- A restrained, consistent contact CTA without pressure or misleading promises.
- Canonical URL, unique metadata, Open Graph, and truthful structured data matching visible content.
- Return link to the library and crawlable internal links.

### Search visibility
- Public queries expose only published content.
- Draft, rejected, archived, and unpublished records must return not-found and must never be resurrected from a static fallback.
- Maintain existing article slugs and canonical URLs during migration.
- Any slug change requires a recorded redirect and redirect-loop tests.
- Sitemap includes only canonical, published, indexable article URLs.
- Structured data must reflect the actual visible author, dates, and article type. Never invent authorship or legal review.
- Avoid mass-produced near-duplicate city pages and thin keyword pages. Geographic relevance should be earned through useful, accurate local material.

## 6. Content strategy and taxonomy

Initial subject taxonomy must support:
- Criminal and penal law: homicide, bodily injury, assault, blood money/diya, threats and violence, criminal procedure.
- Financial/economic disputes: fraud, breach of trust, checks, debt recovery, contracts, property and commercial disputes.
- Family law: divorce, dowry/mahr, maintenance, custody, inheritance.
- Civil law: contracts, ownership, transactions, property, obligations, civil procedure.
- Khuzestan-specific legal issues and city-level information where it provides real local value.
- Nationwide topics relevant to Iranian law.

The proposed 60% criminal/injury/violence and 40% financial/economic split is only an initial editorial hypothesis for Khuzestan, not a verified crime or case-volume statistic. Reassess it using Search Console, actual qualified inquiries, and reviewed research. Do not create content merely to fill a quota.

## 7. Scale and performance

- Admin listing uses server-side keyset pagination with a stable compound cursor.
- Public listing uses server-side pagination and indexed filters.
- Avoid large OFFSET scans and downloading the complete article corpus to client state.
- Index only measured query patterns; candidate indexes include unique slug, status/publication date, category/status/update date, and normalized search fields.
- Benchmark 500, 700, 5,000, and 20,000 synthetic articles.
- Record p50/p95 latency, database query plans, payload size, memory, and error rates.
- Test concurrent editors and duplicate imports.
- Use bounded page sizes and response payloads.
- Keep content body storage separate from list metadata so list queries remain light.

## 8. Security, privacy, and integrity gates

- Every admin route/action checks the existing fail-closed admin authorization.
- Every CMS table has explicit grants and RLS policies.
- Browser roles do not receive direct write access to approvals, versions, audit events, or workflow status transitions.
- Do not use service-role credentials as the normal CMS write path.
- Guarded database operations verify authenticated actor, current article version, rights, and exact approval.
- Append-only audit and version records.
- Validate all URLs, lengths, enums, JSON content schemas, and uploaded file metadata.
- Render content as structured safe blocks; do not inject arbitrary HTML.
- Protect import endpoints against SSRF, private-network targets, oversized responses, redirects to blocked hosts, and malicious document payloads.
- Rate-limit external adapters and AI generation.
- No client data or case files are part of the editorial CMS.
- No production migration, data import, or public-read switch until isolated tests, backup/restore, parity checks, and explicit release approval pass.

## 9. Release gates

A CMS phase is not complete until:
1. Schema migrations apply cleanly to an isolated database.
2. pgTAP verifies grants, RLS, role isolation, workflow functions, and negative cases.
3. Application tests cover admin authorization, validation, conflict handling, and safe rendering.
4. Source adapters have fixtures for malformed, duplicate, unavailable, and malicious sources.
5. Rights-state rules are enforced server-side and in database transitions.
6. Import cannot approve or publish.
7. Approval of an old version cannot publish a newer version.
8. Unpublish/archive immediately remove public visibility.
9. Public library and article detail pages pass SEO, accessibility, mobile, and visual tests.
10. 500/700/5,000/20,000 article benchmarks are recorded.
11. Existing URLs and public-site visual baseline pass regression checks.
12. Backup/restore and rollback procedure is verified before production release.

## 10. Delivery order

1. Finalize schema and state-transition design against the current repository. (Implemented across migrations 007–015; production parity remains unverified.)
2. Add isolated migration and pgTAP security/workflow tests. (Implemented and passing in the isolated Supabase CI workflow.)
3. Implement server-side DAL and admin APIs with fail-closed authorization. (Draft writes, source discovery/import, review decisions, publication, unpublish, archive, restore, and rollback actions are implemented.)
4. Implement admin editorial workspace and structured editor. (Manual-save, version-aware editor and source, review, publication, and archive queues are implemented; autosave remains outstanding.)
5. Implement source discovery/import adapters with rights-aware draft creation. (Crossref and Semantic Scholar metadata discovery plus persistent candidate queue/import are implemented; OpenAlex remains disabled pending enforced budget accounting.)
6. Add field-level AI assistance behind validated provider adapters and cost/time budgets. (Not implemented.)
7. Implement review/version/approval/publish operations. (Implemented with immutable version-bound decisions and separate explicit publication.)
8. Connect public pages to published-only data while preserving legacy URLs and appearance. (Implemented for the published-article section on `/articles`, paginated `/articles/library`, and dynamic published-only detail reads on `/articles/[slug]`; legacy static articles retain precedence.)
9. Add search, categories, pagination, sitemap, structured data, and article detail polish. (Pagination, title/category filters, sitemap entries, canonical metadata, and article structured data are implemented. Full-text/excerpt search, richer category navigation, and broader editorial polish remain outstanding.)
10. Run scale, security, accessibility, SEO, and restore tests before any production rollout. (Isolated security/workflow tests exist; 500/700/5,000/20,000-article benchmarks, production restore verification, and complete visual/accessibility regression evidence remain outstanding.)

## 11. Current baseline facts

- PR #109 introduced the read-only admin catalog preview backed by the static `src/data/articles.js` dataset and the initial structured draft editor.
- The current `/articles` route preserves the static editorial guides and additionally reads a bounded page of published CMS article summaries. The dedicated `/articles/library` route provides server-side pagination with title and exact-category filters.
- The `/articles/[slug]` route gives static articles precedence and otherwise reads only CMS records whose status is `published`. Public source relations are fetched through the restricted public citation RPC and normalized before rendering.
- The admin workspace provides a 25-row keyset-paginated draft inventory, source discovery, a persistent candidate queue, review queue, publication queue, and archive queue. Admin routes and server actions use the existing fail-closed administrator authorization.
- Administrators create and edit drafts through `save_mavis_article_draft`. Updates require the expected version; the RPC writes the article, immutable snapshot, and audit event atomically. The editor uses explicit manual save, not autosave.
- Crossref and Semantic Scholar metadata discovery, candidate persistence/import, version-bound review decisions, separate explicit publication, unpublish, archive, restore, and rollback are implemented. Imported candidates remain metadata-only drafts with unknown rights and are never approved or published automatically.
- Dynamic sitemap generation includes published CMS article URLs in bounded pages. Publication and unpublication actions attempt IndexNow notification; notification delivery is reported separately from the editorial state transition.
- Field-level AI content assistance, RSS/manual-URL intake, cross-provider distributed provider leases, full-text public search, large-corpus benchmarks, and verified backup/restore remain outstanding. OpenAlex must remain disabled until server-enforced usage-budget accounting exists.
- Migrations 007–015 and isolated Supabase tests are present on the current feature branch. CI has passed on the previously verified branch head, but Production migration parity and runtime configuration have not yet been verified.
- Production migrations, Worker deployment, Google OAuth connection, source imports, and public article publication remain gated by explicit release approval.
