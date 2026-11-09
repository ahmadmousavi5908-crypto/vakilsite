import { requireAdmin } from "../../../../../lib/supabase/admin";
import { createSearchConsoleClientFromEnv } from "../../../../../lib/mavis/search-console-client.mjs";
import { createSearchConsoleHandler } from "../../../../../lib/mavis/search-console-handler.mjs";
import {
  isJsonContentType,
  matchesRequestOrigin,
} from "../../../../../lib/mavis/request-guards.mjs";
import { parseKnowledgeSearchRateLimit } from "../../../../../lib/mavis/rate-limit.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const searchConsoleClient = createSearchConsoleClientFromEnv(process.env);

export const POST = createSearchConsoleHandler({
  requireAdmin,
  client: searchConsoleClient,
  isJsonContentType,
  matchesRequestOrigin,
  parseKnowledgeSearchRateLimit,
});
