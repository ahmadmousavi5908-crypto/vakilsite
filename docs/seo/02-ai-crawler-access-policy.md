# AI Crawler Access Policy
**Date:** 2026-11-04
**Status:** Verified policy baseline; deployment/WAF still requires inspection.
**Scope:** Public pages of Vakilsite. This policy never grants access to client records, admin pages, private APIs, or unpublished material.

## 1. Core distinction

Do not treat all AI crawlers as one class. Search indexing, user-triggered retrieval, and model-training collection have different purposes and controls. Robots directives are crawl preferences, not authentication or data protection. Sensitive routes must be protected by server-side authorization regardless of robots.txt.

## 2. Verified platform controls

| Platform | User agent | Purpose | Current site policy |
|---|---|---|---|
| OpenAI | OAI-SearchBot | Discover pages for ChatGPT Search | Allow |
| OpenAI | GPTBot | Collect public web content that may be used to improve foundation models | Disallow by default; owner can change only through a recorded policy decision |
| OpenAI | ChatGPT-User | Fetch pages in response to user actions | Not equivalent to search indexing; review separately |
| Anthropic | Claude-SearchBot | Search/retrieval discovery | Allow |
| Anthropic | Claude-User | User-requested fetches | Allow only public content; protect private resources independently |
| Anthropic | ClaudeBot | Model-training data collection | Disallow by default |
| Perplexity | PerplexityBot | Search index discovery and citations | Allow |
| Perplexity | Perplexity-User | User-requested page fetches | User-triggered fetch generally ignores robots.txt; WAF and server access policy remain relevant |
| Google | Googlebot | Google Search crawling, including eligibility for AI search features | Allow |
| Google | Google-Extended | Controls certain Google AI model training/grounding uses; not a Search crawler control | Disallow by default pending owner policy |
| Microsoft | Bingbot | Bing indexing and Copilot grounding discovery | Allow |

The robots policy in src/app/robots.js currently allows public access for search-oriented agents and blocks GPTBot, ClaudeBot, and Google-Extended. PerplexityBot and Perplexity-User are already listed as allowed. Do not infer that an Allow directive can force a user-triggered agent to fetch a page.

## 3. Perplexity-specific operational requirement

Perplexity's official crawler documentation states:
- PerplexityBot is intended to surface and link websites in Perplexity search results and is not used to crawl content for foundation-model training.
- Perplexity-User fetches pages when a user asks a question and may include a link in the answer; it is not used for foundation-model training.
- Perplexity-User generally ignores robots.txt because the fetch is user-requested.
- If a WAF is used, match the exact User-Agent together with the platform's published IP ranges. User-Agent alone can be spoofed.
- Published IP ranges are maintained in official JSON endpoints and may change. Do not hardcode copied ranges into the application.

Official source: https://docs.perplexity.ai/docs/resources/perplexity-crawlers

Operational actions:
1. Identify the actual hosting/CDN/WAF provider.
2. Inspect whether bot protection or rate limiting blocks legitimate crawlers.
3. If an allow rule is needed, match User-Agent AND the current official IP ranges.
4. Monitor access logs and update the allowlist from the official endpoints using a controlled process.
5. Never disable the WAF globally or trust User-Agent strings alone.

## 4. OpenAI and Anthropic references

- OpenAI crawler definitions and published IP ranges: https://developers.openai.com/api/docs/bots
- Anthropic crawler and robots guidance: https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Google AI features and Search eligibility: https://developers.google.com/search/docs/appearance/ai-features
- Google-Extended control: https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers

Recheck official documentation before any future policy change; crawler names, behavior, and IP ranges can change.

## 5. Site-wide safety requirements

- Do not publish confidential client information, internal case notes, admin pages, private API output, or documents that have not been approved for public release.
- robots.txt is public and must not contain secrets or reveal sensitive internal route names unnecessarily.
- Do not rely on robots.txt to secure endpoints.
- Require authentication and authorization on admin/private routes and APIs.
- Review CDN/WAF behavior separately from robots.txt.
- Keep training crawlers separate from search crawlers in policy and documentation.
- Do not promise inclusion, ranking, or citations merely because a crawler is allowed.

## 6. Verification checklist

- [ ] Confirm the real canonical production domain.
- [ ] Fetch production /robots.txt and verify generated rules.
- [ ] Confirm sitemap URL points to the same canonical HTTPS origin.
- [ ] Verify Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, and PerplexityBot are not blocked by CDN/WAF.
- [ ] Confirm GPTBot, ClaudeBot, and Google-Extended follow the owner's documented policy.
- [ ] Confirm admin and API routes reject unauthenticated requests even if directly requested.
- [ ] Check access logs against official IP ranges where the platform publishes them.
- [ ] Repeat after CDN, hosting, robots, or domain changes.
