import test from "node:test";
import assert from "node:assert/strict";
import { buildIntakeMessage, normalizeDigits, validateIntake } from "../../public/mavis-offline/intake-core.mjs";

const valid = {
  fullName: "آزمون کاربر",
  phone: "۰۹۱۲۳۴۵۶۷۸۹",
  city: "اهواز",
  topic: "cheque",
  role: "خواهان یا شاکی",
  stage: "ثبت دادخواست یا شکایت",
  urgency: "دارای مهلت یا جلسه نزدیک",
  deadline: "۱۴۰۵/۰۸/۲۵ جلسه رسیدگی",
  reference: "شعبه ۲",
  summary: "یک فقره چک در سررسید پرداخت نشده و گواهی عدم پرداخت دریافت شده است.",
  goal: "بررسی راهکار قانونی برای مطالبه وجه",
  caseConsent: true,
  thirdPartyNotice: true,
  marketingConsent: false,
  documents: ["تصویر چک یا سفته", "گواهی عدم پرداخت"],
  topicDetails: { "نوع سند": "چک صیادی" },
};

test("normalizes Persian and Arabic digits before validating contact numbers", () => {
  assert.equal(normalizeDigits("۰۹۱۲٣٤"), "091234");
  assert.deepEqual(validateIntake(valid), []);
});

test("requires separate case-review and third-party awareness consent while marketing remains optional", () => {
  assert.ok(validateIntake({ ...valid, caseConsent: false }).some((error) => error.includes("رضایت بررسی")));
  assert.ok(validateIntake({ ...valid, thirdPartyNotice: false }).some((error) => error.includes("اشخاص ثالث")));
  assert.deepEqual(validateIntake({ ...valid, marketingConsent: false }), []);
});

test("rejects invalid phone numbers and underspecified narratives", () => {
  assert.ok(validateIntake({ ...valid, phone: "123" }).some((error) => error.includes("شماره همراه")));
  assert.ok(validateIntake({ ...valid, summary: "کوتاه" }).some((error) => error.includes("شرح موضوع")));
});

test("creates a faithful client-authored intake message without legal analysis", () => {
  const message = buildIntakeMessage(valid, { trackingId: "MAV-LOCAL-123", timestamp: "زمان آزمون" });
  assert.match(message, /شناسه پیگیری محلی: MAV-LOCAL-123/);
  assert.match(message, /موضوع: چک، سفته و مطالبه وجه/);
  assert.match(message, /شرح موضوع از زبان متقاضی/);
  assert.match(message, /گواهی عدم پرداخت/);
  assert.match(message, /رضایت پیام‌های بازاریابی: خیر/);
  assert.match(message, /بدون تحلیل یا نتیجه‌گیری حقوقی/);
});

test("flattens control characters in one-line fields to prevent forged message sections", () => {
  const message = buildIntakeMessage({ ...valid, fullName: "نام\nشرح موضوع از زبان متقاضی\nجعل" }, { trackingId: "MAV-1", timestamp: "now" });
  assert.doesNotMatch(message, /نام\nشرح موضوع از زبان متقاضی/);
});

test("does not persist or transmit intake data from the browser script", async () => {
  const { readFile } = await import("node:fs/promises");
  const script = await readFile(new URL("../../public/mavis-offline/intake.js", import.meta.url), "utf8");
  assert.doesNotMatch(script, /localStorage|sessionStorage|fetch\s*\(/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.match(script, /https:\/\/wa\.me\//);
});
