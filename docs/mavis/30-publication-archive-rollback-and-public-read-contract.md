# MAVIS Publication, Archive, Rollback, and Public Read Contract

## State machine

- `draft`, `changes_requested`, and `needs_update` can be submitted for review only at their current immutable version.
- `in_review` accepts exactly one decision for the current version: `approved`, `changes_requested`, or `rejected`.
- `approved` can be published only when an append-only approval record exists for the exact current version.
- `published` is visible to anonymous readers through the existing published-only RLS policy.
- `archived` is never publicly visible.
- Restoring an archived article that was previously published returns it to `approved`, clears `published_at`, and requires an explicit new publish action.
- Rollback copies a historical immutable snapshot into a new version, changes the article to `draft`, clears `published_at`, and requires review and publication again.

## Atomic operations

Migration 012 adds guarded RPCs:

- `publish_mavis_article(article_id, expected_version)`
- `archive_mavis_article(article_id, expected_version, note)`
- `restore_mavis_article(article_id, expected_version)`
- `rollback_mavis_article_version(article_id, expected_current_version, target_version, note)`
- `get_public_mavis_article_sources(article_id)`

All editorial mutation RPCs:
- require a verified site administrator;
- use `SECURITY DEFINER` with an empty search path and schema-qualified relations;
- lock the article row and compare the expected version before changing state;
- write an audit event in the same transaction;
- never publish a historical version implicitly.

The public source RPC is intentionally read-only and returns only title, canonical URL, source type, relation type, and citation label for currently published articles. It excludes image and dataset relations and does not expose rights-review notes.

## Public article delivery

- The public article index keeps the existing static editorial accordion and adds a separate section for published CMS articles.
- The CMS section uses keyset pagination ordered by `published_at desc, id desc`, with 25 articles per page.
- The cursor preserves the database timestamp string, including microseconds.
- Legacy static article slugs have precedence and are reserved by the editor to avoid route collisions.
- CMS detail routes query by slug **and** `status=published`; a draft, rejected, approved, or archived row cannot be rendered by the public page.
- Public queries use a dedicated anonymous Supabase client configured with the publishable key and disabled session persistence. RLS remains the access boundary; no service-role or secret key is used.
- Structured data uses visible article content, category, author, and publication/update timestamps.

## Safety constraints

- Approval is not publication.
- Archive is reversible, but restore does not republish.
- Rollback is not a time machine that silently restores public state; it creates a new draft version.
- Public source metadata is restricted to citation-like relations. Image and dataset links are excluded until explicit rights handling exists.
- Static public pages remain intact if the CMS environment is unavailable or migrations are not yet applied.

## Not included

- Production migration execution, merge, or deployment.
- Automatic publication or automatic rollback.
- Public exposure of full source text, abstracts, PDFs, images, or private rights-review evidence.
- Candidate triage queue, AI-assisted content completion, and distributed provider concurrency leases.
