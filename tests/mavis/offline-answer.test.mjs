import test from "node:test";
import assert from "node:assert/strict";
import { buildOfflineAnswer } from "../../public/mavis-offline/answer.mjs";

test("builds a deterministic answer from the best retrieved record", () => {
  const answer = buildOfflineAnswer("چک برگشتی", [{
    id: "term_cheque_bounce",
    title: "چک برگشتی",
    summary: "گواهی عدم پرداخت و تاریخ مراجعه به بانک را نگهداری کنید.",
    review_status: "secondary_source_only",
    sources: [{ url: "https://example.org/law" }],
  }]);
  assert.equal(answer.status, "retrieved");
  assert.equal(answer.recordId, "term_cheque_bounce");
  assert.match(answer.summary, /گواهی عدم پرداخت/);
  assert.match(answer.sourceStatus, /منابع ثانویه/);
  assert.equal(answer.sources.length, 1);
});

test("adds cautious topic-specific follow-up prompts for deadlines and legal matters", () => {
  const record = { id: "law", title: "قانون", summary: "خلاصه" };
  assert.match(buildOfflineAnswer("مهلت تجدیدنظر", [record]).followUp, /تاریخ دقیق ابلاغ/);
  assert.match(buildOfflineAnswer("چک برگشتی", [record]).followUp, /گواهی عدم پرداخت/);
  assert.match(buildOfflineAnswer("ثبت ادعای ملک", [record]).followUp, /سند حدنگار/);
});

test("never implies current validity or primary verification without explicit provenance", () => {
  const answer = buildOfflineAnswer("قانون", [{ id: "law", title: "قانون", summary: "متن", review_status: "verified_primary_source" }]);
  assert.equal(answer.currentValidityVerified, false);
  assert.match(answer.sourceStatus, /به‌طور کامل تأیید نشده/);
});

test("separates primary document review from current legal validity", () => {
  const answer = buildOfflineAnswer("قانون", [{
    id: "law-reviewed",
    title: "قانون بررسی‌شده",
    summary: "متن",
    review_status: "verified_primary_source",
    provenance: {
      exact_primary_document_verified: true,
      current_validity_verified: false,
      last_primary_source_check: null,
    },
  }]);

  assert.match(answer.sourceStatus, /وضعیت اعتبار فعلی/);
  assert.match(answer.sourceStatus, /تأیید نشده/);
  assert.equal(answer.currentValidityVerified, false);
});

test("requires a real primary-source review date before claiming current validity", () => {
  const answer = buildOfflineAnswer("قانون", [{
    id: "law-date-missing",
    title: "قانون",
    review_status: "verified_primary_source",
    provenance: {
      exact_primary_document_verified: true,
      current_validity_verified: true,
      last_primary_source_check: "2026-02-31",
    },
  }]);

  assert.equal(answer.currentValidityVerified, false);
  assert.match(answer.sourceStatus, /تأیید نشده/);
});

test("reports current validity only when its flag and primary-source review date are valid", () => {
  const answer = buildOfflineAnswer("قانون", [{
    id: "law-current",
    title: "قانون",
    review_status: "verified_primary_source",
    provenance: {
      exact_primary_document_verified: true,
      current_validity_verified: true,
      last_primary_source_check: "2026-11-08",
    },
  }]);

  assert.equal(answer.currentValidityVerified, true);
  assert.match(answer.sourceStatus, /وضعیت اعتبار فعلی نیز/);
});

test("returns a clear no-match response instead of inventing an answer", () => {
  const answer = buildOfflineAnswer("موضوع ناشناخته", []);
  assert.equal(answer.status, "no_match");
  assert.match(answer.summary, /نبود حق یا راهکار قانونی نیست/);
  assert.equal(answer.recordId, null);
});
