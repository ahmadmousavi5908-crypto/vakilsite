const SAFE_INTERNAL_PATH = /^\/(?!\/)[a-z0-9/_-]*$/;
const DRAFT_FAMILIES = new Set(["lawyer", "base", "problem", "colloquial"]);

export function getKeywordEntryAction(entry) {
  const target = typeof entry?.target === "string" ? entry.target.trim() : "";

  if (SAFE_INTERNAL_PATH.test(target)) {
    return { kind: "owner", href: target };
  }

  if (
    target !== "محتوای آتی"
    || !DRAFT_FAMILIES.has(entry?.family)
    || entry?.requiresComplianceReview === true
    || entry?.legalReviewStatus
  ) {
    return null;
  }

  const term = String(entry?.term || "").normalize("NFC").trim();
  if (!term) return null;

  const params = new URLSearchParams({ topic: term, focus_keyword: term });
  const category = String(entry?.clusterTitle || "").normalize("NFC").trim().slice(0, 100);
  const clusterId = String(entry?.clusterId || "").trim();
  if (category) params.set("category", category);
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clusterId)) params.set("cluster_id", clusterId);

  return { kind: "draft", href: `/admin/mavis/articles/new?${params.toString()}` };
}
