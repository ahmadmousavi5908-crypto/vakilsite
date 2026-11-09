# Third-party SEO crawler review: Scrawly

**Reviewed:** 2026-11-09  
**Repository:** https://github.com/IliasSami/scrawly-seo-crawler  
**Reviewed upstream commit:** 8fdebcf4e365f862ef80fa95d100067e6b911e11 (2026-10-10)  
**License:** MIT  
**Decision:** Do not install in Vakilsite/MAVIS runtime or connect its MCP server. Reconsider only as an isolated, read-only audit application after security fixes and a separate user-approved evaluation.

## Why it looked useful

Scrawly advertises 250 technical SEO, GEO, and AI crawler checks, JavaScript rendering, architecture mapping, structured data, accessibility checks using vendored axe-core, Search Console/GA4 enrichment, PageSpeed/Lighthouse data, AI crawler checks, and an MCP server. It is a desktop application with a local database and a Python/Playwright crawler, not a small Next.js library.

## Security and integration blockers found in source

1. src/sentinelseo/mcp/server.py uses httpx.AsyncClient(..., verify=False) in check_ai_access, disabling TLS certificate verification for outbound probes. This is not acceptable for an audit tool that may contact arbitrary hosts.
2. src/sentinelseo/enrichment/google_oauth.py accepts OAuth callback state when _pending_state is None (_state_ok returns true). After a restart, this weakens CSRF validation. Do not connect a Google account or store credentials in this integration.
3. Its MCP server exposes WordPress mutation tools including apply_fix, create_redirect, and revert. Even with confirmation and rollback gates, these tools are outside the approved read-only scope for Vakilsite.
4. The dependency set includes a desktop app, FastAPI, Playwright/Chromium, SQLAlchemy, FastMCP, OAuth libraries, and WordPress integration. Importing it into the website would add unnecessary runtime attack surface and deployment weight.
5. Its AI provider can transmit page content to a configurable external model provider. That is not allowed for private client/case content and is unnecessary for the first-party deterministic audit.

## Adopted alternatives

- Vercel React Best Practices skill for Next.js/React engineering guidance, vendored under .agents/skills/vercel-react-best-practices.
- First-party Vakilsite Search Quality skill and four focused GitHub Copilot agent profiles.
- Google Lighthouse CLI 13.6.0 and @next/bundle-analyzer 16.4.3 installed only inside an isolated GitHub Actions baseline job. Neither is added to application runtime dependencies.
- Existing Search Console read-only adapter and deterministic growth metrics remain the supported data path.

## Reconsideration gate

A future isolated Scrawly evaluation must use a disposable environment, no WordPress credentials, no OAuth credentials, no AI provider key, no write tools, and a read-only test target. TLS verification and OAuth CSRF concerns must be fixed upstream or patched and independently reviewed before any connection. Do not run its one-line curl | bash installer in Termux or in the project workspace.

## Source files inspected

- pyproject.toml: MIT license, desktop application entry point, dependency inventory
- src/sentinelseo/mcp/server.py: read and mutating MCP tools
- src/sentinelseo/crawl/fetcher.py: Playwright crawler and vendored axe-core
- src/sentinelseo/ai/provider.py: configurable external AI provider
- src/sentinelseo/enrichment/google_oauth.py: OAuth state and encrypted token storage
- src/sentinelseo/enrichment/gsc.py: Search Console enrichment
- src/sentinelseo/enrichment/psi_lighthouse.py: PageSpeed Insights enrichment
- SECURITY.md and LICENSE
