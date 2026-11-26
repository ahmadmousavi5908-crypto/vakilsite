import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aboutPage = readFileSync(new URL("../../src/app/about/page.js", import.meta.url), "utf8");
const homepage = readFileSync(new URL("../../src/app/page.js", import.meta.url), "utf8");

test("publishes the confirmed criminal-law master's degree consistently in the attorney profile", () => {
  assert.ok(aboutPage.includes("کارشناسی ارشد حقوق جزا"));
  assert.ok(aboutPage.includes('["تحصیلات", "کارشناسی ارشد حقوق جزا"]'));
  assert.ok(homepage.includes("دارای کارشناسی ارشد حقوق جزا"));
  assert.ok(homepage.includes('knowsAbout: ["حقوق جزا", "حقوق کیفری", "دعاوی کیفری"]'));
});

test("keeps the co-authored research credit without exposing the other co-author as part of the attorney profile", () => {
  const publishedWorks = readFileSync(new URL("../../src/components/PublishedWorks.jsx", import.meta.url), "utf8");
  assert.ok(publishedWorks.includes('authors: "احمد موسوی و همکاران"'));
  assert.ok(!publishedWorks.includes("یونس نادمی"));
  assert.ok(!publishedWorks.includes("یوسف نادمی"));
  assert.ok(aboutPage.includes('title: "سوابق تحصیلی و حرفه‌ای سید احمد موسوی"'));
});
