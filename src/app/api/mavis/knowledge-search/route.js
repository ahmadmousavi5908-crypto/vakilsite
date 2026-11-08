import { requireAdmin } from "../../../../lib/supabase/admin";
import { searchMavisKnowledge } from "../../../../lib/mavis/knowledge-registry";
import { buildLegalEvidence } from "../../../../lib/mavis/legal-evidence.mjs";
import { buildLegalResearchDossier } from "../../../../lib/mavis/legal-research-dossier.mjs";
import {
  isJsonContentType,
  matchesRequestOrigin,
} from "../../../../lib/mavis/request-guards.mjs";
import { parseKnowledgeSearchRateLimit } from "../../../../lib/mavis/rate-limit.mjs";
import { createKnowledgeSearchHandler } from "../../../../lib/mavis/knowledge-search-handler.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = createKnowledgeSearchHandler({
  requireAdmin,
  searchMavisKnowledge,
  buildLegalEvidence,
  buildLegalResearchDossier,
  isJsonContentType,
  matchesRequestOrigin,
  parseKnowledgeSearchRateLimit,
});
