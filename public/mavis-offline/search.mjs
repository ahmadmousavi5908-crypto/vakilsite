export function normalizeOfflineQuery(value) {
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

function tokenCoverage(tokens, value) {
  const candidate = new Set(normalizeOfflineQuery(value).split(" ").filter(Boolean));
  return tokens.length > 0 && tokens.every((token) =>
    candidate.has(token) ||
    [...candidate].some((part) => token.length >= 3 && part.startsWith(token))
  );
}

export function scoreOfflineRecord(record, normalizedQuery, queryTokens) {
  const titles = [record?.title, record?.search_title].map(normalizeOfflineQuery).filter(Boolean);
  const aliases = asTextList(record?.aliases).map(normalizeOfflineQuery).filter(Boolean);
  const phrases = asTextList(record?.search_phrases).map(normalizeOfflineQuery).filter(Boolean);
  const body = [record?.definition, record?.summary, record?.notes].map(normalizeOfflineQuery).filter(Boolean);

  if (titles.includes(normalizedQuery)) return 1000;
  if (aliases.includes(normalizedQuery)) return 940;
  if (phrases.includes(normalizedQuery)) return 900;
  if (titles.some((value) => value.startsWith(normalizedQuery))) return 820;
  if (titles.some((value) => tokenCoverage(queryTokens, value))) return 780;
  if (aliases.some((value) => value.startsWith(normalizedQuery))) return 730;
  if (aliases.some((value) => tokenCoverage(queryTokens, value))) return 690;
  if (phrases.some((value) => tokenCoverage(queryTokens, value))) return 650;
  if (titles.some((value) => value.includes(normalizedQuery))) return 560;
  if (aliases.some((value) => value.includes(normalizedQuery))) return 500;
  if (body.some((value) => tokenCoverage(queryTokens, value))) return 280;
  if (body.some((value) => value.includes(normalizedQuery))) return 180;
  return 0;
}

export function rankOfflineRecords(query, records, limit = 12) {
  const normalizedQuery = normalizeOfflineQuery(query);
  if (normalizedQuery.length < 2 || normalizedQuery.length > 160 || !Array.isArray(records)) return [];

  const safeLimit = Number.isInteger(limit) ? Math.min(20, Math.max(1, limit)) : 12;
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const seenIds = new Set();
  return records
    .map((record, index) => ({ record, index, score: scoreOfflineRecord(record, normalizedQuery, tokens) }))
    .filter(({ record, score }) => {
      if (!record || typeof record.id !== "string" || seenIds.has(record.id) || score <= 0) return false;
      seenIds.add(record.id);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, safeLimit)
    .map(({ record }) => record);
}
