import assert from "node:assert/strict";
import test from "node:test";
import { practiceAreas } from "../../src/data/practice-areas.js";
import { normalizePersianSearchText } from "../../src/lib/mavis/persian-text-normalization.mjs";

const requiredPhrasesByArea = {
  "family-law": [
    "حضانت فرزند",
    "ملاقات فرزند",
    "نفقه فرزند",
    "مطالبه نفقه معوقه",
    "تمکین",
    "اجرت‌المثل ایام زوجیت"
  ],
  "criminal-law": [
    "کلاهبرداری اینترنتی",
    "خیانت در امانت",
    "سرقت",
    "جعل",
    "ضرب‌وجرح",
    "اعتراض به قرار منع تعقیب",
    "قرار تأمین کیفری"
  ],
  "property-law": [
    "خلع ید",
    "رفع تصرف عدوانی",
    "ابطال سند رسمی",
    "الزام به تنظیم سند رسمی",
    "سرقفلی",
    "تخلیه مغازه",
    "اثبات مالکیت"
  ],
  "contracts-and-obligations": [
    "فسخ قرارداد",
    "اقاله قرارداد",
    "ابطال قرارداد",
    "وجه التزام",
    "الزام به انجام تعهد",
    "خسارت قراردادی",
    "مشارکت در ساخت"
  ],
  "claims-and-enforcement": [
    "چک برگشتی",
    "مطالبه وجه چک",
    "اجراییه مستقیم چک",
    "مطالبه وجه سفته",
    "واخواست سفته",
    "اعسار از پرداخت محکوم‌به",
    "توقیف اموال"
  ],
  "legal-consultation": [
    "تنظیم دادخواست حقوقی",
    "تجدیدنظرخواهی",
    "واخواهی حقوقی",
    "اعتراض ثالث حقوقی",
    "تأمین خواسته",
    "دستور موقت",
    "تأمین دلیل"
  ]
};

function visiblePracticeAreaText(area) {
  return normalizePersianSearchText([
    area.title,
    area.shortTitle,
    area.description,
    area.intro,
    ...(area.topics || []),
    ...(area.checks || []),
    ...(area.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
    area.note
  ].filter(Boolean).join(" "));
}

test("keeps selected intent phrases in crawlable service-page content", () => {
  const bySlug = new Map(practiceAreas.map((area) => [area.slug, area]));
  for (const [slug, phrases] of Object.entries(requiredPhrasesByArea)) {
    const area = bySlug.get(slug);
    assert.ok(area, `Missing service-page data for ${slug}`);
    const visibleText = visiblePracticeAreaText(area);
    const missing = phrases.filter((phrase) => !visibleText.includes(normalizePersianSearchText(phrase)));
    assert.deepEqual(missing, [], `Uncovered phrases on ${slug}: ${missing.join("، ")}`);
  }
});

test("does not count the internal searchTerms array as public page content", () => {
  const area = practiceAreas.find((item) => item.slug === "criminal-law");
  const visibleText = visiblePracticeAreaText(area);
  assert.ok(!visibleText.includes(normalizePersianSearchText("وکیل جرایم مواد مخدر")));
  assert.ok(visibleText.includes(normalizePersianSearchText("دفاع در تحقیقات مقدماتی")));
});
