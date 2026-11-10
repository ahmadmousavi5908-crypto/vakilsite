import { readFile } from "node:fs/promises";

const bundle = JSON.parse(await readFile(new URL("../../public/mavis-offline/knowledge.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(new URL("../../src/data/legal-library/MANIFEST.json", import.meta.url), "utf8"));
let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error("MAVIS bundle validation failed:", message);
};
const expectedTypes = { term: "terms", law: "laws", article: "articles", faq: "faqs", research_note: "research_notes" };
const ids = new Set();
const sourceIds = new Set(bundle.source_registry.map((source) => source.id));

if (bundle.jurisdiction !== "IR" || bundle.language !== "fa-IR") fail("Unexpected jurisdiction or language.");
if (bundle.library_version !== manifest.version) fail("Offline bundle library version does not match the canonical legal-library manifest.");
if (!Array.isArray(bundle.records) || bundle.records.length === 0) fail("Records array is empty.");

for (const [type, countKey] of Object.entries(expectedTypes)) {
  const actual = bundle.records.filter((record) => record.record_type === type).length;
  if (actual !== bundle.counts[countKey]) fail("Count mismatch for " + type + ": " + actual + " != " + bundle.counts[countKey]);
}

for (const record of bundle.records) {
  if (!record.id || ids.has(record.id)) fail("Missing or duplicate record id: " + record.id);
  ids.add(record.id);

  if (["term", "law", "article", "research_note"].includes(record.record_type)) {
    if (!record.provenance || record.provenance.exact_primary_document_verified !== false || record.provenance.current_validity_verified !== false) {
      fail("Legal record lacks conservative provenance flags: " + record.id);
    }
  }

  for (const source of record.sources || []) {
    if (!sourceIds.has(source.source_id)) fail("Unknown source id " + source.source_id + " in " + record.id);
    if (!/^https:\/\//i.test(source.url || "")) fail("Non-HTTPS source URL in " + record.id);
  }

  if (record.review_status === "verified_primary_source" && !(record.sources || []).some((source) => source.verification_status === "verified_primary_source")) {
    fail("Primary verified label has no verified primary source: " + record.id);
  }
}

for (const source of bundle.source_registry) {
  if (!/^https:\/\//i.test(source.url || "")) fail("Non-HTTPS registry URL: " + source.id);
  if (source.live_access_checked !== false) fail("Live access state must remain explicit: " + source.id);
}

if (bundle.counts.source_registry !== bundle.source_registry.length) fail("Source registry count mismatch.");
if (!bundle.provenance_policy?.required_for_primary_verification?.includes("content_sha256")) fail("Missing primary-source verification contract.");

if (failures > 0) process.exitCode = 1;
else console.log(JSON.stringify({
  records: bundle.records.length,
  ...bundle.counts,
  registryReviewDate: bundle.registry_review_date,
  primaryVerifiedRecords: bundle.records.filter((record) => record.review_status === "verified_primary_source").length,
  validationFailures: failures
}, null, 2));
