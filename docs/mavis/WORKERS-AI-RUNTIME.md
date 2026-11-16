# MAVIS Workers AI Runtime

## Provider selection

MAVIS editorial draft generation prefers the Cloudflare Workers AI binding exposed by OpenNext as `getCloudflareContext().env.AI`.

- Default model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- Optional override: `MAVIS_WORKERS_AI_MODEL`
- OpenAI Responses API remains an explicit fallback for local Node.js development or deployments without an AI binding.
- The Workers AI path does not require `MAVIS_OPENAI_API_KEY`.

## Safety boundaries

- The model receives only the bounded article input and normalized source metadata already attached to the draft.
- System instructions prohibit invented laws, article numbers, court decisions, dates, quotations, and URLs.
- The JSON response is parsed and normalized by the same validator used for the OpenAI path.
- Citation IDs are filtered against the supplied source IDs.
- Generated content remains an editable draft. It is not saved, approved, or published by the model call.
- The existing database rate-limit RPC remains mandatory before provider invocation.

## Worker configuration

Both `wrangler.jsonc` and `wrangler.staging.jsonc` define the `AI` binding. Staging and production therefore use the same provider contract while retaining separate Workers and Supabase projects.

## Cost and operational limits

Workers AI usage is metered in Neurons. Cloudflare currently documents a 10,000-Neuron daily free allocation, with additional usage billed on Workers Paid. Monitor usage and configure account spending controls before enabling high-volume generation.

## Verification

Run:

```bash
node --test tests/mavis/editorial-ai.test.mjs
```

The test suite covers the Workers AI path without credentials, structured JSON schema request, source-citation filtering, malformed output, and provider failure handling. Live inference still requires a deployed Worker with the AI binding enabled.

## Iranian legal source search without a paid search key

When `MAVIS_IRAN_SOURCE_SEARCH_API_KEY` is absent, the admin source-search endpoint uses the Cloudflare Browser Run binding to try the official Qavanin search page. Parsed records are accepted only from the registered Qavanin domain and are labelled as primary-source candidates; repealed markers are preserved as hints and current legal status must still be checked on the source page.

Browser Run requests are identified as bots and are not a bot-protection bypass. If Qavanin blocks the request or returns markup that cannot be safely parsed, MAVIS does not fabricate results: it returns direct official-portal links for Qavanin, Dotic and the Official Gazette, plus domain-restricted search links for the selected source group. This fallback requires no API key and remains usable when the upstream portal is unavailable.

Browser Run has plan-based usage limits. Keep this path administrator-only and monitor Cloudflare Browser Run usage before increasing request volume.

## Live Staging verification

The isolated Staging Worker exposes an admin-only `/api/admin/mavis/runtime-smoke` endpoint only when `MAVIS_STAGING_DIAGNOSTICS_ENABLED=true` is present in the Staging Worker variables. It performs one quota-controlled inference, validates the structured output through the production normalizer, and returns only provider/model metadata. The Production Worker does not enable this diagnostic endpoint.

The authenticated Staging E2E workflow also calls the real source-search route with a temporary administrator session. It verifies the Browser Run binding is available and that the official Qavanin portal fallback is returned. Browser Run may still be blocked by the destination website; in that case the direct portal links remain the expected safe fallback.
