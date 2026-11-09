import test from "node:test";
import assert from "node:assert/strict";
import { buildLegalResearchNoteRecords } from "../../src/lib/mavis/legal-research-note-adapter.mjs";

test("adapts the canonical source-review report without upgrading secondary evidence", () => {
  const records = buildLegalResearchNoteRecords({
    review_date: "2026-11-01",
    items: [{
      topic: "قانون نمونه و وضعیت اجرای آن",
      status: "secondary_source_only",
      findings: ["گزارش ثانویه درباره اجرای مرحله‌ای قانون."],
      sources: [
        "https://example.org/research",
        "http://insecure.example/source",
        "https://user:pass@example.org/private",
      ],
      caution: "متن رسمی و اصلاحات باید جداگانه بررسی شود.",
    }],
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].record_type, "research_note");
  assert.equal(records[0].source_class, "research_note");
  assert.equal(records[0].review_status, "secondary_source_only");
  assert.equal(records[0].source_verified, false);
  assert.equal(records[0].validity_status, "unknown");
  assert.equal(records[0].review_date, "2026-11-01");
  assert.equal(records[0].sources.length, 1);
  assert.equal(records[0].sources[0].source_type, "secondary");
  assert.equal(records[0].sources[0].verification_status, "secondary_source_only");
  assert.match(records[0].definition, /متن رسمی/);
});

test("rejects malformed reports and duplicate or empty notes", () => {
  assert.deepEqual(buildLegalResearchNoteRecords(null), []);
  assert.deepEqual(buildLegalResearchNoteRecords({ items: "invalid" }), []);
  const records = buildLegalResearchNoteRecords({
    items: [
      { topic: "موضوع تکراری", findings: ["یادداشت اول"] },
      { topic: "موضوع تکراری", findings: ["یادداشت دوم"] },
      { topic: "   ", findings: ["بدون عنوان"] },
      { topic: "یادداشت خالی", findings: [], caution: "" },
    ],
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].review_status, "needs_legal_review");
});

test("keeps note text bounded and normalizes unsafe control characters", () => {
  const records = buildLegalResearchNoteRecords({
    items: [{
      topic: "یادداشت\u0000 پژوهشی",
      findings: ["متن\u0000 " + "الف".repeat(9000)],
      sources: ["https://example.org/"],
    }],
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].title.includes("\u0000"), false);
  assert.ok(records[0].definition.length <= 8000);
});


import { readFileSync } from "node:fs";
const canonicalReport = JSON.parse(readFileSync(
  new URL("../../src/data/legal-library/reports/source-review.json", import.meta.url),
  "utf8",
));

test("connects every canonical source-review note without upgrading its review status", () => {
  const records = buildLegalResearchNoteRecords(canonicalReport);
  assert.equal(records.length, canonicalReport.items.length);
  assert.ok(records.length > 0);
  assert.ok(records.every((record) => record.record_type === "research_note"));
  assert.ok(records.every((record) => record.source_class === "research_note"));
  assert.ok(records.every((record) => record.review_status !== "verified_primary_source"));
  assert.ok(records.every((record) => record.source_verified === false));
  assert.ok(records.every((record) => record.validity_status === "unknown"));
  assert.ok(records.every((record) => record.sources.every((source) =>
    source.source_type === "secondary" &&
    source.verification_status === "secondary_source_only"
  )));
});
