const MAX_RESULTS = 20;

function getEvidencePriority(evidence) {
  const state = evidence?.state;
  const validity = evidence?.validity?.status;

  if (state === "outdated" || validity === "repealed") {
    return { label: "outdated", adjustment: -300 };
  }

  if (validity === "partially_repealed") {
    return { label: "partial_validity", adjustment: -120 };
  }

  if (state === "verified_primary") {
    return { label: "verified_primary", adjustment: 150 };
  }

  const hasVerifiedPrimaryCitation = Array.isArray(evidence?.citations) &&
    evidence.citations.some((citation) =>
      citation?.sourceType === "primary" && citation.authorityVerified === true
    );

  if (hasVerifiedPrimaryCitation) {
    return { label: "primary_needs_review", adjustment: 80 };
  }

  if (state === "secondary_reference") {
    return { label: "secondary_reference", adjustment: 20 };
  }

  return { label: "unverified", adjustment: 0 };
}

/**
 * Deterministically reranks lexical candidates using evidence provenance.
 * This is a ranking aid, not a legal-validity determination.
 */
export function rankMavisEvidenceResults(results, limit = 10) {
  if (!Array.isArray(results)) {
    throw new TypeError("MAVIS evidence ranker requires an array");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RESULTS) {
    throw new RangeError("MAVIS evidence result limit must be an integer from 1 to 20");
  }

  return results
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item, index) => {
      const priority = getEvidencePriority(item.evidence);
      const relevance = Number.isFinite(item.search_score) ? item.search_score : 0;

      return {
        item: {
          ...item,
          evidence_priority: priority.label,
        },
        index,
        relevance,
        combined: relevance + priority.adjustment,
      };
    })
    .sort((a, b) =>
      b.combined - a.combined ||
      b.relevance - a.relevance ||
      a.index - b.index
    )
    .slice(0, limit)
    .map(({ item }) => item);
}
