import { requireAdmin } from "../../../../../lib/supabase/admin";
import { createSearchConsoleClientFromStoredConnection } from "../../../../../lib/mavis/search-console-connection.mjs";
import { createSearchConsoleHandler } from "../../../../../lib/mavis/search-console-handler.mjs";
import {
  isJsonContentType,
  matchesRequestOrigin,
} from "../../../../../lib/mavis/request-guards.mjs";
import { parseKnowledgeSearchRateLimit } from "../../../../../lib/mavis/rate-limit.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = createSearchConsoleHandler({
  requireAdmin,
  getClient: (access) => createSearchConsoleClientFromStoredConnection({
    supabase: access.supabase,
    env: process.env,
  }),
  isJsonContentType,
  matchesRequestOrigin,
  parseKnowledgeSearchRateLimit,
});
