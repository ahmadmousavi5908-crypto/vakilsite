const CANONICAL_TABLE = "mavis_editorial_articles";
const LEGACY_TABLE = "mavis_articles";

function isMissingEditorialTable(error) {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const message = typeof error.message === "string" ? error.message : "";
  return /relation .*mavis_editorial_articles.* does not exist|could not find the table .*mavis_editorial_articles.* in the schema cache/i.test(message);
}

/**
 * Prefer the canonical Mother Two table, but keep the new Worker compatible
 * with the pre-migration Production schema during the controlled rollout.
 * Only a missing canonical relation triggers the legacy-table fallback.
 */
export async function queryMavisEditorialArticles(supabase, buildQuery) {
  const canonicalResult = await buildQuery(supabase.from(CANONICAL_TABLE));
  if (!isMissingEditorialTable(canonicalResult?.error)) return canonicalResult;

  return buildQuery(supabase.from(LEGACY_TABLE));
}
