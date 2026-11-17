# MAVIS — AI Search and Citation Visibility Policy

Last reviewed: 2026-11-17
Production host: https://vakilahmadmousavi.ir

## Goal

Make public, approved Iranian-law material discoverable and citable by search engines and AI answer products without exposing administrator routes, unpublished drafts, or granting unnecessary model-training permissions.

## Verified current policy

The application-generated `/robots.txt` already:
- Allows Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot, and supported user-triggered fetchers to crawl public pages.
- Blocks `/admin` and `/api`.
- Separately disallows GPTBot, ClaudeBot, and Google-Extended. These are training/grounding controls, not the search crawlers needed for public search visibility.

Keep search and training policies separate. Do not open training crawlers merely to improve search citations.

## Provider notes

- **ChatGPT Search:** Keep `OAI-SearchBot` allowed. OpenAI documents that blocking it prevents pages from appearing in ChatGPT search answers. `GPTBot` is a separate model-training crawler.
- **Claude:** Keep `Claude-SearchBot` and `Claude-User` allowed. `ClaudeBot` is a separate training crawler.
- **Google AI features:** Googlebot access and ordinary Search eligibility are the relevant controls for AI Overviews and AI Mode. `Google-Extended` is not a Google Search crawler and does not control inclusion in Google Search.
- **Perplexity:** Keep `PerplexityBot` allowed for search discovery.
- **Grok:** xAI documents a real-time Web Search tool for Grok, but the reviewed documentation does not publish a dedicated website-crawler user-agent for site owners. Keep public pages crawlable through ordinary search infrastructure; do not invent a `GrokBot` rule.\n- **DeepSeek:** No verified, vendor-published web-search crawler token was established in this audit. Do not invent a `DeepSeekBot` rule; maintain normal public crawlability and discoverability through established search indexes.

## Content requirements

1. Only records with an explicit human approval and publication action may appear publicly.
2. Each published record has one stable canonical URL, visible title, summary, record type, publication date, and source citations.
3. Laws, judicial decisions, unifying opinions, advisory opinions, interpretations, and analysis must be visibly distinguished.
4. Legal validity is date-sensitive. Never label a record current without primary-source verification and a recorded review.
5. Public pages must render the important text in server HTML; do not hide the substance behind login, client-only rendering, or interaction.
6. Sitemap entries must include only canonical, published, indexable URLs. Draft, archived, and unpublished content remains excluded.
7. Structured data must match the visible record type and visible facts. It is supplementary, not a ranking guarantee.
8. Keep useful internal links between related laws, opinions, interpretations, and analyses. Do not generate near-duplicate pages to inflate URL count.

## Measurement and operational limits

- Use Google Search Console URL Inspection, indexing reports, sitemap status, and query/page performance to diagnose discovery.
- Review access logs for verified crawler user agents; validate IP ranges against the vendor's own published files before treating a request as genuine.
- Submit eligible new/updated URLs through the existing IndexNow workflow where supported; this does not replace Google sitemap/Search Console submission.
- Track AI referrals and citations only where observable. No third-party service can guarantee placement in ChatGPT, Claude, DeepSeek, Grok, or another model's answers.
- Recheck vendor crawler documentation quarterly and after provider announcements.

## Deliberately not added

- No `llms.txt` file as a supposed ranking shortcut. Google states that special AI text files are not required for AI Search inclusion and do not improve Google Search visibility.
- No blanket allow rule for training crawlers.
- No guessed DeepSeek or Grok user-agent directives.
- No automatic publication or automatic legal-validity claims.
