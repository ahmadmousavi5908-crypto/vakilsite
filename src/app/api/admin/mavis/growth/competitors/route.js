// Admin-only SERP observation endpoint. It never fetches or stores competitor pages.
import { requireAdmin } from "../../../../../../lib/supabase/admin";
import { createMavisCompetitorSearchFromEnv } from "../../../../../../lib/mavis/competitor-research.mjs";
import { createMavisCompetitorResearchHandler } from "../../../../../../lib/mavis/competitor-research-handler.mjs";
import { isJsonContentType, matchesRequestOrigin } from "../../../../../../lib/mavis/request-guards.mjs";
import { parseKnowledgeSearchRateLimit } from "../../../../../../lib/mavis/rate-limit.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const searchClient = createMavisCompetitorSearchFromEnv(process.env);

export const POST = createMavisCompetitorResearchHandler({
  requireAdmin,
  searchClient,
  isJsonContentType,
  matchesRequestOrigin,
  parseKnowledgeSearchRateLimit,
});
