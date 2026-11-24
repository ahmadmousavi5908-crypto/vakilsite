import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { HTML_LIMITED_BOT_USER_AGENT } from "../../src/lib/seo/html-limited-bots.mjs";

const llms = readFileSync(new URL("../../public/llms.txt", import.meta.url), "utf8");
const robots = readFileSync(new URL("../../src/app/robots.js", import.meta.url), "utf8");
const home = readFileSync(new URL("../../src/app/page.js", import.meta.url), "utf8");

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
