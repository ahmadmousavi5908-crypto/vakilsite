function validateDependencies(dependencies) {
  const required = [
    "searchMavisKnowledge",
    "buildLegalEvidence",
    "buildLegalResearchDossier",
  ];

  for (const key of required) {
    if (typeof dependencies?.[key] !== "function") {
      throw new TypeError(`MAVIS knowledge retriever requires ${key}`);
    }
  }
}

function resolveSourceClass(record) {
  if (typeof record.source_class === "string" && record.source_class.trim()) {
    return record.source_class;
  }

  if (record.record_type === "law") return "statute";
  if (record.record_type === "article" || record.record_type === "published_article") return "educational_summary";
  if (record.record_type === "research_note") return "research_note";
  if (record.record_type === "term") return "legal_term";
  return "unclassified";
}

/**
 * Creates a deterministic retriever over the existing canonical legal library.
 * No model, vector store, network request, or parallel corpus is used.
 */
export function createMavisKnowledgeRetriever(dependencies) {
  validateDependencies(dependencies);

  const {
    searchMavisKnowledge,
    buildLegalEvidence,
    buildLegalResearchDossier,
  } = dependencies;

  return function retrieveMavisKnowledge(query, limit = 10) {
    const normalizedQuery = typeof query === "string" ? query.trim() : "";
    if (normalizedQuery.length < 2 || normalizedQuery.length > 120) {
      throw new RangeError("MAVIS knowledge query must contain 2 to 120 characters");
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new RangeError("MAVIS knowledge result limit must be an integer from 1 to 20");
    }

    const matchedRecords = searchMavisKnowledge(normalizedQuery, limit);
    if (!Array.isArray(matchedRecords)) {
      throw new TypeError("MAVIS knowledge search must return an array");
    }

    const dossierRecords = matchedRecords.map((record) => ({
      ...record,
      source_class: resolveSourceClass(record),
    }));
    const researchDossier = buildLegalResearchDossier({
      topic: normalizedQuery,
      records: dossierRecords,
    });
    const results = dossierRecords.map((record) => ({
      evidence: buildLegalEvidence(record),
      id: record.id,
      record_type: record.record_type,
      title: record.title,
      canonical: record.canonical,
      article_number: record.article_number,
      law_id: record.law_id,
      definition: record.definition,
      summary: record.summary,
      review_status: record.review_status,
      status: record.status,
      source_url: record.source_url,
      sources: record.sources,
      notes: record.notes,
      path: record.path,
      search_score: record.search_score,
      matched_field: record.matched_field,
    }));

    return {
      query: normalizedQuery,
      count: results.length,
      results,
      researchDossier,
      notice: "این خروجی فقط بازیابی از کتابخانه موجود است؛ نظر حقوقی، بررسی اعتبار روز قانون یا تحلیل پرونده محسوب نمی‌شود.",
    };
  };
}
