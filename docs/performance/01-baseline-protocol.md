# Performance Baseline Protocol

**Scope:** Vakilsite Next.js 16.4.3 / React 19.3.0 and MAVIS route performance.  
**Initial mode:** manual, non-blocking baseline. No production changes.

## Tools selected

- Vercel React Best Practices skill: local agent guidance; no runtime dependency.
- `@next/bundle-analyzer@16.4.3`: exact match to the installed Next.js version, MIT, loaded only when `ANALYZE=true`.
- Lighthouse CI `@lhci/cli@0.16.0`: isolated CI-only audit tool, not added to app dependencies.
- CrUX / Search Console: field measurements only when a verified property or sufficient real-user data is available.

## Run

Use GitHub Actions workflow **Site performance and bundle baseline** with workflow_dispatch. It runs a production build, emits client/server bundle reports, then measures the mobile experience on:
- /
- /about
- /articles
- /legal-library

It performs three Lighthouse runs per route and stores the reports as a 14-day workflow artifact. Initial assertions are warnings only; do not turn them into blocking thresholds until a stable baseline exists.

## Interpretation

- Lighthouse is a lab simulation. Do not present its score as real-user Core Web Vitals or a Google ranking.
- Compare the same commit class, runner, route list, and Lighthouse version.
- Use CrUX 28-day field data and Search Console Core Web Vitals for real-user trends when data exists.
- Do not optimize only for aggregate score. Inspect LCP element, INP/TBT, CLS, image/font payload, client JS, hydration, long tasks, server response time, and accessibility.
- Keep primary legal content server-rendered and immediately discoverable. Do not defer critical content merely to improve lab metrics.
- Any optimization must preserve the approved visual design, RTL behavior, accessibility, and all existing page content.

## Bundle analyzer

The analyzer plugin is installed only inside the isolated workflow with `--no-save --no-package-lock`. It is conditionally loaded from `next.config.mjs` only when `ANALYZE=true`; normal builds and runtime do not require it.

## Official references

- Next.js package bundling: https://nextjs.org/docs/app/guides/package-bundling
- Next.js production checklist: https://nextjs.org/docs/app/guides/production-checklist
- Lighthouse CI: https://github.com/GoogleChrome/lighthouse-ci
- CrUX tools and data cadence: https://developer.chrome.com/docs/crux/methodology/tools
- Core Web Vitals: https://web.dev/articles/vitals

## Exit criteria for blocking budgets

Only after at least two comparable baselines:
1. Record p50/p75 route metrics and bundle sizes.
2. Identify regressions and route-specific hotspots.
3. Set warning budgets first, then blocking budgets after false positives are understood.
4. Re-run on representative mobile and desktop routes before merge.
