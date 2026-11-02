# Search Discovery Infrastructure

This project uses server-rendered legal-library entries, canonical metadata, structured data, a sitemap, explicit crawler policies, webmaster verification, and optional IndexNow notifications.

## Canonical host

Set `NEXT_PUBLIC_SITE_URL` to the exact public HTTPS origin used by the website. Use either the www or non-www host consistently. Do not leave it empty in production.

## Google Search Console and Bing Webmaster Tools

1. Add and verify the canonical site in Google Search Console.
2. Add and verify the same canonical host in Bing Webmaster Tools.
3. Put the verification values in the deployment environment:
   - `GOOGLE_SITE_VERIFICATION`
   - `BING_SITE_VERIFICATION`
4. Deploy and confirm the verification meta tags are present in the HTML head.
5. Submit `/sitemap.xml` in both webmaster consoles.

Verification tokens are optional during local development. They must be the exact values issued by the respective webmaster platform.

## Crawler access and AI training preferences

The generated `robots.txt` applies these policies:

| User-agent tokens | Policy |
| --- | --- |
| `Googlebot`, `Bingbot` | Allow public pages; block `/admin` and `/api` |
| `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot` | Allow public search crawling; block `/admin` and `/api` |
| `ChatGPT-User`, `Claude-User`, `Perplexity-User` | Allow user-initiated retrieval; block `/admin` and `/api` |
| `GPTBot`, `ClaudeBot`, `Google-Extended` | Disallow the entire site |

OpenAI documents OAI-SearchBot and GPTBot as independent controls. Anthropic likewise separates Claude-SearchBot and Claude-User from ClaudeBot. Google-Extended is a separate robots token controlling use of Google-crawled content for Gemini-related model training and grounding; blocking it does not block Google Search indexing.

The wildcard rule keeps public pages available to other crawlers unless they have a more specific rule above. This is not a universal registry of every crawler or training system. Review new crawler tokens when providers publish or change their official documentation.

Robots rules are voluntary crawl preferences, not access control. Keep authentication and authorization on private routes. Hosting providers, CDNs, firewalls, and bot protection can still block otherwise permitted crawlers; verify those layers after deployment.

## IndexNow

IndexNow is optional and primarily helps participating search engines discover URL changes sooner. It does not guarantee crawling, indexing, ranking, or Google inclusion.

1. Generate a key in Termux:
   `node -e "console.log(require('node:crypto').randomBytes(16).toString('hex'))"`
2. Add the result to the local `.env.local` file as `INDEXNOW_KEY=...`.
3. Keep `NEXT_PUBLIC_SITE_URL` set to the canonical HTTPS origin.
4. Run `npm run indexnow:prepare` or `npm run build`. The build lifecycle creates `public/indexnow-key.txt`.
5. After deployment, confirm that `https://YOUR-DOMAIN/indexnow-key.txt` returns only the key.
6. Notify IndexNow only about changed, public, indexable URLs:
   `npm run indexnow:submit -- /articles/example /services/example`

The submission script rejects other hosts, non-HTTPS origins, private admin/API paths, query strings, and fragments. Do not submit the complete sitemap on every deployment. Do not submit legal-library entries while their metadata marks them `noindex`.

The generated key file is ignored by Git. Never commit `.env.local`.

## Legal-library indexing policy

Every term, law, and article summary has its own statically generated route. A record enters the sitemap and receives an indexable robots directive only when its `review_status` is `verified_primary_source`, `source_verified` is `true`, and its `sources` array contains an HTTPS source with `source_type: "primary"`. The validator rejects a record marked verified without this evidence and reports only records that satisfy the full evidence predicate as indexable.

Current data must pass a legal source review before those pages become indexable. A secondary-source link or a technically valid JSON-LD block is not proof that a legal statement is current or authoritative.

## Legal library dataset 1.3.1

The current dataset contains 132 canonical terms, 16 law records, 22 article summaries, 19 taxonomy groups, and 353 curated Persian search phrases. The previous 64-term glossary remains in place; 7 overlapping canonical entries were merged and 57 unique entries were migrated. Additional draft entries cover labor, tax, insurance, administrative and digital-law topics.

Search phrases improve internal retrieval and query coverage. They are not legal sources, do not make a record indexable, and must not be used to justify legal conclusions. Every new record remains outside the sitemap until it is checked against an exact official primary source and its review status is updated.

## Local validation


Run these commands before deployment:

```bash
npm run validate:legal-library-seo
npm run lint
npm run build
npm run start
```

Check the generated `/robots.txt`, HTML canonical URLs, metadata, robots directives, and JSON-LD. After deployment, use Search Console URL Inspection, Bing URL Inspection, and the Rich Results Test where applicable.

Do not add `llms.txt` or AI-only schema as a ranking shortcut. Keep the public pages useful, source-backed, crawlable, and internally linked.
