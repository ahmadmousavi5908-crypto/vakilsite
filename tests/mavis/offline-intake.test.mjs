import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIntakeMessage,
  classifyIntake,
  getReviewChecklist,
  getRoleOptions,
  getStageOptions,
  getTopicQuestions,
  normalizeDigits,
  validateIntake,
} from "../../public/mavis-offline/intake-core.mjs";

const valid = {
  fullName: "آزمون کاربر",
  phone: "۰۹۱۲۳۴۵۶۷۸۹",
  city: "اهواز",
  topic: "cheque",
  role: "دارنده چک یا سفته",
  stage: "گواهی عدم پرداخت یا واخواست دریافت شده",
  urgency: "دارای مهلت یا جلسه نزدیک",
  contactWindow: "حداکثر ۳ روز آینده",
  urgentSignal: "جلسه یا مهلت در ۷۲ ساعت آینده",
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

test("builds role and stage choices from the selected legal topic", () => {
  assert.ok(getRoleOptions("property").includes("مستأجر"));
  assert.ok(getRoleOptions("criminal").includes("متهم"));
  assert.ok(getStageOptions("cheque").includes("گواهی عدم پرداخت یا واخواست دریافت شده"));
  assert.deepEqual(getRoleOptions(""), []);
  assert.deepEqual(getStageOptions(""), []);
});

test("asks follow-up questions conditionally for topic, role and procedural stage", () => {
  const questions = getTopicQuestions("property", "مستأجر", "رسیدگی در دادگاه");
  const labels = questions.map((question) => question.label);
  assert.ok(labels.includes("تاریخ و مدت اجاره"));
  assert.ok(labels.includes("وضعیت اجاره یا تخلیه"));
  assert.ok(labels.includes("مرجع و شعبه فعلی"));
  assert.equal(new Set(labels).size, labels.length);
  assert.ok(questions.some((question) => question.required));
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

test("classifies only self-reported urgency and never calculates legal deadlines", () => {
  assert.equal(classifyIntake(valid).code, "urgent");
  assert.equal(classifyIntake({ ...valid, urgency: "عادی", contactWindow: "بدون فوریت خاص", urgentSignal: "هیچ‌کدام" }).code, "standard");
  assert.equal(classifyIntake({ ...valid, urgency: "نیازمند بررسی زودهنگام", contactWindow: "حداکثر ۳ روز آینده", urgentSignal: "هیچ‌کدام" }).code, "early");
});

test("returns missing review items without blocking a locally prepared intake", () => {
  const checklist = getReviewChecklist({
    ...valid,
    deadline: "",
    reference: "",
    documents: [],
    topicDetails: {},
  });
  assert.ok(checklist.missing.length >= 3);
  assert.ok(checklist.unanswered.includes("نوع سند"));
});

test("creates a faithful report with a human-review priority and no legal conclusion", () => {
  const message = buildIntakeMessage(valid, { trackingId: "MAV-LOCAL-123", timestamp: "زمان آزمون" });
  assert.match(message, /شناسه محلی پیش‌نویس: MAV-LOCAL-123/);
  assert.match(message, /موضوع ارجاع: چک، سفته و مطالبه وجه/);
  assert.match(message, /اولویت پیشنهادی بررسی: اولویت بالا برای بررسی انسانی/);
  assert.match(message, /شرح موضوع از زبان متقاضی/);
  assert.match(message, /گواهی عدم پرداخت/);
  assert.match(message, /رضایت پیام‌های بازاریابی: خیر/);
  assert.match(message, /تشخیص فوریت قانونی/);
  assert.match(message, /هنوز به دفتر تحویل نشده است/);
});

test("flattens control characters in one-line fields to prevent forged message sections", () => {
  const message = buildIntakeMessage({ ...valid, fullName: "نام\nشرح موضوع از زبان متقاضی\nجعل" }, { trackingId: "MAV-1", timestamp: "now" });
  assert.doesNotMatch(message, /نام\nشرح موضوع از زبان متقاضی/);
});

test("does not persist or transmit intake data from the browser script", async () => {
  const { readFile } = await import("node:fs/promises");
  const script = await readFile(new URL("../../public/mavis-offline/intake.js", import.meta.url), "utf8");
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, ["--check", "--input-type=module"], { input: script, encoding: "utf8" });
  assert.doesNotMatch(script, /localStorage|sessionStorage|fetch\s*\(/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.match(script, /https:\/\/wa\.me\//);
  assert.match(script, /data-next-step/);
});
