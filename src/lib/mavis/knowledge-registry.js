import "server-only";

import { articles as publishedArticles } from "../../data/articles.js";
import sourceReviewReport from "../../data/legal-library/reports/source-review.json";
import {
  getLegalRecordTitle,
  legalLibraryCollections,
} from "../legal-library.js";
import { searchLegalRecords } from "./knowledge-search.mjs";
import { buildPublishedArticleRecords } from "./published-article-adapter.mjs";
import { buildLegalResearchNoteRecords } from "./legal-research-note-adapter.mjs";

const publishedArticleRecords = buildPublishedArticleRecords(publishedArticles);
const legalResearchNoteRecords = buildLegalResearchNoteRecords(sourceReviewReport);

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
  ...legalResearchNoteRecords,
].filter((record) => record.review_status !== "draft");

/**
 * Searches the existing legal library, published site articles and canonical
 * source-review notes. Articles and research notes remain secondary material.
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
    researchNotes: legalResearchNoteRecords.length,
    searchable: searchableRecords.length,
    sources: ["src/data/legal-library", "src/data/legal-library/reports/source-review.json", "src/data/articles.js"],
  };
}
