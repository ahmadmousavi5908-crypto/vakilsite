import "server-only";

import publishedArticles from "../../data/articles.js";
import {
  getLegalRecordTitle,
  legalLibraryCollections,
} from "../legal-library.js";
import { searchLegalRecords } from "./knowledge-search.mjs";
import { buildPublishedArticleRecords } from "./published-article-adapter.mjs";

const publishedArticleRecords = buildPublishedArticleRecords(publishedArticles);

const searchableRecords = [
  ...legalLibraryCollections.terms.map((record) => ({
    ...record,
    record_type: "term",
    title: record.search_title || record.canonical,
  })),
  ...legalLibraryCollections.laws.map((record) => ({
    ...record,
    record_type: "law",
    title: record.title,
  })),
  ...legalLibraryCollections.articles.map((record) => ({
    ...record,
    record_type: "article",
    title: getLegalRecordTitle("articles", record),
  })),
  ...publishedArticleRecords,
].filter((record) => record.review_status !== "draft");

/**
 * Searches the existing legal library and published site articles.
 * Published articles remain secondary educational material and can never
 * satisfy the verified-primary-source gate for public legal answers.
 */
export function searchMavisKnowledge(query, limit = 10) {
  return searchLegalRecords({
    query,
    records: searchableRecords,
    limit,
  });
}

export function getMavisKnowledgeInventory() {
  return {
    terms: legalLibraryCollections.terms.length,
    laws: legalLibraryCollections.laws.length,
    legalArticles: legalLibraryCollections.articles.length,
    publishedArticles: publishedArticleRecords.length,
    searchable: searchableRecords.length,
    sources: ["src/data/legal-library", "src/data/articles.js"],
  };
}
