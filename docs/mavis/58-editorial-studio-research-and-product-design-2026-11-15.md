# MAVIS Editorial Studio — Research and Product Design

**Review date:** 15 November 2026  
**Status:** Implementation proposal and acceptance contract  
**Scope:** Third arm of MAVIS: editorial operations, content governance, search intelligence and owner-controlled publication.

## 1. Product decision

The third arm is a private editorial workspace inside the existing admin area. It is not a public-facing feature and is not a replacement for the approved site design.

Its core record is an article with editorial content and structured sections; author, reviewer and legal review state; primary/secondary source references; SEO title, description, canonical slug and indexability; provider observations and retrieval timestamps; and a private draft separated from the published snapshot.

The key invariant is that saving a draft must never alter the live page. Only an explicit administrator publication action copies the draft into the public snapshot.

## 2. International research and transferable lessons

### United States

Thomson Reuters' 2026 State of the US Legal Market reports that average law-firm technology spending rose 9.7% and knowledge-management spending 10.5% in 2025. The report argues that firms with an intentional AI strategy are more likely to report ROI than firms without a significant plan. This supports investing in an integrated workflow and knowledge base rather than a disconnected collection of AI buttons.

The American Bar Association's November/December 2026 practice-management guidance emphasizes one trusted location for current procedures, templates and knowledge, with named content owners, controlled editing rights and scheduled review. The transferable lesson is governance: every content item needs an owner, a current version and a review path.

The 2025 ABA Legal Industry Report also found that firms value AI that integrates with trusted software and fits their actual legal workflow. For MAVIS, this means connecting search data to the article being edited, not making the lawyer copy metrics between unrelated screens.

### Germany

Wolters Kluwer's 2026 German law-firm benchmark reports that 90.9% of surveyed German lawyers use legal research technology, compared with a 73.6% European average. Document management and automation were reported at 52.5%. The strongest established use is research; workflow automation is less mature.

The German Legal Tech Monitor 2025 describes a diverse market in which more than half of surveyed participants had initiated AI projects, while integration, IT security and realistic expectations remained important challenges. The transferable lesson is to start with a dependable research and document workflow, then expand automation only after the workflow is proven.

### Japan

KPMG Japan's 2024 Legal Risk Survey reports that 55.1% of respondents were consolidating prior legal work products and related materials, 34.4% were making internal legal knowledge visible, and 22.3% were collecting and using internal legal information and data. This points to a practical gap between storing documents and making knowledge discoverable.

The International Bar Association's 2026 AI working-group report describes Japanese legal technology use cases including contract review, document review, legal research, case management and translation. It also describes LegalOn's LegalForce as combining AI contract review, contract/knowledge management and a large template database. The transferable lesson is to connect structured records, searchable knowledge and reusable templates while preserving professional responsibility.

### Australia and the wider Asia-Pacific

Clio's 2026 Australian Legal Insights Report, based on more than 1,000 legal professionals and members of the public, highlights an execution gap: buying technology is not the same as embedding it in daily practice. It also reports a gap between AI transparency and formal governance.

LexisNexis' 2025–26 Australian Legal AI survey found 69% of respondents were using or planning to use generative AI for legal work, 45% used it for legal research, and 39% identified inaccurate or fabricated outputs as their biggest concern. The practical implication is that AI-generated content must remain a draft until a qualified human verifies it.

The 2026 APAC AI Sentiment Survey, covering 1,715 legal professionals in ten markets including Australia and Japan, reports 94% AI use but only 58% working under an AI policy and 53% assessing AI value. More than two-thirds said guided workflows would make them more likely to use AI. The transferable lesson is a guided sequence with review checkpoints and measurable outcomes, not autonomous publishing.

## 3. Product features and workflow

### A. Article inventory

A spreadsheet-like table should support title, category, slug, status, author/reviewer and last-edit date; search by title, slug and category; status filters and stable sorting; clear actions to open, edit and preview; and separate labels for a current public article and a newer unpublished draft.

### B. Article editor

The editor should provide title, slug, category and reading time; summary, introduction, structured body sections and checklist; legal warning and source registry; SEO title, meta description and keywords; author and legal reviewer; and a readable preview using the same public content structure.

Do not accept arbitrary HTML. Store structured text and render it as text/React elements to avoid stored XSS.

### C. Review and publication gates

Suggested lifecycle:
1. Draft
2. Legal review pending
3. Approved for publication
4. Published
5. Archived

The first implementation uses explicit administrator controls. Publishing requires author, reviewer, legal review confirmation and at least one HTTPS source. Indexability is a separate owner-controlled choice. A published article can have a newer draft without changing the public snapshot.

