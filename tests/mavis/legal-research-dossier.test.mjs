import test from "node:test";
import assert from "node:assert/strict";
import { buildLegalResearchDossier } from "../../src/lib/mavis/legal-research-dossier.mjs";

const verifiedStatute = {
  id: "law-demo",
  title: "قانون نمونه",
  source_class: "statute",
  authority: "مرجع رسمی",
  document_number: "۱۰۰",
  publication_date: "2026-01-01",
  exact_citation: "قانون نمونه، ماده ۱",
  review_status: "verified_primary_source",
  source_verified: true,
  validity_status: "in_force",
  last_verified_at: "2026-11-01",
  sources: [{
    title: "روزنامه رسمی",
    url: "https://rrk.ir/law/100",
    source_type: "primary",
    accessed_at: "2026-11-01",
  }],
};

test("groups evidence by legal source class and exposes missing research tracks", () => {
  const dossier = buildLegalResearchDossier({
    topic: "اعتبار سند رسمی",
    records: [verifiedStatute],
  });

  assert.equal(dossier.ok, true);
  assert.equal(dossier.sections.statute.length, 1);
  assert.equal(dossier.sections.amendment.length, 0);
  assert.equal(dossier.sections.unifying_opinion.length, 0);
  assert.ok(dossier.gaps.some((gap) => gap.includes("اصلاحات")));
  assert.ok(dossier.gaps.some((gap) => gap.includes("رأی وحدت رویه")));
});

test("does not classify a judgment or advisory opinion as a statute", () => {
  const dossier = buildLegalResearchDossier({
    topic: "موضوع حقوقی",
    records: [
      { id: "j-1", title: "دادنامه", source_class: "published_judgment" },
      { id: "a-1", title: "نظریه", source_class: "advisory_opinion" },
    ],
  });

  assert.equal(dossier.sections.statute.length, 0);
  assert.equal(dossier.sections.published_judgment.length, 1);
  assert.equal(dossier.sections.advisory_opinion.length, 1);
});

test("does not treat secondary references or missing citation fields as answer-ready", () => {
  const dossier = buildLegalResearchDossier({
    topic: "قانون نمونه",
    records: [{
      id: "law-secondary",
      title: "قانون نمونه",
      source_class: "statute",
      review_status: "secondary_source_only",
      sources: [{ title: "Database", url: "https://example.org/law", source_type: "secondary" }],
    }],
  });

  assert.equal(dossier.verifiedPrimaryCount, 0);
  assert.equal(dossier.answerReadiness, "blocked_missing_verified_primary_sources");
  assert.ok(dossier.items[0].missingFields.includes("authority"));
  assert.equal(dossier.legalAnswer, null);
});

test("retains exact amendment and repeal links without inventing relationships", () => {
  const dossier = buildLegalResearchDossier({
    topic: "اصلاح قانون",
    records: [{
      id: "amend-1",
      title: "اصلاحیه",
      source_class: "amendment",
      authority: "مرجع",
      document_number: "۲۰",
      publication_date: "2026-01-01",
      effective_date: "2026-02-01",
      related_record_ids: ["law-demo"],
      exact_citation: "ماده ۱ اصلاحی",
      sources: [{ title: "Source", url: "https://example.org/amend", source_type: "secondary" }],
    }],
  });

  assert.deepEqual(dossier.items[0].relatedRecordIds, ["law-demo"]);
  assert.equal(dossier.items[0].sourceVerified, false);
  assert.ok(dossier.items[0].missingFields.includes("verified_source_citation"));
});

test("keeps partially repealed and unknown validity visible", () => {
  const dossier = buildLegalResearchDossier({
    topic: "اعتبار",
    records: [
      { ...verifiedStatute, id: "partial", validity_status: "partially_repealed" },
      { ...verifiedStatute, id: "unknown", validity_status: "unknown" },
    ],
  });

  assert.equal(dossier.items[0].evidenceState, "needs_official_check");
  assert.equal(dossier.items[1].evidenceState, "needs_official_check");
  assert.equal(dossier.verifiedPrimaryCount, 0);
});

test("returns explicit not-found and rejects oversized or invalid requests", () => {
  const empty = buildLegalResearchDossier({ topic: "سند", records: [] });
  assert.equal(empty.answerReadiness, "not_found");
  assert.equal(buildLegalResearchDossier({ topic: "x", records: [] }).ok, false);
  assert.equal(buildLegalResearchDossier({ topic: "سند", records: Array(101).fill({}) }).ok, false);
  assert.equal(buildLegalResearchDossier({ topic: "سند", records: null }).ok, false);
  assert.equal(empty.deadlineCalculation, null);
});
