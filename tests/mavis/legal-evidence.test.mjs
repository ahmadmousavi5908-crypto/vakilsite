import test from "node:test";
import assert from "node:assert/strict";
import { buildLegalEvidence, buildLegalEvidencePacket } from "../../src/lib/mavis/legal-evidence.mjs";

test("does not promote secondary-only records to primary authority", () => {
  const evidence = buildLegalEvidence({
    id: "law-demo",
    title: "قانون نمونه",
    review_status: "secondary_source_only",
    source_url: "https://example.org/law",
  });

  assert.equal(evidence.state, "secondary_reference");
  assert.equal(evidence.requiresHumanReview, true);
  assert.equal(evidence.citations.length, 0);
});

test("requires explicit primary-source verification and access date", () => {
  const unverified = buildLegalEvidence({
    id: "law-demo",
    review_status: "verified_primary_source",
    source_verified: false,
    sources: [{ title: "Official text", url: "https://official.example/law", source_type: "primary", accessed_at: "2026-11-01" }],
  });
  const verified = buildLegalEvidence({
    id: "law-demo",
    review_status: "verified_primary_source",
    source_verified: true,
    sources: [{ title: "Official text", url: "https://official.example/law", source_type: "primary", accessed_at: "2026-11-01" }],
  });

  assert.equal(unverified.state, "needs_official_check");
  assert.equal(verified.state, "verified_primary");
  assert.equal(verified.citations.length, 1);
});

test("rejects unsafe, incomplete and malformed source metadata", () => {
  const evidence = buildLegalEvidence({
    id: "law-demo",
    review_status: "secondary_source_only",
    sources: [
      { title: "No HTTPS", url: "http://example.org" },
      { title: "No title", url: "https://example.org" },
      { title: "Embedded credentials", url: "https://user:pass@example.org/law", source_type: "secondary" },
      { title: "Valid secondary", url: "https://example.org/law", source_type: "secondary" },
    ],
  });

  assert.equal(evidence.citations.length, 1);
  assert.equal(evidence.citations[0].sourceType, "secondary");
});

test("does not infer enactment, effective or verification dates", () => {
  const evidence = buildLegalEvidence({
    id: "law-demo",
    enactment_date: "not-a-date",
    effective_date: null,
    last_verified_at: "2026-02-31",
  });

  assert.equal(evidence.validity.enactmentDate, null);
  assert.equal(evidence.validity.effectiveDate, null);
  assert.equal(evidence.validity.lastVerifiedAt, null);
  assert.equal(evidence.validity.status, "unknown");
});

test("marks explicit repeal as outdated and keeps answer generation disabled", () => {
  const packet = buildLegalEvidencePacket([{
    id: "law-old",
    validity_status: "repealed",
    review_status: "verified_primary_source",
  }]);

  assert.equal(packet.state, "outdated");
  assert.equal(packet.items[0].state, "outdated");
  assert.equal(packet.legalOpinion, null);
  assert.equal(packet.deadlineCalculation, null);
  assert.equal(packet.requiresHumanReview, true);
});

test("returns an explicit not-found packet for an empty result set", () => {
  const packet = buildLegalEvidencePacket([]);

  assert.equal(packet.state, "not_found");
  assert.deepEqual(packet.items, []);
  assert.equal(packet.requiresHumanReview, true);
});
