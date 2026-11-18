import legalTerms from "../../data/legal-library/terms/terms.json" with { type: "json" };

const CATEGORY_CLUSTER = Object.freeze({
  REG: "registration-land",
  CHK: "cheques-commercial-papers",
  CIV: "civil-law-eight-domains",
  CPR: "civil-procedure",
  CRG: "criminal-other",
  CRS: "criminal-other",
  CPC: "criminal-procedure",
  CRM: "criminal-other",
  COM: "commercial-law",
  FAM: "family-law",
  LAB: "labor-administrative-tax",
  ADM: "labor-administrative-tax",
  TAX: "labor-administrative-tax",
  CYB: "criminal-cyber",
  INS: "insurance-accident-torts",
  EXEC: "enforcement-debt",
  JUD: "civil-procedure",
  PROC: "civil-procedure",
  LAW: "lawyer-core"
});

export function getKeywordTaxonomyEntries() {
  return legalTerms.records.map((record) => ({
    id: record.id,
    canonical: record.canonical,
    searchTitle: record.search_title,
    category: record.category,
    aliases: record.aliases,
    searchPhrases: record.search_phrases,
    reviewStatus: record.review_status,
    clusterId: CATEGORY_CLUSTER[record.category] || "civil-law-eight-domains"
  }));
}
