import test from "node:test";
import assert from "node:assert/strict";
import {
  isLiveAccessEvidenceComplete,
  isPrimaryVerificationComplete,
  isSourceRegistryReferenceConsistent,
} from "../../src/lib/mavis/legal-provenance-contract.mjs";

const validRegistry = () => [{
  id: "src_official",
  url: "https://www.official.example/",
  class: "primary_publication",
}];

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
    source_id: "src_official",
    url: "https://official.example/law/123",
    source_class: "primary_publication",
    verification_status: "verified_primary_source"
  }]
});

test("accepts a complete primary-source record tied to its canonical registry host", () => {
  assert.equal(isPrimaryVerificationComplete(validRecord(), validRegistry()), true);
});

test("accepts a documented subdomain while requiring the registry class to match", () => {
  const registry = [{ id: "src_official", url: "https://www.official.example/", class: "primary_publication" }];
  const source = { source_id: "src_official", url: "https://archive.official.example/law/123", source_class: "primary_publication" };
  assert.equal(isSourceRegistryReferenceConsistent(source, registry), true);
});

test("rejects a record source that points to an unrelated HTTPS host", () => {
  const record = validRecord();
  record.sources[0].url = "https://fake.example/law/123";
  record.provenance.exact_document_url = "https://fake.example/law/123";
  assert.equal(isPrimaryVerificationComplete(record, validRegistry()), false);
});

test("rejects a source class that differs from the canonical registry", () => {
  const record = validRecord();
  record.sources[0].source_class = "official_law_portal";
  assert.equal(isPrimaryVerificationComplete(record, validRegistry()), false);
});

test("does not treat the judiciary discovery gateway as the primary legal document", () => {
  const record = validRecord();
  const registry = [{ id: "src_official", url: "https://eadil.com/", class: "official_judiciary_gateway" }];
  record.sources[0].url = "https://eadil.com/";
  record.sources[0].source_class = "official_judiciary_gateway";
  record.provenance.exact_document_url = "https://eadil.com/";
  assert.equal(isPrimaryVerificationComplete(record, registry), false);
});

test("rejects insecure, credential-bearing and port-qualified registry URLs", () => {
  const source = { source_id: "src_official", url: "http://official.example/law/123", source_class: "primary_publication" };
  assert.equal(isSourceRegistryReferenceConsistent(source, validRegistry()), false);
  const credentials = { ...source, url: "https://user:pass@official.example/law/123" };
  assert.equal(isSourceRegistryReferenceConsistent(credentials, validRegistry()), false);
  const port = { ...source, url: "https://official.example:8443/law/123" };
  assert.equal(isSourceRegistryReferenceConsistent(port, validRegistry()), false);
});

test("rejects a verified label with missing review evidence", () => {
  const record = validRecord();
  delete record.provenance.amendment_and_repeal_review;
  assert.equal(isPrimaryVerificationComplete(record, validRegistry()), false);
});

test("rejects a secondary source even when all metadata is present", () => {
  const record = validRecord();
  record.sources[0].source_class = "secondary_legal_database";
  assert.equal(isPrimaryVerificationComplete(record, validRegistry()), false);
});

test("rejects a source URL that differs from the exact verified document URL", () => {
  const record = validRecord();
  record.sources[0].url = "https://official.example/law/456";
  assert.equal(isPrimaryVerificationComplete(record, validRegistry()), false);
});

test("rejects malformed content hashes", () => {
  const record = validRecord();
  record.provenance.content_sha256 = "not-a-hash";
  assert.equal(isPrimaryVerificationComplete(record, validRegistry()), false);
});

test("rejects impossible publication calendar dates", () => {
  const record = validRecord();
  record.provenance.publication_date = "2024-02-31";
  assert.equal(isPrimaryVerificationComplete(record, validRegistry()), false);
});

test("rejects timestamps without an explicit timezone", () => {
  const record = validRecord();
  record.provenance.reviewed_at = "2026-11-08T11:00:00";
  assert.equal(isPrimaryVerificationComplete(record, validRegistry()), false);
});

test("rejects unverified records without treating them as failures", () => {
  const record = validRecord();
  record.review_status = "needs_legal_review";
  assert.equal(isPrimaryVerificationComplete(record, validRegistry()), false);
});

test("accepts a dated landing-page reachability check without implying legal verification", () => {
  const source = {
    id: "src_judicial",
    url: "https://ara.jri.ac.ir/",
    live_access_checked: true,
    access_check: {
      result: "reachable",
      scope: "landing_page_only",
      checked_on: "2026-11-09",
      evidence_url: "https://ara.jri.ac.ir/",
      notes: "Search interface and institutional footer were visible; individual judgments were not verified.",
    },
  };
  assert.equal(isLiveAccessEvidenceComplete(source), true);
});

test("rejects live-access flags without complete or matching evidence", () => {
  const missing = { id: "src", url: "https://example.com/", live_access_checked: true };
  assert.equal(isLiveAccessEvidenceComplete(missing), false);
  const wrongUrl = {
    id: "src", url: "https://example.com/", live_access_checked: true,
    access_check: {
      result: "reachable", scope: "landing_page_only", checked_on: "2026-11-09",
      evidence_url: "https://other.example/", notes: "A page was visible.",
    },
  };
  assert.equal(isLiveAccessEvidenceComplete(wrongUrl), false);
});

test("requires explicit false when no live access check has been performed", () => {
  assert.equal(isLiveAccessEvidenceComplete({ id: "src", url: "https://example.com/", live_access_checked: false }), true);
  assert.equal(isLiveAccessEvidenceComplete({ id: "src", url: "https://example.com/" }), false);
});
