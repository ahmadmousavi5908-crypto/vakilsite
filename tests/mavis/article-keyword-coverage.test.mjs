import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMavisArticleKeywordCoverage } from "../../src/lib/mavis/article-keyword-coverage.mjs";

test("matches the primary keyword in visible article content with Persian normalization", () => {
  const result = analyzeMavisArticleKeywordCoverage({
    focus_keyword: "پابند الکترونیکی پیش از ورود به زندان",
    related_keywords: ["رأی وحدت رویه ۸۷۴", "نظارت الکترونیکی"],
    content: {
      intro: "پابند الکترونیکی پیش‌از ورود به زندان موضوع این راهنماست.",
      sections: [{ heading: "رأی وحدت رویه ۸۷۴", body: "نظارت الکترونیکی با شرایط قانونی بررسی می‌شود." }]
    }
  });
  assert.equal(result.focusKeywordPresent, true);
  assert.equal(result.relatedKeywordCount, 2);
  assert.deepEqual(result.matchedRelatedKeywords, ["رأی وحدت رویه ۸۷۴", "نظارت الکترونیکی"]);
  assert.equal(result.relatedCoverage, 1);
});

test("does not count title or metadata alone as body coverage", () => {
  const result = analyzeMavisArticleKeywordCoverage({
    title: "ابطال سند رسمی",
    focus_keyword: "ابطال سند رسمی",
    related_keywords: ["دادگاه کیفری"],
    content: {
      intro: "این مقاله درباره اختلاف حقوقی است.",
      sections: [{ heading: "مقدمه", body: "مدارک و مستندات باید بررسی شوند." }]
    }
  });
  assert.equal(result.focusKeywordPresent, false);
  assert.deepEqual(result.matchedRelatedKeywords, []);
});

test("deduplicates related keywords and leaves coverage optional when none are selected", () => {
  const result = analyzeMavisArticleKeywordCoverage({
    focus_keyword: "رد مال غیرمنقول",
    related_keywords: ["ابطال سند رسمی", "ابطال سند رسمی", "دادگاه کیفری"],
    content: {
      intro: "رد مال غیرمنقول و ابطال سند رسمی باید جداگانه بررسی شود.",
      sections: []
    }
  });
  assert.equal(result.focusKeywordPresent, true);
  assert.equal(result.relatedKeywordCount, 2);
  assert.deepEqual(result.matchedRelatedKeywords, ["ابطال سند رسمی"]);
  assert.equal(result.relatedCoverage, 0.5);

  const empty = analyzeMavisArticleKeywordCoverage({
    focus_keyword: "راهنمای حقوقی",
    related_keywords: [],
    content: { intro: "راهنمای حقوقی برای مخاطبان", sections: [] }
  });
  assert.equal(empty.relatedCoverage, null);
});
