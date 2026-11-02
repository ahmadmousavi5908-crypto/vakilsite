# Search Discovery Infrastructure

This project uses server-rendered legal-library entries, canonical metadata, structured data, a sitemap, robots rules, webmaster verification, and optional IndexNow notifications.

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

## Crawler access

The current `robots.js` allows all user agents to crawl public paths and blocks only `/admin` and `/api`. This includes search crawlers such as OAI-SearchBot, as long as the hosting provider, CDN, firewall, and bot protection do not block them.

Do not confuse search crawlers with model-training crawlers. OAI-SearchBot and GPTBot have separate purposes and independent controls. Check the official crawler documentation before changing those policies.

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

Every term, law, and article summary has its own statically generated route. A record enters the sitemap and receives an indexable robots directive only when its `review_status` is `verified_primary_source`.

Current data must pass a legal source review before those pages become indexable. A secondary-source link or a technically valid JSON-LD block is not proof that a legal statement is current or authoritative.

## Local validation

Run these commands before deployment:

```bash
npm run validate:legal-library-seo
npm run lint
npm run build
npm run start
```

Check the generated HTML for canonical URLs, metadata, robots directives, and JSON-LD. After deployment, use Search Console URL Inspection, Bing URL Inspection, and the Rich Results Test where applicable.

Do not add `llms.txt` or AI-only schema as a ranking shortcut. Keep the public pages useful, source-backed, crawlable, and internally linked.
