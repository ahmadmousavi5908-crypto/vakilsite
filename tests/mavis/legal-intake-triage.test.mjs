import test from "node:test";
import assert from "node:assert/strict";
import { triageLegalIntake } from "../../src/lib/mavis/legal-intake-triage.mjs";

test("routes explicit court notices and deadlines to urgent human review", () => {
  const result = triageLegalIntake("امروز ابلاغیه تجدیدنظر دریافت کردم و مهلت اعتراض در حال پایان است.");
  assert.equal(result.reviewPriority, "urgent_human_review");
  assert.equal(result.requiresDeadlineCheck, true);
  assert.equal(result.deadlineCalculated, false);
});

test("flags detention and family safety without producing legal conclusions", () => {
  const criminal = triageLegalIntake("یکی از اعضای خانواده بازداشت شده است.");
  const safety = triageLegalIntake("تهدید جانی و خشونت خانگی وجود دارد.");
  assert.equal(criminal.reviewPriority, "urgent_human_review");
  assert.equal(safety.reviewPriority, "urgent_human_review");
  assert.equal(safety.legalAssessment, null);
});

test("routes enforcement signals for priority review", () => {
  const result = triageLegalIntake("برای ملک اجرائیه صادر شده و حساب بانکی مسدود شده است.");
  assert.equal(result.reviewPriority, "priority_human_review");
  assert.ok(result.detectedSignals.includes("enforcement_or_property"));
});

test("does not escalate ordinary descriptions or accept empty input", () => {
  assert.equal(triageLegalIntake("برای تنظیم قرارداد مشارکت نیازمند راهنمایی هستم.").reviewPriority, "standard_human_review");
  assert.equal(triageLegalIntake("کمک").ok, false);
});

test("returns context questions but never computes deadlines", () => {
  const result = triageLegalIntake("در پرونده من جلسه رسیدگی تعیین شده است.");
  assert.equal(result.deadlineCalculated, false);
  assert.equal(result.followUpQuestions.length, 4);
});
