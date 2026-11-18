import test from "node:test";
import assert from "node:assert/strict";
import {
  getKeywordLibraryClusters,
  getKeywordLibrarySnapshot,
  normalizeKeywordQuery,
  searchKeywordLibrary
} from "../../src/lib/mavis/keyword-library.mjs";

test("exposes the complete cluster inventory and separate phrase families", () => {
  const snapshot = getKeywordLibrarySnapshot();
  assert.equal(snapshot.clusterCount, 22);
  assert.ok(snapshot.lawyerPhraseCount >= 600);
  assert.ok(snapshot.basePhraseCount > 300);
  assert.ok(snapshot.problemPhraseCount > 100);
  assert.ok(snapshot.englishPhraseCount > 100);
  assert.equal(getKeywordLibraryClusters().length, 22);
});

test("normalizes Persian and Arabic character variants", () => {
  assert.equal(normalizeKeywordQuery("ي ك نیم‌فاصله"), "ی ک نیم فاصله");
});

test("keeps lawyer-intent phrases separate from derived base phrases", () => {
  const lawyer = searchKeywordLibrary({ clusterId: "registration-land", family: "lawyer" });
  const base = searchKeywordLibrary({ clusterId: "registration-land", family: "base" });
  assert.ok(lawyer.some((entry) => entry.term === "وکیل دعاوی ثبتی"));
  assert.ok(base.some((entry) => entry.term === "دعاوی ثبتی"));
  assert.ok(base.every((entry) => !entry.term.startsWith("وکیل ")));
});

test("generates problem-oriented research prompts without claiming search-volume evidence", () => {
  const prompts = searchKeywordLibrary({ clusterId: "criminal-life-and-body", family: "problem" });
  assert.ok(prompts.some((entry) => entry.term === "شرایط قانونی قتل عمد چیست؟"));
  assert.ok(prompts.every((entry) => entry.origin === "generated-template"));
});

test("filters by cluster and normalized query", () => {
  const results = searchKeywordLibrary({ query: "ابطال سند", clusterId: "registration-land", family: "all" });
  assert.ok(results.length > 0);
  assert.ok(results.every((entry) => entry.clusterId === "registration-land"));
});

test("keeps English candidates separate from Persian phrase families", () => {
  const results = searchKeywordLibrary({ language: "en", clusterId: "inheritance-estate" });
  assert.ok(results.length > 0);
  assert.ok(results.every((entry) => entry.family === "english" && /Iran/i.test(entry.term)));
});
