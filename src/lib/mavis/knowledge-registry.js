import "server-only";

import {
  getLegalRecordTitle,
  legalLibraryCollections,
} from "../legal-library.js";
import { searchLegalRecords } from "./knowledge-search.mjs";

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
].filter((record) => record.review_status !== "draft");

/**
 * Searches the existing public legal library without creating a second corpus.
 * Results retain review status and source metadata; they are retrieval results,
 * not legal opinions or confirmation that a source is currently in force.
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
    articles: legalLibraryCollections.articles.length,
    searchable: searchableRecords.length,
    source: "src/data/legal-library",
  };
}
