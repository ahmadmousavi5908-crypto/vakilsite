import assert from "node:assert/strict";
import test from "node:test";
import { getRelatedPracticeAreaForArticle } from "../../src/lib/seo/article-related-practice-area.mjs";

test("maps published articles to one relevant canonical service page", () => {
  const expected = {
    "unified-judicial-precedent-874-electronic-monitoring-before-prison": "/services/criminal-law",
    "criminal-court-authority-restitution-real-estate-third-party-deed-annulment": "/services/criminal-law",
    "civil-claim-checklist": "/services/legal-consultation",
    "criminal-investigation-lawyer": "/services/criminal-law",
    "contract-before-signing": "/services/contracts-and-obligations",
    "family-dispute-first-steps": "/services/family-law",
    "check-and-promissory-note-claim": "/services/claims-and-enforcement",
    "mahrieh-and-family-financial-claims": "/services/family-law",
    "appeal-against-court-judgment": "/services/legal-consultation",
    "civil-judgment-enforcement": "/services/claims-and-enforcement",
    "property-dispute-documents": "/services/property-law",
    "fraud-and-breach-of-trust-complaint": "/services/criminal-law",
  };

  for (const [slug, href] of Object.entries(expected)) {
    assert.equal(getRelatedPracticeAreaForArticle(slug)?.href, href, slug);
    assert.ok(getRelatedPracticeAreaForArticle(slug)?.label, slug);
  }
});

test("does not invent a service link for unknown article slugs", () => {
  assert.equal(getRelatedPracticeAreaForArticle("unmapped-article"), null);
  assert.equal(getRelatedPracticeAreaForArticle(null), null);
  assert.equal(getRelatedPracticeAreaForArticle(undefined), null);
});
