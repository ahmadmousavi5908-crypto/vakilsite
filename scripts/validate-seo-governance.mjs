import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { seoKeywordLibrary } from "../src/data/seo-keyword-library.js";

const clusters = seoKeywordLibrary.clusters;
assert.ok(Array.isArray(clusters) && clusters.length > 0, "SEO keyword clusters must exist");
const ids = clusters.map((cluster) => cluster.id);
assert.equal(new Set(ids).size, ids.length, "SEO cluster IDs must be unique");

for (const cluster of clusters) {
  assert.ok(cluster.id && cluster.title, "Every cluster needs a stable ID and title");
  assert.ok(Array.isArray(cluster.fa), `Cluster ${cluster.id} must define Persian candidates`);
  assert.ok(cluster.fa.every((term) => typeof term === "string" && term.trim()), `Cluster ${cluster.id} contains an empty Persian term`);
  assert.ok(cluster.target === "محتوای آتی" || /^\/(?!\/)/.test(cluster.target), `Cluster ${cluster.id} has an unsafe or missing target`);
  if (cluster.intent === "research-only") assert.equal(cluster.target, "محتوای آتی", `Research-only cluster ${cluster.id} must not target a public URL`);
}

const observed = seoKeywordLibrary.methodology.gscObserved;
assert.ok(observed.property && observed.period, "GSC evidence must include property and period");
assert.ok(Array.isArray(observed.observedQueries), "GSC observations must be explicit records");
for (const row of observed.observedQueries) {
  assert.ok(row.query && row.classification, "Every observed query needs a query and classification");
  if (row.classification === "unrelated-entity-or-author-query") assert.match(row.note || "", /Do not count/i);
  if (row.classification === "service-intent-with-claim-risk") assert.equal(row.requiresComplianceReview, true);
}
assert.equal(seoKeywordLibrary.methodology.metrics.searchVolume, null);
assert.equal(seoKeywordLibrary.methodology.metrics.keywordDifficulty, null);
assert.equal(seoKeywordLibrary.methodology.metrics.cpc, null);
assert.ok(seoKeywordLibrary.methodology.rules.some((rule) => /One primary intent maps to one canonical URL/.test(rule)));
assert.ok(seoKeywordLibrary.methodology.rules.some((rule) => /Do not create city doorway pages/.test(rule)));

const operatingSystem = await readFile(new URL("../docs/seo/15-search-growth-operating-system.md", import.meta.url), "utf8");
for (const section of ["## 2. چرخه عمر کلیدواژه", "## 3. مدل امتیازدهی علمی-عملیاتی", "## 5. دروازه‌های انتشار (Release Gates)", "## 7. حلقه پایش و بازخورد", "## 8. مدیریت شکست و بازگشت"]) {
  assert.ok(operatingSystem.includes(section), `SEO operating system is missing: ${section}`);
}
console.log(`SEO governance passed: ${clusters.length} clusters, ${observed.observedQueries.length} GSC observations.`);
