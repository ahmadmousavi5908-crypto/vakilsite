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
