import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { HTML_LIMITED_BOT_USER_AGENT } from "../../src/lib/seo/html-limited-bots.mjs";
import { articles } from "../../src/data/articles.js";
import { getArticleSearchMetadata } from "../../src/lib/mavis/article-search-metadata.mjs";
import { mapPublishedEditorialRecord } from "../../src/lib/mavis/editorial-content-core.mjs";
import { buildFaqPageSchema, buildPracticeAreaServiceSchema } from "../../src/lib/seo/structured-content-schema.mjs";

const llms = readFileSync(new URL("../../public/llms.txt", import.meta.url), "utf8");
const robots = readFileSync(new URL("../../src/app/robots.js", import.meta.url), "utf8");
const home = readFileSync(new URL("../../src/app/page.js", import.meta.url), "utf8");

test("provides non-empty title and description for every legacy article", () => {
  assert.ok(articles.length >= 10);
  for (const article of articles) {
    const metadata = getArticleSearchMetadata(article);
    assert.ok(metadata.title.trim(), `Missing title for ${article.slug}`);
    assert.ok(metadata.description.trim(), `Missing description for ${article.slug}`);
  }
});

test("preserves CMS SEO metadata when mapping a published immutable snapshot", () => {
  const article = mapPublishedEditorialRecord({
    status: "published",
    slug: "cms-article",
    published_at: "2026-11-25T00:00:00.000Z",
    is_indexable: true,
    published_content: {
      title: "عنوان مقاله",
      seo_title: "عنوان جست‌وجوی مقاله",
      seo_description: "توضیحات مستقل و دقیق مقاله برای نتایج جست‌وجو.",
      excerpt: "خلاصه مقاله",
      intro: "مقدمه مقاله",
      sections: [],
      checklist: [],
      sources: [],
    },
  });
  const metadata = getArticleSearchMetadata(article);
  assert.equal(metadata.title, "عنوان جست‌وجوی مقاله");
  assert.equal(metadata.description, "توضیحات مستقل و دقیق مقاله برای نتایج جست‌وجو.");
});

test("keeps Next.js 16.4.6 built-in HTML-limited bot coverage", () => {
  for (const agent of [
    "Googlebot",
    "Google-InspectionTool",
    "AdsBot-Google",
    "Bingbot",
    "Chrome-Lighthouse",
    "Twitterbot",
    "facebookexternalhit",
    "Slackbot",
  ]) assert.match(agent, HTML_LIMITED_BOT_USER_AGENT);
});

test("resolves metadata in the initial HTML for allowed AI search crawlers and generic audit crawlers", () => {
  for (const agent of [
    "OAI-SearchBot",
    "Claude-SearchBot",
    "PerplexityBot",
    "ChatGPT-User",
    "Claude-User",
    "Perplexity-User",
    "ExampleCrawler/1.0",
    "ExampleBot/1.0",
  ]) assert.match(agent, HTML_LIMITED_BOT_USER_AGENT);
});

test("keeps model-training crawlers blocked and private paths disallowed", () => {
  assert.match(robots, /\["GPTBot",\s*"ClaudeBot",\s*"Google-Extended"\]/);
  assert.match(robots, /privatePaths\s*=\s*\["\/admin",\s*"\/api"\]/);
});

test("describes only public, canonical site resources in llms.txt", () => {
  for (const path of [
    "https://vakilahmadmousavi.ir/",
    "https://vakilahmadmousavi.ir/about",
    "https://vakilahmadmousavi.ir/services",
    "https://vakilahmadmousavi.ir/locations/khuzestan",
    "https://vakilahmadmousavi.ir/sitemap.xml",
  ]) assert.ok(llms.includes(path), `Missing ${path}`);
  assert.doesNotMatch(llms, /\/admin|\/api\/|supabase\.co|\+989\d{10}/i);
  assert.match(llms, /نشانی خیابانی دفتر عمداً/);
});

test("uses a non-local Service schema when no public street address is provided", () => {
  assert.match(home, /"@type": "Service"/);
  assert.doesNotMatch(home, /"@type": "LegalService"|"@type": "LocalBusiness"/);
});

test("builds a page-specific Service entity without inventing a public office address", () => {
  const schema = buildPracticeAreaServiceSchema("https://vakilahmadmousavi.ir", {
    slug: "property-law",
    title: "دعاوی ملکی و ثبتی",
    description: "بررسی اختلافات مالکیت و اسناد ملکی در اهواز و خوزستان.",
  });

  assert.equal(schema["@type"], "Service");
  assert.equal(schema.url, "https://vakilahmadmousavi.ir/services/property-law");
  assert.equal(schema.provider["@id"], "https://vakilahmadmousavi.ir/#attorney");
  assert.deepEqual(schema.areaServed.map((area) => area.name), ["اهواز", "استان خوزستان"]);
  assert.equal("address" in schema, false);
  assert.equal("geo" in schema, false);
  assert.equal(buildPracticeAreaServiceSchema("not-a-url", {}), null);
});

test("FAQPage schema mirrors visible array and object FAQs and rejects empty data", () => {
  const schema = buildFaqPageSchema("https://vakilahmadmousavi.ir/", [
    ["پرسش نخست؟", "پاسخ نخست."],
    { question: "پرسش دوم؟", answer: "پاسخ دوم." },
    { question: "", answer: "پاسخ نامعتبر." },
  ]);

  assert.equal(schema["@type"], "FAQPage");
  assert.equal(schema.mainEntity.length, 2);
  assert.equal(schema.mainEntity[0].acceptedAnswer.text, "پاسخ نخست.");
  assert.equal(schema.mainEntity[1].name, "پرسش دوم؟");
  assert.equal(buildFaqPageSchema("https://vakilahmadmousavi.ir/", []), null);
  assert.equal(buildFaqPageSchema("not-a-url", [["پرسش؟", "پاسخ"]]), null);
});