For Iranian legal material, the reviewer must verify the current primary source, amendments, effective dates, binding opinions where applicable, and the exact scope of each proposition. Secondary sources may assist research but must not be represented as primary authority.

### D. Search intelligence

Google Search Console should remain read-only and show clicks, impressions, CTR and average position; query/page/country/device and date dimensions; date range, source property, retrieval time and completeness; and URL inspection as a targeted, quota-controlled diagnostic.

Search Console data is not a complete export of all queries. Missing rows are unknown, not zero. Internal opportunity scores must be labelled as heuristics and never as ranking forecasts.

The existing code has a server-side Search Console adapter and a webmasters.readonly scope. The live OAuth credentials/property are not considered connected until an authenticated request against the verified vakilahmadmousavi.ir property succeeds. Existing environment configuration is not proof of connection.

### E. Provider roadmap

1. Google Search Console: finish read-only OAuth connection and live verification.
2. Bing Webmaster Tools: implement only the current REST API contract after confirming OAuth, scopes and quotas. Do not build on retired SOAP/POX examples.
3. Google Analytics 4: reporting-only Viewer access, separated from Search Console metrics.
4. IndexNow: submit only canonical URLs after the owner has explicitly published an article; record the protocol response without claiming indexing.
5. URL Inspection: manual or bounded targeted checks, not a full-site crawl.
6. Google Trends: do not depend on the limited alpha API unless access is actually granted.
7. AI visibility: record real, dated observations and cited URLs; do not scrape engines or infer market-wide visibility from a single answer.

## 4. Security and privacy

- Keep the editorial workspace behind server-side requireAdmin checks.
- Draft content must not be readable by anonymous users.
- Public users may read only published snapshots and only the columns needed to render public articles.
- Keep OAuth credentials and tokens server-side; use the narrowest read-only scope.
- Never send client case data, intake submissions or confidential documents to Search Console, analytics, public AI tools or editorial prompts.
- No automatic edits, publication, indexing submissions or crawler-policy changes.
- Keep audit metadata for author, reviewer, actor and timestamps without copying sensitive matter data into logs.

## 5. Acceptance criteria

- An administrator can find existing site articles in one table.
- An administrator can create a new article, edit text and metadata, and preview it.
- Saving a draft never changes the public version.
- Publishing requires an explicit administrator action and review metadata.
- Public pages render only the published snapshot.
- Draft-only articles are absent from public pages and sitemap.
- Published but non-indexable articles render noindex and are absent from sitemap.
- Public database access cannot retrieve private draft content.
- Existing article URLs and the approved public design remain unchanged.
- Search Console values display only after a real authenticated provider response; otherwise the state remains "not connected".

## 6. Research sources

- Thomson Reuters, 2026 State of the US Legal Market: https://www.thomsonreuters.com/en-us/posts/wp-content/uploads/sites/20/2026/01/2026-State-of-the-US-Legal-Market.pdf
- American Bar Association, Creating an Effective Law Firm Knowledge System (Nov/Dec 2026): https://www.americanbar.org/groups/law_practice/resources/law-practice-magazine/2026/november-december-2026/creating-an-effective-law-firm-knowledge-system/
- American Bar Association, The Legal Industry Report 2025: https://www.americanbar.org/groups/law_practice/resources/law-technology-today/2025/the-legal-industry-report-2025/
- Wolters Kluwer, 2026 German law-firm benchmark: https://assets.contenthub.wolterskluwer.com/api/public/content/3083298-benchmark-report-for-law-firms-2026-565fca7048?v=9a7c6eb8
- Legal Tech Monitor 2025, Germany: https://www.legaltechverband.de/wp-content/uploads/2025/03/Legal-Tech-Monitor-2025_EN.pdf
- KPMG Japan, Legal Risk Survey 2024: https://assets.kpmg.com/content/dam/kpmgsites/jp/pdf/2024/jp-legal-risk-survey2024.pdf.coredownload.inline.pdf
- International Bar Association, AI Working Group Report 2026: https://www.ibanet.org/medias/anlbs-ai-working-group-report-feb-2026-2.pdf
- Clio, 2026 Australian Legal Insights Report: https://www.clio.com/en-au/guides/2026-legal-insights-report/
- LexisNexis, 2025–26 Australian Legal AI Survey: https://www.lexisnexis.com/community/au-resources/b/whitepapers/posts/2025-26-australian-legal-ai-survey-report-adoption-confidence-and-what-s-next
- LexisNexis, 2026 APAC AI Sentiment Survey: https://www.lexisnexis.com/community/amp-resources/195/2026-apac-ai-sentiment-survey-report-adoption-is-near-universal-governance-is-not
- Google Search Console API authorization: https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- Google Search Analytics API: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Google URL Inspection API: https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
