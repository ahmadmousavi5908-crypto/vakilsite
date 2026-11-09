const VALID_REVIEW_STATES = new Set([
  "verified_primary_source",
  "secondary_source_only",
  "needs_legal_review",
  "draft",
]);

function cleanText(value, maxLength = 8000) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) return [];

  return sources.flatMap((rawSource) => {
    if (typeof rawSource !== "string" || rawSource.length > 2048) return [];
    try {
      const url = new URL(rawSource);
      if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.port) return [];
      return [{
        title: "منبع کشف و بررسی ثانویه · " + url.hostname.toLowerCase(),
        url: url.href,
        source_type: "secondary",
        verification_status: "secondary_source_only",
      }];
    } catch {
      return [];
    }
  });
}

/**
 * Adapts the canonical legal-library source-review report for online retrieval.
 * Research notes remain secondary and can never satisfy primary-source checks.
 */
export function buildLegalResearchNoteRecords(report) {
  if (!report || typeof report !== "object" || !Array.isArray(report.items)) return [];

  const seen = new Set();
  const records = [];

  for (const item of report.items) {
    const topic = cleanText(item?.topic, 300);
    if (!topic || seen.has(topic)) continue;
    seen.add(topic);

    const findings = Array.isArray(item.findings)
      ? item.findings.map((finding) => cleanText(finding, 2400)).filter(Boolean)
      : [];
    const caution = cleanText(item.caution, 2400);
    if (findings.length === 0 && !caution) continue;

    const reviewStatus = VALID_REVIEW_STATES.has(item.status)
      ? item.status
      : "needs_legal_review";
    const sources = normalizeSources(item.sources);
    const body = [...findings, caution].filter(Boolean).join("\n").slice(0, 8000);
    const id = "research_note_" + records.length.toString(10).padStart(3, "0");

    records.push({
      id,
      record_type: "research_note",
      source_class: "research_note",
      title: topic,
      canonical: topic,
      search_title: topic,
      summary: findings.join(" ").slice(0, 4000),
      definition: body,
      notes: caution,
      category: "legal_source_discovery",
      review_date: /^\d{4}-\d{2}-\d{2}$/.test(report.review_date || "") ? report.review_date : null,
      sources,
      source_url: null,
      source_verified: false,
      validity_status: "unknown",
      review_status: reviewStatus,
      exact_citation: null,
      law_id: null,
      article_number: null,
      indexing_class: "secondary_research_note",
    });
  }

  return records;
}
