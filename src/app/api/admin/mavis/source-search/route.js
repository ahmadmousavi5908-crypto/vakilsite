import { requireAdmin } from "../../../../../lib/supabase/admin";
import { createIranianSourceSearchFromEnv } from "../../../../../lib/mavis/iranian-source-search.mjs";
import { createIranianSourceSearchHandler } from "../../../../../lib/mavis/iranian-source-search-handler.mjs";
import { isJsonContentType, matchesRequestOrigin } from "../../../../../lib/mavis/request-guards.mjs";
import { parseKnowledgeSearchRateLimit } from "../../../../../lib/mavis/rate-limit.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const searchClient = createIranianSourceSearchFromEnv(process.env);

export const POST = createIranianSourceSearchHandler({
  requireAdmin,
  searchClient,
  isJsonContentType,
  matchesRequestOrigin,
  parseKnowledgeSearchRateLimit,
});
