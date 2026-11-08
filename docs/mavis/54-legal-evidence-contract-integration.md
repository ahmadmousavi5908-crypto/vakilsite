# MAVIS legal evidence contract and admin retrieval integration

## Purpose

The deterministic knowledge-search endpoint remains retrieval-only. Every returned record now carries a separately assembled evidence object so the admin interface cannot confuse a search hit with a current, legally authoritative source.

## Evidence states

- `verified_primary`: only when the record is explicitly reviewed as primary, the source host belongs to the narrowly maintained official-domain allowlist, source access date exists, `source_verified` is true, validity is explicitly `in_force`, and `last_verified_at` is a valid date.
- `secondary_reference`: only secondary material is available.
- `outdated`: the record explicitly identifies a repealed or outdated source.
- `needs_official_check`: metadata is incomplete, validity is unknown/partially repealed, or the primary-source claim cannot be established.
- `not_found`: no result exists.

The initial primary-host allowlist is deliberately limited to `rrk.ir`, `qavanin.ir`, and `rc.majlis.ir`. This is a classification allowlist, not a statement that these domains were live-checked in this implementation. Adding other authorities requires a reviewed registry change.

## Data integrity

- Only HTTPS URLs without embedded credentials are emitted as citations.
- Invalid dates are converted to null; missing amendment/repeal references are not inferred.
- Partially repealed records are not promoted to fully in-force.
- The contract does not produce a legal opinion or calculate deadlines.
- Human review remains required for every evidence packet.

## Integration

The admin-only `POST /api/mavis/knowledge-search` response includes the evidence object per result. The admin retrieval UI shows source state, validity status, source access/publication dates and version metadata. It displays a clear warning when a primary source is not established. Public pages and public website design are unchanged.

## Release boundary

This contract does not mark any existing law as current by itself, and does not perform live source retrieval. A reviewer must verify the official publication and legal status before setting the source metadata that qualifies a record for `verified_primary`.


## Structured research dossier

The same admin search response now includes a `researchDossier` assembled from the matching existing legal-library records. It separates statutes, amendments, repeals, executive regulations, unifying opinions, published judgments, Administrative Justice Court decisions, advisory opinions, judicial sessions, academic commentary, official guidance, legal terms and educational article summaries.

The dossier reports missing evidence tracks and exact-citation gaps as "not found in the current library", never as proof that no legal source exists. It returns no legal answer and no deadline calculation. The current 170-record seed corpus is mostly statutes, article summaries and legal terms; the absence of amendment/repeal chains, unifying opinions, published judgments and advisory opinions is therefore surfaced explicitly rather than hidden.

A record becomes answer-ready only for internal review when its source evidence meets the conservative primary-source contract. Even then, human legal review remains mandatory.
