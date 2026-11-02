import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
async function load(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}
function slugify(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .toLocaleLowerCase("fa-IR")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function hasVerifiedPrimarySource(record) {
  return record.source_verified === true &&
    Array.isArray(record.sources) &&
    record.sources.some((source) =>
      source?.source_type === "primary" &&
      typeof source.url === "string" &&
      /^https:\/\//i.test(source.url)
    );
}

const [termsData, lawsData, articlesData, taxonomyData] = await Promise.all([
  load("src/data/legal-library/terms/terms.json"),
  load("src/data/legal-library/laws/laws.json"),
  load("src/data/legal-library/articles/articles.json"),
  load("src/data/legal-library/taxonomy/categories.json"),
]);
const terms = termsData.records || [];
const laws = lawsData.records || [];
const articles = articlesData.records || [];
const categoryCodes = new Set((taxonomyData.categories || []).map((category) => category.code));
const groups = [
  ["terms", terms, (record) => record.canonical],
  ["laws", laws, (record) => record.title],
  ["articles", articles, (record) => {
    const law = laws.find((item) => item.id === record.law_id);
    return `${law?.title || "قانون"} ماده ${record.article_number} ${record.title}`;
  }],
];
const errors = [];
const allowedStatuses = new Set(["verified_primary_source", "secondary_source_only", "needs_legal_review", "draft"]);

for (const [groupName, records, titleOf] of groups) {
  const seen = new Map();
  for (const record of records) {
    const slug = slugify(titleOf(record));
    if (!slug) errors.push(`${groupName}: empty slug for ${record.id}`);
    if (seen.has(slug)) errors.push(`${groupName}: duplicate slug ${slug} (${seen.get(slug)}, ${record.id})`);
    seen.set(slug, record.id);
    if (!allowedStatuses.has(record.review_status)) errors.push(`${groupName}: invalid review_status for ${record.id}`);
    if (groupName === "terms" && !categoryCodes.has(record.category)) errors.push(`${groupName}: unknown category ${record.category} for ${record.id}`);
    if (groupName === "terms") {
      const phrases = record.search_phrases;
      if (!Array.isArray(phrases) || phrases.length === 0) {
        errors.push(`${groupName}: missing search_phrases for ${record.id}`);
      } else {
        const normalizedPhrases = phrases.map((phrase) => String(phrase ?? "").normalize("NFKC").replace(/[\u200c\s]+/g, " ").trim().toLocaleLowerCase("fa-IR"));
        if (normalizedPhrases.some((phrase) => !phrase)) errors.push(`${groupName}: empty search phrase for ${record.id}`);
        if (new Set(normalizedPhrases).size !== normalizedPhrases.length) errors.push(`${groupName}: duplicate search phrase for ${record.id}`);
      }
    }
    if (record.review_status === "verified_primary_source" && !hasVerifiedPrimarySource(record)) {
      errors.push(`${groupName}: verified record ${record.id} lacks explicit primary-source evidence`);
    }
  }
}

const lawIds = new Set(laws.map((record) => record.id));
const articleIds = new Set(articles.map((record) => record.id));
for (const term of terms) {
  for (const id of term.law_refs || []) if (!lawIds.has(id)) errors.push(`terms: unknown law reference ${id} in ${term.id}`);
  for (const id of term.article_refs || []) if (!articleIds.has(id)) errors.push(`terms: unknown article reference ${id} in ${term.id}`);
}
for (const article of articles) {
  if (!lawIds.has(article.law_id)) errors.push(`articles: unknown parent law ${article.law_id} in ${article.id}`);
}

const allRecords = [...terms, ...laws, ...articles];
const report = {
  terms: terms.length,
  laws: laws.length,
  articles: articles.length,
  total: allRecords.length,
  categories: categoryCodes.size,
  curatedSearchPhrases: terms.reduce((sum, record) => sum + (Array.isArray(record.search_phrases) ? record.search_phrases.length : 0), 0),
  indexableByPrimarySourcePolicy: allRecords.filter((record) =>
    record.review_status === "verified_primary_source" && hasVerifiedPrimarySource(record)
  ).length,
  errors,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
console.log("LEGAL LIBRARY SEO VALIDATION PASSED");
