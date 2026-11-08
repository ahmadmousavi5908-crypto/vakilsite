import test from "node:test";
import assert from "node:assert/strict";
import { buildLegalResearchDossier } from "../../src/lib/mavis/legal-research-dossier.mjs";

test("assembles a deterministic evidence packet without changing legal status", () => {
  const dossier = buildLegalResearchDossier({
    query: "چک برگشتی",
    createdAt: "2026-11-08T12:00:00.000Z",
    results: [{
      id: "law_cheque",
      record_type: "law",
      title: "قانون صدور چک",
      review_status: "secondary_source_only",
      status: "needs_consolidation_review",
      source_url: "https://law-ir.ir/law/cat/1692/",
      law_refs: ["law_civil_code"],
      article_refs: ["article_cheque_1"],
      search_score: 900,
      matched_field: "title",
    }],
  });
  assert.equal(dossier.resultCount, 1);
  assert.equal(dossier.items[0].primarySourceVerified, false);
  assert.equal(dossier.items[0].currentValidityVerified, false);
  assert.equal(dossier.items[0].reviewStatus, "secondary_source_only");
  assert.ok(dossier.items[0].gaps.some((gap) => gap.code === "secondary_source_only"));
  assert.ok(dossier.items[0].gaps.some((gap) => gap.code === "current_validity_unverified"));
  assert.deepEqual(dossier.items[0].relatedLawIds, ["law_civil_code"]);
});

test("never promotes a portal link or secondary URL to a verified primary citation", () => {
  const dossier = buildLegalResearchDossier({
    query: "قانون",
    results: [{
      id: "law_one",
      record_type: "law",
      title: "قانون نمونه",
      sources: [{ title: "پایگاه ثانویه", url: "https://example.org/law", source_class: "secondary_legal_database", verification_status: "secondary_source_only" }],
    }],
  });
  assert.equal(dossier.items[0].sources[0].verificationStatus, "secondary_source_only");
  assert.equal(dossier.items[0].primarySourceVerified, false);
});

test("rejects unsafe citation URLs and labels fallback links as discovery only", () => {
  const dossier = buildLegalResearchDossier({
    query: "قانون",
    results: [{
      id: "law_two",
      record_type: "law",
      title: "قانون دوم",
      sources: [{ url: "javascript:alert(1)" }, { url: "https://user:pass@example.org" }],
      source_url: "https://example.org/search",
    }],
  });
  assert.equal(dossier.items[0].sources.length, 1);
  assert.equal(dossier.items[0].sources[0].verificationStatus, "unverified_source_link");
  assert.equal(dossier.items[0].primarySourceVerified, false);
});

test("deduplicates record IDs and exposes explicit human review gates", () => {
  const record = { id: "term_one", record_type: "term", title: "اصطلاح" };
  const dossier = buildLegalResearchDossier({ query: "اصطلاح", results: [record, record] });
  assert.equal(dossier.resultCount, 1);
  assert.equal(dossier.items[0].gaps.some((gap) => gap.code === "missing_record_sources"), true);
  assert.ok(dossier.requiredHumanChecks.length >= 4);
  assert.ok(dossier.limitations.some((item) => item.includes("توصیه حقوقی")));
});
