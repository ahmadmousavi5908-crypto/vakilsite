export function normalizeLegalSearchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u200c\u200d]/g, " ")
    .toLocaleLowerCase("fa-IR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function asTextList(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");
  return typeof value === "string" ? [value] : [];
}

function tokenCoverage(queryTokens, candidate) {
  const candidateTokens = new Set(normalizeLegalSearchText(candidate).split(" ").filter(Boolean));
  return queryTokens.every((token) => candidateTokens.has(token));
}

function scoreRecord(record, query, queryTokens) {
  const titles = [
    ...asTextList(record.title),
    ...asTextList(record.canonical),
    ...asTextList(record.search_title),
  ].map(normalizeLegalSearchText).filter(Boolean);
  const aliases = asTextList(record.aliases).map(normalizeLegalSearchText).filter(Boolean);
  const phrases = asTextList(record.search_phrases).map(normalizeLegalSearchText).filter(Boolean);
  const body = [
    ...asTextList(record.definition),
    ...asTextList(record.summary),
  ].map(normalizeLegalSearchText).filter(Boolean);

  const exact = (values) => values.includes(query);
  const starts = (values) => values.some((value) => value.startsWith(query));
  const contains = (values) => values.some((value) => value.includes(query));
  const covers = (values) => values.some((value) => tokenCoverage(queryTokens, value));

  if (exact(titles)) return { score: 1000, matchedField: "title" };
  if (exact(aliases)) return { score: 900, matchedField: "alias" };
  if (exact(phrases)) return { score: 850, matchedField: "search_phrase" };
  if (starts(titles)) return { score: 800, matchedField: "title" };
  if (covers(titles)) return { score: 750, matchedField: "title" };
  if (starts(aliases)) return { score: 700, matchedField: "alias" };
  if (covers(aliases)) return { score: 650, matchedField: "alias" };
  if (covers(phrases)) return { score: 600, matchedField: "search_phrase" };
  if (contains(titles)) return { score: 500, matchedField: "title" };
  if (contains(aliases)) return { score: 450, matchedField: "alias" };
  if (contains(phrases)) return { score: 400, matchedField: "search_phrase" };
  if (covers(body)) return { score: 250, matchedField: "body" };
  if (contains(body)) return { score: 150, matchedField: "body" };
  return null;
}

/**
 * Deterministic retrieval over existing public legal-library records.
 * It ranks matches only and does not interpret facts or produce legal advice.
 */
export function searchLegalRecords({ query, records, limit = 10 } = {}) {
  if (!Array.isArray(records)) return [];

  const normalizedQuery = normalizeLegalSearchText(query);
  if (normalizedQuery.length < 2 || normalizedQuery.length > 120) return [];

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  if (queryTokens.length === 0) return [];

  const safeLimit = Number.isFinite(limit)
    ? Math.min(20, Math.max(1, Math.trunc(limit)))
    : 10;

  const seenIds = new Set();
  const ranked = [];

  for (const record of records) {
    if (!record || typeof record.id !== "string" || seenIds.has(record.id)) continue;
    seenIds.add(record.id);

    const match = scoreRecord(record, normalizedQuery, queryTokens);
    if (!match) continue;

    ranked.push({
      record,
      score: match.score,
      matchedField: match.matchedField,
    });
  }

  return ranked
    .map((item, index) => ({ ...item, index }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, safeLimit)
    .map(({ record, score, matchedField }) => ({
      ...record,
      search_score: score,
      matched_field: matchedField,
    }));
}
