import { readFile } from "node:fs/promises";
import { articles as publishedArticles } from "../../src/data/articles.js";
import { buildPublishedArticleRecords } from "../../src/lib/mavis/published-article-adapter.mjs";
import {
  isLiveAccessEvidenceComplete,
  isPrimaryVerificationComplete,
  isSourceRegistryReferenceConsistent,
} from "../../src/lib/mavis/legal-provenance-contract.mjs";

const bundle = JSON.parse(await readFile(new URL("../../public/mavis-offline/knowledge.json", import.meta.url), "utf8"));
const publishedBundle = JSON.parse(await readFile(new URL("../../public/mavis-offline/published-articles.json", import.meta.url), "utf8"));
const expectedPublishedRecords = buildPublishedArticleRecords(publishedArticles);
let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error("MAVIS bundle validation failed:", message);
};
const expectedTypes = { term: "terms", law: "laws", article: "articles", faq: "faqs", research_note: "research_notes" };
const ids = new Set();
const sourceRegistryById = new Map();
for (const source of bundle.source_registry) {
  if (!source.id || sourceRegistryById.has(source.id)) fail("Missing or duplicate source registry id: " + source.id);
  sourceRegistryById.set(source.id, source);
}

if (bundle.jurisdiction !== "IR" || bundle.language !== "fa-IR") fail("Unexpected jurisdiction or language.");
if (!Array.isArray(bundle.records) || bundle.records.length === 0) fail("Records array is empty.");

for (const [type, countKey] of Object.entries(expectedTypes)) {
  const actual = bundle.records.filter((record) => record.record_type === type).length;
  if (actual !== bundle.counts[countKey]) fail("Count mismatch for " + type + ": " + actual + " != " + bundle.counts[countKey]);
}

for (const record of bundle.records) {
  if (!record.id || ids.has(record.id)) fail("Missing or duplicate record id: " + record.id);
  ids.add(record.id);

  if (["term", "law", "article", "research_note"].includes(record.record_type)) {
    if (!record.provenance) {
      fail("Legal record lacks provenance metadata: " + record.id);
    } else if (record.review_status === "verified_primary_source") {
      if (!isPrimaryVerificationComplete(record, bundle.source_registry)) {
        fail("Primary verified label lacks complete primary-source evidence: " + record.id);
      }
    } else if (
      record.provenance.exact_primary_document_verified !== false ||
      record.provenance.current_validity_verified !== false
    ) {
      fail("Unreviewed legal record has unsafe verification flags: " + record.id);
    }
  }

  for (const source of record.sources || []) {
    if (!sourceRegistryById.has(source.source_id)) fail("Unknown source id " + source.source_id + " in " + record.id);
    if (!/^https:\/\//i.test(source.url || "")) fail("Non-HTTPS source URL in " + record.id);
    if (!isSourceRegistryReferenceConsistent(source, bundle.source_registry)) {
      fail("Source class or host does not match the canonical registry for " + record.id + ": " + source.source_id);
    }
  }

}

for (const source of bundle.source_registry) {
  if (!/^https:\/\//i.test(source.url || "")) fail("Non-HTTPS registry URL: " + source.id);
  if (!isLiveAccessEvidenceComplete(source)) fail("Live access status lacks a valid, scoped evidence record: " + source.id);
}

if (publishedBundle.source !== "src/data/articles.js") fail("Unexpected published article bundle source.");
if (!Array.isArray(publishedBundle.records) || publishedBundle.records.length !== expectedPublishedRecords.length) {
  fail("Published article bundle count does not match the canonical site article collection.");
} else {
  if (publishedBundle.counts?.published_articles !== expectedPublishedRecords.length) fail("Published article bundle count metadata mismatch.");
  const expectedById = new Map(expectedPublishedRecords.map((record) => [record.id, record]));
  const publishedIds = new Set();
  for (const record of publishedBundle.records) {
    const expected = expectedById.get(record.id);
    if (!expected || publishedIds.has(record.id) || ids.has(record.id)) fail("Unknown, duplicate or colliding published article id: " + record.id);
    publishedIds.add(record.id);
    if (record.record_type !== "published_article" || record.review_status !== "secondary_source_only" || record.source_verified !== false) {
      fail("Published article is not explicitly secondary-only: " + record.id);
    }
    if (record.access_class !== "public" || record.provenance?.source_file !== "src/data/articles.js") {
      fail("Published article access or provenance metadata is incomplete: " + record.id);
    }
    if (record.provenance?.exact_primary_document_verified !== false || record.provenance?.current_validity_verified !== false) {
      fail("Published article carries unsafe legal verification flags: " + record.id);
    }
    if (expected && (record.title !== expected.title || record.path !== expected.path || record.summary !== expected.summary)) {
      fail("Published article content does not match the canonical site record: " + record.id);
    }
    for (const source of record.sources || []) {
      let parsed;
      try { parsed = new URL(source.url); } catch { parsed = null; }
      if (!parsed || parsed.protocol !== "https:" || parsed.username || parsed.password) {
        fail("Unsafe published article source URL: " + record.id);
      }
      if (source.source_type !== "secondary" || source.verification_status !== "secondary_source_only") {
        fail("Published article citation was not kept secondary-only: " + record.id);
      }
    }
  }
  if (publishedIds.size !== expectedPublishedRecords.length) fail("One or more canonical published articles are missing from the offline bundle.");
}

if (bundle.counts.source_registry !== bundle.source_registry.length) fail("Source registry count mismatch.");
if (!bundle.provenance_policy?.required_for_primary_verification?.includes("content_sha256")) fail("Missing primary-source verification contract.");

if (failures > 0) process.exitCode = 1;
else console.log(JSON.stringify({
  records: bundle.records.length,
  ...bundle.counts,
  published_articles: publishedBundle.records.length,
  registryReviewDate: bundle.registry_review_date,
  primaryVerifiedRecords: bundle.records.filter((record) => record.review_status === "verified_primary_source").length,
  validationFailures: failures
}, null, 2));
