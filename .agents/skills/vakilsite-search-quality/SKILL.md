---
name: vakilsite-search-quality
description: Audit and improve Vakilsite technical SEO, Google Search, Google News readiness, AEO/GEO discoverability, local search, and editorial quality using current official guidance and measured evidence.
license: Proprietary
---

# Vakilsite Search Quality Skill

Use this skill before changing search visibility, metadata, structured data, robots, sitemaps, article publishing, local SEO, or AI-search readiness.

## Non-negotiable principles

1. Google Search's official guidance is the source of truth. AEO/GEO are not separate ranking loopholes. Do not recommend hacks that Google explicitly says are unnecessary or ineffective.
2. Never promise rankings, indexing, AI citations, Google News inclusion, leads, or traffic.
3. Never create city doorway pages, near-duplicate legal articles, fake author credentials, invented citations, fake reviews, fabricated dates, or unsupported case outcomes.
4. Preserve the approved Vakilsite design and content. SEO changes must not alter visible layout unless separately approved.
5. Every legal article must identify jurisdiction, author/reviewer, publication/update date, primary sources, law version/effective date, and limitations. Secondary articles cannot satisfy primary-source verification.
6. Keep personal/client data out of analytics, Search Console exports, prompts, logs, public knowledge, and generated reports.
7. Distinguish crawl discovery, indexing eligibility, actual indexing, ranking, clicks, conversions, and AI citations. They are different measurements.
8. Use only official APIs and current documented endpoints. Do not invent Google Trends, Bing Webmaster, Search Console, or News API endpoints.

## Workflow

1. Inspect existing metadata, route generation, canonical rules, robots, sitemap, JSON-LD, article data, internal links, redirects, and current tests before editing.
2. Establish a baseline with build/tests, Search Console/Bing data if genuinely connected, and reproducible crawler/Lighthouse results.
3. Classify findings as critical, high, medium, or informational; include affected URLs and reproducible evidence.
4. Propose the smallest reversible patch. Avoid bulk rewrites and broad schema injection.
5. Validate rendered HTML, canonical URL, robots directives, sitemap membership, structured data syntax, HTTP status, mobile behavior, and regression tests.
6. Record exact commit, test run IDs, metrics, limitations, and next action in docs/PROJECT-CONTINUITY-2026-11-09.md.

## Google Search and AI features

- A page must be crawlable, indexable, and eligible for a snippet before it can be a supporting link in AI Search features.
- Prioritize unique expert-led content, first-hand legal analysis, transparent authorship, primary sources, helpful internal links, accessible HTML, and strong page experience.
- Do not create llms.txt, artificial content chunks, special GEO schema, or rewrite prose solely for AI visibility as Google ranking tactics.
- Structured data must match visible content and be validated. It can clarify entities and eligibility; it does not guarantee rich results or AI citations.
- Use WebSite schema on the homepage only for the preferred site name. Keep canonical host and site name consistent.
- Article/BlogPosting/NewsArticle markup must reflect real authorship, publication dates, modification dates, headline, image, and canonical page.

## Google News

- Do not label ordinary evergreen legal explainers as news to chase traffic.
- News sitemap is only for a genuine news publisher and recent articles created within the last 48 hours; update one stable sitemap rather than generating a new file per post.
- News pages require permanent unique URLs, accessible HTML links, visible headline and date, author/publisher transparency, contact details, and compliance with News policies.
- Keep legal analysis separate from time-sensitive news reporting; record original publication date and substantive correction history.

## Local search

- Maintain one consistent, verifiable attorney and office identity. Use real office address/contact details only after owner confirmation.
- City coverage must reflect real service availability and distinct useful content. No city-name substitution pages.
- Google Business Profile and third-party citations must be accurate, consistent, and not manufactured.

## Measurement

Track separately: crawl errors, sitemap processing, indexed canonical URLs, branded/non-branded query clicks and impressions, CTR, position, Core Web Vitals, qualified inquiries, and available AI performance data.
Search Console Search Analytics may return top rows rather than a complete dataset and is quota-limited. Cache results, use bounded date ranges, and avoid repeating expensive page+query combinations.
