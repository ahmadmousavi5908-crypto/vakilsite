import termsData from "../data/legal-library/terms/terms.json";
import lawsData from "../data/legal-library/laws/laws.json";
import articlesData from "../data/legal-library/articles/articles.json";
import taxonomyData from "../data/legal-library/taxonomy/categories.json";

export const legalReviewLabels = {
  verified_primary_source: "تطبیق‌شده با منبع اولیه",
  secondary_source_only: "منبع ثانویه؛ نیازمند تطبیق",
  needs_legal_review: "نیازمند بازبینی حقوقی",
  draft: "پیش‌نویس",
};

export function createLegalSlug(value) {
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

const rawTerms = termsData.records || [];
const rawLaws = lawsData.records || [];
const rawArticles = articlesData.records || [];
const lawById = new Map(rawLaws.map((record) => [record.id, record]));

export const legalLibraryCollections = {
  terms: rawTerms.map((record) => ({
    ...record,
    slug: createLegalSlug(record.canonical),
    path: `/legal-library/terms/${createLegalSlug(record.canonical)}`,
    title: record.canonical,
  })),
  laws: rawLaws.map((record) => ({
    ...record,
    slug: createLegalSlug(record.title),
    path: `/legal-library/laws/${createLegalSlug(record.title)}`,
  })),
  articles: rawArticles.map((record) => {
    const law = lawById.get(record.law_id);
    const slug = createLegalSlug(`${law?.title || "قانون"} ماده ${record.article_number} ${record.title}`);
    return {
      ...record,
      slug,
      path: `/legal-library/articles/${slug}`,
      title: record.title,
    };
  }),
};

export const legalLibraryCategories = taxonomyData.categories || [];

export function getLegalRecords(type) {
  return legalLibraryCollections[type] || [];
}

export function getLegalRecord(type, slug) {
  return getLegalRecords(type).find((record) => record.slug === slug) || null;
}

export function getLegalRecordPath(type, record) {
  return record?.path || "#";
}

export function getIndexableLegalRecords() {
  return Object.values(legalLibraryCollections)
    .flat()
    .filter((record) => record.review_status === "verified_primary_source");
}

export function getLegalRecordRelations(type, record) {
  if (!record) return { terms: [], laws: [], articles: [] };

  if (type === "terms") {
    return {
      terms: [],
      laws: legalLibraryCollections.laws.filter((law) => (record.law_refs || []).includes(law.id)),
      articles: legalLibraryCollections.articles.filter((article) => (record.article_refs || []).includes(article.id)),
    };
  }

  if (type === "laws") {
    return {
      terms: legalLibraryCollections.terms.filter((term) => (term.law_refs || []).includes(record.id)),
      laws: [],
      articles: legalLibraryCollections.articles.filter((article) => article.law_id === record.id),
    };
  }

  const parentLaw = legalLibraryCollections.laws.find((law) => law.id === record.law_id);
  return {
    terms: legalLibraryCollections.terms.filter((term) => (term.article_refs || []).includes(record.id)),
    laws: parentLaw ? [parentLaw] : [],
    articles: [],
  };
}

export function getLegalRecordTitle(type, record) {
  if (!record) return "مدخل حقوقی";
  if (type === "terms") return record.search_title || record.canonical;
  if (type === "laws") return record.title;
  const law = lawById.get(record.law_id);
  return `${record.title}، ماده ${record.article_number} ${law?.title ? `از ${law.title}` : ""}`.trim();
}

export function isLegalRecordIndexable(record) {
  return record?.review_status === "verified_primary_source";
}
