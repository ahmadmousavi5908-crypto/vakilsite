import test from "node:test";
import assert from "node:assert/strict";
import { auditGrowthArticle, auditGrowthLibrary, normalizeGrowthText } from "../../src/lib/mavis/growth-audit.mjs";

const completeArticle = {
  slug: "property-contract-review",
  category: "حقوق املاک",
  title: "پیش از امضای قرارداد خرید ملک چه مواردی را بررسی کنیم؟",
  excerpt: "راهنمای بررسی هویت طرفین، سند مالکیت، تعهدات قراردادی و مدارک پیش از امضای قرارداد خرید ملک.",
  intro: "پیش از امضای قرارداد باید اطلاعات و مدارک به دقت بررسی شوند.",
  sections: [
    { heading: "بررسی سند", body: "وضعیت مالکیت و محدودیت‌های ثبتی را بررسی کنید." },
    { heading: "بررسی تعهدات", body: "تعهدات و زمان‌بندی را روشن کنید." },
    { heading: "بررسی ضمانت اجرا", body: "ضمانت اجرا و حل اختلاف را بررسی کنید." }
  ],
  checklist: ["سند مالکیت", "مدارک هویتی", "شرایط پرداخت"],
  warning: "این مطلب جایگزین بررسی اسناد و مشاوره اختصاصی نیست.",
  sources: [{ label: "منبع", url: "https://example.org/law" }]
};

test("normalizes Persian and Arabic text and digits", () => {
  assert.equal(normalizeGrowthText("ي ك ۱۲۳ نیم‌فاصله"), "ی ک 123 نیم فاصله");
});

test("does not flag a complete article with safe source links", () => {
  const report = auditGrowthArticle(completeArticle);
  assert.equal(report.criticalCount, 0);
  assert.equal(report.warningCount, 0);
  assert.ok(report.candidateKeywords.length > 0);
});

test("flags missing legal sources, disclaimer and invalid slug", () => {
  const report = auditGrowthArticle({ title: "مقاله", excerpt: "کوتاه", sections: [], checklist: [], sources: [], slug: "../unsafe" });
  assert.ok(report.findings.some((item) => item.code === "invalid_slug"));
  assert.ok(report.findings.some((item) => item.code === "missing_sources"));
  assert.ok(report.findings.some((item) => item.code === "missing_legal_disclaimer"));
});

test("rejects non-HTTPS and credential-bearing source URLs", () => {
  const report = auditGrowthArticle({ ...completeArticle, sources: [{ url: "http://example.org" }, { url: "https://user:pass@example.org" }] });
  assert.ok(report.findings.some((item) => item.code === "unsafe_source_url"));
});

test("detects possible content overlap without treating it as proven cannibalization", () => {
  const similar = { ...completeArticle, slug: "property-contract-guide", title: completeArticle.title + " راهنمای حقوقی", excerpt: completeArticle.excerpt };
  const report = auditGrowthLibrary([completeArticle, similar]);
  assert.equal(report.duplicatePairs.length, 1);
  assert.equal(report.duplicatePairs[0].reviewRequired, true);
  assert.ok(report.limitations.some((item) => item.includes("اثبات هم‌نوع‌خواری")));
});
