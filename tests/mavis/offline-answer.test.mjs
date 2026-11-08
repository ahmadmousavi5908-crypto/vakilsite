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

test("returns a clear no-match response instead of inventing an answer", () => {
  const answer = buildOfflineAnswer("موضوع ناشناخته", []);
  assert.equal(answer.status, "no_match");
  assert.match(answer.summary, /نبود حق یا راهکار قانونی نیست/);
  assert.equal(answer.recordId, null);
});
