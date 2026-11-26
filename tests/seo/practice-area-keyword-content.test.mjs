import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { practiceAreas } from "../../src/data/practice-areas.js";
import { normalizePersianSearchText } from "../../src/lib/mavis/persian-text-normalization.mjs";
import { PRACTICE_AREA_META_TITLES, PRACTICE_AREA_KEYWORDS } from "../../src/lib/seo/practice-area-search-titles.mjs";

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
    ...(area.reviewSteps || []),
    ...(area.legalGuides || []).flatMap((guide) => [guide.title, guide.summary, ...(guide.evidence || [])]),
    area.registrationNotice?.title,
    area.registrationNotice?.body,
    ...(area.legalSources || []).flatMap((source) => [source.title, source.summary]),
    ...(area.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
    ...(Object.values(area.sectionHeadings || {})),
    area.contentAuthor,
    area.contentAuthorRole,
    area.lastReviewed,
    area.lastReviewedLabel,
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

test("covers best-lawyer search intent with neutral selection guidance across existing service pages", () => {
  const bySlug = new Map(practiceAreas.map((area) => [area.slug, area]));
  const property = visiblePracticeAreaText(bySlug.get("property-law"));
  const family = visiblePracticeAreaText(bySlug.get("family-law"));
  const criminal = visiblePracticeAreaText(bySlug.get("criminal-law"));
  const contracts = visiblePracticeAreaText(bySlug.get("contracts-and-obligations"));
  const claims = visiblePracticeAreaText(bySlug.get("claims-and-enforcement"));

  assert.ok(property.includes(normalizePersianSearchText("بهترین وکیل ملکی اهواز")));
  assert.ok(family.includes(normalizePersianSearchText("بهترین وکیل خانواده اهواز")));
  assert.ok(criminal.includes(normalizePersianSearchText("بهترین وکیل کیفری اهواز")));
  assert.ok(contracts.includes(normalizePersianSearchText("بهترین وکیل قرارداد اهواز")));
  assert.ok(claims.includes(normalizePersianSearchText("بهترین وکیل چک برگشتی اهواز")));
  for (const content of [property, family, criminal]) {
    assert.ok(content.includes(normalizePersianSearchText("اعتبار پروانه")));
    assert.ok(content.includes(normalizePersianSearchText("پرهیز از تضمین نتیجه")));
  }
  for (const content of [contracts, claims]) {
    assert.ok(content.includes(normalizePersianSearchText("تناسب تجربه قابل‌اثبات")));
    assert.ok(content.includes(normalizePersianSearchText("پرهیز از وعده نتیجه")));
  }
  assert.ok(family.includes(normalizePersianSearchText("حفظ محرمانگی")));
  assert.ok(property.includes(normalizePersianSearchText("پرهیز از تضمین نتیجه")));
});

test("adds a visible, bounded case-review workflow to the property service page", () => {
  const property = practiceAreas.find((area) => area.slug === "property-law");
  assert.ok(property);
  assert.equal(property.reviewSteps.length, 4);
  const visibleText = visiblePracticeAreaText(property);
  for (const phrase of [
    "تعیین موضوع اختلاف و خواسته واقعی",
    "بررسی سند، پلاک و سوابق ثبتی",
    "مقایسه قراردادها، پرداخت‌ها، مکاتبات",
    "مرجع مرتبط و مهلت‌های قانونی"
  ]) {
    assert.ok(visibleText.includes(normalizePersianSearchText(phrase)), "Missing property review step: " + phrase);
  }
});

test("does not count the internal searchTerms array as public page content", () => {
  const area = practiceAreas.find((item) => item.slug === "criminal-law");
  const visibleText = visiblePracticeAreaText(area);
  assert.ok(!visibleText.includes(normalizePersianSearchText("وکیل جرایم مواد مخدر")));
  assert.ok(visibleText.includes(normalizePersianSearchText("دفاع از متهم")));
});


test("provides substantive legal distinctions and cited primary references for property disputes", () => {
  const property = practiceAreas.find((area) => area.slug === "property-law");
  assert.ok(property);
  assert.equal(property.legalGuides.length, 4);
  assert.equal(property.legalSources.length, 7);

  const visibleText = visiblePracticeAreaText(property);
  for (const phrase of [
    "خلع ید: بررسی مالکیت و تصرف بدون مجوز",
    "تصرف عدوانی حقوقی: سبق تصرف و خروج بدون رضایت",
    "تخلیه: رابطه استیجاری، مدت و وضعیت ودیعه",
    "مواد ۳۰۸ و ۳۱۱",
    "مواد ۱۵۸ و ۱۶۱",
    "مواد ۴۳ و ۴۴",
    "۱۴۰۵/۰۳/۰۱",
    "ماده ۲۲ قانون ثبت اسناد و املاک",
    "ماده ۲۲ قانون ثبت: مالک رسمی چگونه شناسایی می‌شود؟",
    "۲۶ نوامبر ۲۰۲۶",
    "سید احمد موسوی",
    "تاریخ شمول سایر املاک"
  ]) {
    assert.ok(visibleText.includes(normalizePersianSearchText(phrase)), "Missing property-law guidance: " + phrase);
  }

  for (const source of property.legalSources) {
    assert.ok(source.title && source.summary);
    assert.equal(new URL(source.url).protocol, "https:");
  }
});

test("adds verifiable author, review date and question-led headings to the property service page", () => {
  const property = practiceAreas.find((area) => area.slug === "property-law");
  assert.ok(property);
  assert.equal(property.contentAuthor, "سید احمد موسوی");
  assert.equal(property.contentAuthorRole, "وکیل پایه یک دادگستری");
  assert.equal(property.lastReviewed, "2026-11-26");
  assert.ok(property.sectionHeadings.topics.endsWith("؟"));
  assert.ok(property.sectionHeadings.checks.endsWith("؟"));

  const template = readFileSync(
    new URL("../../src/app/services/[slug]/page.js", import.meta.url),
    "utf8",
  );
  assert.ok(template.includes("dateModified: area.lastReviewed"));
  assert.ok(template.includes('author: { "@id": siteUrl + "/#attorney" }'));
  assert.ok(template.includes("area.contentAuthor"));
  assert.ok(template.includes("area.sectionHeadings?.topics"));
});


test("assigns best-lawyer intent to each canonical service title and page keyword set", () => {
  const expected = {
    "family-law": "بهترین وکیل خانواده اهواز",
    "criminal-law": "بهترین وکیل کیفری اهواز",
    "property-law": "بهترین وکیل ملکی اهواز",
    "contracts-and-obligations": "بهترین وکیل قرارداد اهواز",
    "claims-and-enforcement": "بهترین وکیل چک و مطالبه وجه اهواز",
    "legal-consultation": "بهترین وکیل اهواز"
  };

  for (const [slug, phrase] of Object.entries(expected)) {
    assert.ok(PRACTICE_AREA_META_TITLES[slug].includes(phrase), `Missing title intent for ${slug}`);
    assert.ok(PRACTICE_AREA_KEYWORDS[slug].includes(phrase), `Missing page keyword for ${slug}`);
    assert.ok(PRACTICE_AREA_KEYWORDS[slug].some((term) => /حرفه‌ای|باتجربه|متخصص/.test(term)));
  }
});
