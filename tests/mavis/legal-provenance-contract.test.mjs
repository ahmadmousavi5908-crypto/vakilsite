import test from "node:test";
import assert from "node:assert/strict";
import { isPrimaryVerificationComplete } from "../../src/lib/mavis/legal-provenance-contract.mjs";

const validRecord = () => ({
  review_status: "verified_primary_source",
  provenance: {
    exact_primary_document_verified: true,
    current_validity_verified: true,
    exact_document_url: "https://official.example/law/123",
    issuing_authority: "Issuing authority",
    instrument_or_decision_number: "123",
    publication_reference: "Official Gazette issue 10",
    publication_date: "2024-01-01",
    effective_date_or_explicitly_unknown: "2024-01-02",
    amendment_and_repeal_review: "Checked through 2026-11-08",
    retrieved_at: "2026-11-08T10:00:00.000Z",
    content_sha256: "a".repeat(64),
    human_reviewer: "reviewer-id",
    reviewed_at: "2026-11-08T11:00:00.000Z"
  },
  sources: [{
    url: "https://official.example/law/123",
    source_class: "primary_publication",
    verification_status: "verified_primary_source"
  }]
});

test("accepts a complete primary-source verification record", () => {
  assert.equal(isPrimaryVerificationComplete(validRecord()), true);
});

test("rejects a verified label with missing review evidence", () => {
  const record = validRecord();
  delete record.provenance.amendment_and_repeal_review;
  assert.equal(isPrimaryVerificationComplete(record), false);
});

test("rejects a secondary source even when all metadata is present", () => {
  const record = validRecord();
  record.sources[0].source_class = "secondary_legal_database";
  assert.equal(isPrimaryVerificationComplete(record), false);
});

test("rejects a mismatched source URL and malformed content hash", () => {
  const record = validRecord();
  record.provenance.content_sha256 = "not-a-hash";
  assert.equal(isPrimaryVerificationComplete(record), false);
});

test("rejects unverified records without treating them as failures", () => {
  const record = validRecord();
  record.review_status = "needs_legal_review";
  assert.equal(isPrimaryVerificationComplete(record), false);
});
