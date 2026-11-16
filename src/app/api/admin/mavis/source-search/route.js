import { requireAdmin } from "../../../../../lib/supabase/admin";
import { createIranianSourceSearchFromEnv } from "../../../../../lib/mavis/iranian-source-search.mjs";
import { createIranianSourceSearchHandler } from "../../../../../lib/mavis/iranian-source-search-handler.mjs";
import { isJsonContentType, matchesRequestOrigin } from "../../../../../lib/mavis/request-guards.mjs";
import { parseKnowledgeSearchRateLimit } from "../../../../../lib/mavis/rate-limit.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const configuredSearchClient = createIranianSourceSearchFromEnv(process.env);
const searchClient = {
  async search(input) {
    if (configuredSearchClient) return configuredSearchClient.search(input);
    let browser;
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      browser = getCloudflareContext().env?.BROWSER;
    } catch {
      // Local Node.js development falls back to official portal search links.
    }
    const { createIranianSourceSearchFallback } = await import("../../../../../lib/mavis/iranian-source-search.mjs");
    return createIranianSourceSearchFallback({ browser }).search(input);
  }
};

export const POST = createIranianSourceSearchHandler({
  requireAdmin,
  searchClient,
  isJsonContentType,
  matchesRequestOrigin,
  parseKnowledgeSearchRateLimit,
});
