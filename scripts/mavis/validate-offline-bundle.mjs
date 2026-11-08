import { readFile } from "node:fs/promises";

const bundle = JSON.parse(await readFile(new URL("../../public/mavis-offline/knowledge.json", import.meta.url), "utf8"));
let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error("MAVIS bundle validation failed:", message);
};
const expectedTypes = { term: "terms", law: "laws", article: "articles", faq: "faqs", research_note: "research_notes" };
const legalTypes = new Set(["term", "law", "article", "research_note"]);
const records = Array.isArray(bundle.records) ? bundle.records : [];
const sourceRegistry = Array.isArray(bundle.source_registry) ? bundle.source_registry : [];
const ids = new Set();
const sourceIds = new Set(sourceRegistry.map((source) => source.id));

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

if (bundle.jurisdiction !== "IR" || bundle.language !== "fa-IR") fail("Unexpected jurisdiction or language.");
if (!Array.isArray(bundle.records) || bundle.records.length === 0) fail("Records array is empty.");
if (!Array.isArray(bundle.source_registry)) fail("Source registry must be an array.");

for (const [type, countKey] of Object.entries(expectedTypes)) {
  const actual = records.filter((record) => record.record_type === type).length;
  if (actual !== bundle.counts[countKey]) fail("Count mismatch for " + type + ": " + actual + " != " + bundle.counts[countKey]);
}

for (const record of records) {
  if (!record.id || ids.has(record.id)) fail("Missing or duplicate record id: " + record.id);
  ids.add(record.id);

  if (legalTypes.has(record.record_type)) {
    const provenance = record.provenance;
    if (!provenance
      || typeof provenance.exact_primary_document_verified !== "boolean"
      || typeof provenance.current_validity_verified !== "boolean") {
      fail("Legal record lacks explicit provenance flags: " + record.id);
    }
    if (provenance?.current_validity_verified === true
      && (provenance.exact_primary_document_verified !== true || !isValidDate(provenance.last_primary_source_check))) {
      fail("Current-validity verification lacks exact primary review or a valid review date: " + record.id);
    }
  }

  if (record.sources !== undefined && !Array.isArray(record.sources)) {
    fail("Record sources must be an array: " + record.id);
  }
  for (const source of Array.isArray(record.sources) ? record.sources : []) {
    if (!sourceIds.has(source.source_id)) fail("Unknown source id " + source.source_id + " in " + record.id);
    if (!/^https:\/\//i.test(source.url || "")) fail("Non-HTTPS source URL in " + record.id);
  }

  if (record.review_status === "verified_primary_source"
    && (record.provenance?.exact_primary_document_verified !== true
      || !Array.isArray(record.sources)
      || !record.sources.some((source) => source.verification_status === "verified_primary_source"))) {
    fail("Primary verified label lacks explicit primary-document provenance: " + record.id);
  }
}

for (const source of sourceRegistry) {
  if (!/^https:\/\//i.test(source.url || "")) fail("Non-HTTPS registry URL: " + source.id);
  if (typeof source.live_access_checked !== "boolean") fail("Live access state must be an explicit boolean: " + source.id);
}

if (bundle.counts.source_registry !== sourceRegistry.length) fail("Source registry count mismatch.");
if (!bundle.provenance_policy?.required_for_primary_verification?.includes("content_sha256")) fail("Missing primary-source verification contract.");

const legalRecords = records.filter((record) => legalTypes.has(record.record_type));
const recordsWithSources = legalRecords.filter((record) => Array.isArray(record.sources) && record.sources.length > 0);
const sourceCoverage = {
  legalRecords: legalRecords.length,
  recordsWithSources: recordsWithSources.length,
  recordsWithoutSources: legalRecords.length - recordsWithSources.length,
  attachedSourceLinks: legalRecords.reduce((total, record) => total + (Array.isArray(record.sources) ? record.sources.length : 0), 0),
  primaryVerifiedRecords: legalRecords.filter((record) => record.review_status === "verified_primary_source").length,
  currentValidityVerifiedRecords: legalRecords.filter((record) => record.provenance?.current_validity_verified === true).length
};

if (failures > 0) process.exitCode = 1;
else console.log(JSON.stringify({
  records: records.length,
  ...bundle.counts,
  registryReviewDate: bundle.registry_review_date,
  sourceCoverage,
  validationFailures: failures
}, null, 2));
