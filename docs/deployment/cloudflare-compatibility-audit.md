# Cloudflare Compatibility Audit

**Date:** 2026-11-11  
**Repository:** `ahmadmousavi5908-crypto/vakilsite`  
**Base branch:** `work/mother-two-updated-mavis-20261110`  
**Audit branch:** `audit/cloudflare-compatibility-20261111`  
**Pull request:** [#85](https://github.com/ahmadmousavi5908-crypto/vakilsite/pull/85)

## Safety boundary

This is a non-deploying compatibility investigation. The approved Mother Two Updated baseline is not modified directly. No production credentials are used, no remote resources are created, and no deployment command is run.

The OpenNext and Wrangler configuration files on this branch are audit-only. Adapter dependencies are installed ephemerally in CI with `--no-save --package-lock=false`; they are not added to the project's package manifest or lockfile.

## Existing application surface inspected

- Next.js `16.4.3`, React `19.3.0`, Node.js CI target `24`.
- App Router, 19 pages, 2 layouts, 6 route handlers.
- Next.js 16 `src/proxy.js` refreshes Supabase SSR cookies using `getAll` / `setAll`.
- Server Actions include `node:crypto` `randomUUID`.
- Admin authentication uses `@supabase/ssr`, cookie-backed sessions, `getClaims()`, and the `is_site_admin` RPC.
- MAVIS knowledge search is a server-only route and declares `runtime = "nodejs"`.
- Existing Next.js build uses Webpack and has no Cloudflare adapter configuration in the baseline.

## Vinext compatibility scan

- Tool: `vinext@1.3.1`
- GitHub Actions run: `42920099488`
- Result: **success**
- Report: **97% compatible**, 17 supported, 1 partial, 0 detected issues.
- The scan recognized all 7 imported Next.js modules, App Router, all 6 route handlers, and Next.js 16 `src/proxy.js`.
- Partial item: `next/image` / image configuration. Resizing requires an image optimizer; without one, images are served as-is. The current `next.config.mjs` does not define a vinext optimizer.
- Additional semantic review required: vinext documents that route `runtime` settings are ignored on Workers. The MAVIS route's explicit `runtime = "nodejs"` therefore needs runtime-level testing, not just a static compatibility score.

## OpenNext comparison

- Adapter: `@opennextjs/cloudflare@1.20.16`
- Wrangler: `4.160.0`
- Configuration: `open-next.config.ts` and `wrangler.jsonc` on this audit branch only.
- Initial dependency-resolution attempt failed safely: adapter 1.20.16 requires Next.js `>=16.4.5`, while the baseline pins `16.4.3`. No peer-dependency override was used.
- Next.js `16.4.5` includes security fixes; the current stable patch is `16.4.6`. The audit workflow now retests OpenNext with Next.js and `eslint-config-next` `16.4.6` applied only to the ephemeral CI checkout.
- The repository's `package.json` and `package-lock.json` remain unchanged by this patch test.
- OpenNext Workers build result: **success** in GitHub Actions run `42920481874`, after the ephemeral CI checkout applied Next.js and `eslint-config-next` `16.4.6`.
- Vinext compatibility scan and OpenNext adapter build both completed successfully in the same run.
- This validates adapter compilation only. No local Workers-runtime preview, Supabase authentication smoke test, production deployment, or domain binding has been performed.

OpenNext is a relevant comparison because its Cloudflare adapter transforms the output of the existing `next build`, supports Next.js 16, and uses the Node.js runtime compatibility layer. Its preview still must be tested for Supabase cookie refresh, Server Actions, API handlers, and image delivery.

## Decision gate

The audit PR was merged into the active Mother Two Updated work branch after both CI jobs succeeded. Do not change the hosting target based only on a compatibility scan or successful adapter build. The next gate is a successful OpenNext build followed by a local Workers-runtime preview and HTTP/authentication smoke tests. Compare image behavior and route semantics before selecting the adapter.
