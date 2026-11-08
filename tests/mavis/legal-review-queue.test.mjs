import test from "node:test";
import assert from "node:assert/strict";
import { LEGAL_QUEUE_HEADERS, parseCsv, validateLegalReviewQueue } from "../../scripts/mavis/validate-legal-review-queue.mjs";

const makeRow = (overrides = {}) => {
  const record = {
    record_id: "law_example",
    record_type: "law",
    title: "نمونه قانون",
    review_status: "needs_legal_review",
    source_ids: "src_official",
    primary_document_retrieved: "false",
    primary_document_identifier: "",
    issuing_authority: "",
    approved_at: "",
    notified_at: "",
    published_at: "",
    effective_from: "",
    effective_until: "",
    amendment_chain_reviewed: "false",
    retrieved_at: "",
    content_sha256: "",
    reviewer_id: "",
    reviewed_at: "",
    next_action: "Retrieve the official publication.",
    ...overrides,
  };
  return LEGAL_QUEUE_HEADERS.map((header) => record[header] ?? "");
};

const makeCsv = (...rows) => [
  LEGAL_QUEUE_HEADERS.join(","),
  ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
].join("\n");

test("parses quoted commas, escaped quotes, and embedded newlines", () => {
  assert.deepEqual(parseCsv('"title","note"\n"Law, code","He said ""check""\nthis"'), [
    ["title", "note"],
    ["Law, code", 'He said "check"\nthis'],
  ]);
});

test("rejects unterminated quoted fields", () => {
  assert.throws(() => parseCsv('"title","note\n"Law","text'), /Unterminated/);
});

test("accepts the current review-queue row contract", () => {
  const result = validateLegalReviewQueue(makeCsv(makeRow()), {
    knownSourceIds: ["src_official"],
    expectedRecordIds: ["law_example"],
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.recordCount, 1);
});

test("rejects an unexpected header or column count", () => {
  const badHeader = validateLegalReviewQueue("record_id,title\na,b");
  assert.match(badHeader.errors[0], /header/);

  const badRow = validateLegalReviewQueue(makeCsv(makeRow().slice(0, -1)));
  assert.match(badRow.errors[0], /columns/);
});

test("rejects duplicate IDs and unknown source references", () => {
  const row = makeRow();
  const result = validateLegalReviewQueue(makeCsv(row, row), { knownSourceIds: [] });
  assert.ok(result.errors.some((error) => error.includes("Duplicate record_id")));
  assert.ok(result.errors.some((error) => error.includes("unknown source_id")));
});

test("rejects invalid boolean metadata", () => {
  const result = validateLegalReviewQueue(makeCsv(makeRow({ primary_document_retrieved: "yes" })));
  assert.ok(result.errors.some((error) => error.includes("invalid boolean")));
});

test("does not allow a verified label without complete primary evidence", () => {
  const result = validateLegalReviewQueue(makeCsv(makeRow({ review_status: "verified_primary_source" })));
  assert.ok(result.errors.some((error) => error.includes("without a retrieved primary document")));
  assert.ok(result.errors.some((error) => error.includes("amendment/repeal review")));
  assert.ok(result.errors.some((error) => error.includes("without a linked source")));
});

test("accepts a verified row only with primary evidence, provenance, dates, hash and reviewer", () => {
  const row = makeRow({
    review_status: "verified_primary_source",
    primary_document_retrieved: "true",
    primary_document_identifier: "Gazette issue 123",
    issuing_authority: "Official issuing authority",
    published_at: "2024-01-01",
    amendment_chain_reviewed: "true",
    retrieved_at: "2026-11-08T10:00:00Z",
    content_sha256: "a".repeat(64),
    reviewer_id: "lawyer-01",
    reviewed_at: "2026-11-08T11:00:00Z",
  });
  const result = validateLegalReviewQueue(makeCsv(row), {
    knownSourceIds: ["src_official"],
    expectedRecordIds: ["law_example"],
  });
  assert.deepEqual(result.errors, []);
});

test("rejects missing canonical records", () => {
  const result = validateLegalReviewQueue(makeCsv(makeRow()), {
    expectedRecordIds: ["law_example", "article_missing"],
  });
  assert.ok(result.errors.some((error) => error.includes("missing canonical legal record")));
});
