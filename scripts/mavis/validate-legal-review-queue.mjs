import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const LEGAL_QUEUE_HEADERS = [
  "record_id",
  "record_type",
  "title",
  "review_status",
  "source_ids",
  "primary_document_retrieved",
  "primary_document_identifier",
  "issuing_authority",
  "approved_at",
  "notified_at",
  "published_at",
  "effective_from",
  "effective_until",
  "amendment_chain_reviewed",
  "retrieved_at",
  "content_sha256",
  "reviewer_id",
  "reviewed_at",
  "next_action",
];

const ALLOWED_RECORD_TYPES = new Set(["term", "law", "article", "research_note"]);
const ALLOWED_REVIEW_STATUSES = new Set([
  "needs_legal_review",
  "secondary_source_only",
  "verified_primary_source",
]);
const BOOLEAN_COLUMNS = new Set(["primary_document_retrieved", "amendment_chain_reviewed"]);
const DATE_COLUMNS = new Set(["approved_at", "notified_at", "published_at", "effective_from", "effective_until"]);
const DATETIME_COLUMNS = new Set(["retrieved_at", "reviewed_at"]);

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidDateTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

export function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let afterQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inQuotes) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
        afterQuote = true;
      } else {
        field += character;
      }
      continue;
    }

    if (afterQuote && character !== "," && character !== "\n" && character !== "\r") {
      throw new Error("Unexpected character after a quoted CSV field.");
    }

    if (character === '"') {
      if (field.length !== 0 || afterQuote) {
        throw new Error("Unexpected quote inside an unquoted CSV field.");
      }
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
      afterQuote = false;
    } else if (character === "\n") {
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
      afterQuote = false;
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (inQuotes) throw new Error("Unterminated quoted CSV field.");

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
  }

  return rows;
}

export function validateLegalReviewQueue(source, options = {}) {
  const errors = [];
  let rows;

  try {
    rows = parseCsv(source);
  } catch (error) {
    return { errors: [error.message], recordCount: 0, statusCounts: {} };
  }

  if (rows.length === 0) {
    return { errors: ["Legal review queue is empty."], recordCount: 0, statusCounts: {} };
  }

  const headers = rows[0];
  if (headers.length !== LEGAL_QUEUE_HEADERS.length ||
      headers.some((header, index) => header !== LEGAL_QUEUE_HEADERS[index])) {
    return {
      errors: ["Legal review queue header does not match the required 19-column contract."],
      recordCount: Math.max(0, rows.length - 1),
      statusCounts: {},
    };
  }

  const records = rows.slice(1);
  const ids = new Set();
  const statusCounts = {};
  const knownSourceIds = options.knownSourceIds ? new Set(options.knownSourceIds) : null;
  const primarySourceIds = options.primarySourceIds ? new Set(options.primarySourceIds) : null;

  records.forEach((values, index) => {
    const line = index + 2;
    if (values.length !== LEGAL_QUEUE_HEADERS.length) {
      errors.push(`Row ${line} has ${values.length} columns; expected ${LEGAL_QUEUE_HEADERS.length}.`);
      return;
    }

    const record = Object.fromEntries(LEGAL_QUEUE_HEADERS.map((header, column) => [header, values[column].trim()]));
    if (!record.record_id) errors.push(`Row ${line} has no record_id.`);
    else if (ids.has(record.record_id)) errors.push(`Duplicate record_id: ${record.record_id}.`);
    ids.add(record.record_id);

    if (!ALLOWED_RECORD_TYPES.has(record.record_type)) {
      errors.push(`Row ${line} has unsupported record_type: ${record.record_type}.`);
    }
    if (!record.title) errors.push(`Row ${line} has no title.`);
    if (!ALLOWED_REVIEW_STATUSES.has(record.review_status)) {
      errors.push(`Row ${line} has unsupported review_status: ${record.review_status}.`);
    }
    if (!record.next_action) errors.push(`Row ${line} has no next_action.`);

    for (const column of BOOLEAN_COLUMNS) {
      if (record[column] !== "true" && record[column] !== "false") {
        errors.push(`Row ${line} has invalid boolean value for ${column}.`);
      }
    }
    for (const column of DATE_COLUMNS) {
      if (record[column] && !isValidDate(record[column])) {
        errors.push(`Row ${line} has invalid calendar date for ${column}.`);
      }
    }
    for (const column of DATETIME_COLUMNS) {
      if (record[column] && !isValidDateTime(record[column])) {
        errors.push(`Row ${line} has invalid ISO date-time for ${column}.`);
      }
    }
    if (record.effective_from && record.effective_until &&
        isValidDate(record.effective_from) && isValidDate(record.effective_until) &&
        record.effective_until < record.effective_from) {
      errors.push(`Row ${line} has effective_until earlier than effective_from.`);
    }

    const sourceIds = record.source_ids ? record.source_ids.split(";").map((value) => value.trim()).filter(Boolean) : [];
    if (sourceIds.length !== new Set(sourceIds).size) {
      errors.push(`Row ${line} contains duplicate source_ids.`);
    }
    if (knownSourceIds) {
      for (const sourceId of sourceIds) {
        if (!knownSourceIds.has(sourceId)) errors.push(`Row ${line} references unknown source_id: ${sourceId}.`);
      }
    }

    if (record.primary_document_retrieved === "true") {
      for (const fieldName of ["primary_document_identifier", "issuing_authority", "retrieved_at", "content_sha256"]) {
        if (!record[fieldName]) errors.push(`Row ${line} is missing ${fieldName} for a retrieved primary document.`);
      }
      if (record.content_sha256 && !/^[a-f0-9]{64}$/i.test(record.content_sha256)) {
        errors.push(`Row ${line} has an invalid SHA-256 digest.`);
      }
    }

    if (record.amendment_chain_reviewed === "true" && record.primary_document_retrieved !== "true") {
      errors.push(`Row ${line} cannot claim amendment review before retrieving the primary document.`);
    }

    if (record.review_status === "verified_primary_source") {
      const required = [
        "primary_document_identifier",
        "issuing_authority",
        "retrieved_at",
        "content_sha256",
        "reviewer_id",
        "reviewed_at",
      ];
      if (record.primary_document_retrieved !== "true") {
        errors.push(`Row ${line} is marked verified without a retrieved primary document.`);
      }
      for (const fieldName of required) {
        if (!record[fieldName]) errors.push(`Row ${line} is marked verified but lacks ${fieldName}.`);
      }
      if (record.amendment_chain_reviewed !== "true") {
        errors.push(`Row ${line} is marked verified without amendment/repeal review.`);
      }
      if (!["approved_at", "notified_at", "published_at", "effective_from"].some((fieldName) => record[fieldName])) {
        errors.push(`Row ${line} is marked verified without any instrument date.`);
      }
      if (sourceIds.length === 0) errors.push(`Row ${line} is marked verified without a linked source.`);
      if (primarySourceIds && !sourceIds.some((sourceId) => primarySourceIds.has(sourceId))) {
        errors.push(`Row ${line} is marked verified without an official primary-publication source.`);
      }
      if (record.content_sha256 && !/^[a-f0-9]{64}$/i.test(record.content_sha256)) {
        errors.push(`Row ${line} has an invalid SHA-256 digest.`);
      }
    }

    statusCounts[record.review_status] = (statusCounts[record.review_status] || 0) + 1;
  });

  if (options.expectedRecordIds) {
    const expected = new Set(options.expectedRecordIds);
    for (const id of expected) if (!ids.has(id)) errors.push(`Queue is missing canonical legal record: ${id}.`);
    for (const id of ids) if (!expected.has(id)) errors.push(`Queue contains unknown canonical record: ${id}.`);
  }

  return { errors, recordCount: records.length, statusCounts };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const queueUrl = new URL("../../docs/mavis/legal-source-review-queue-2026-11-08.csv", import.meta.url);
  const bundleUrl = new URL("../../public/mavis-offline/knowledge.json", import.meta.url);
  const queue = readFileSync(queueUrl, "utf8");
  const bundle = JSON.parse(readFileSync(bundleUrl, "utf8"));
  const expectedRecordIds = bundle.records
    .filter((record) => ALLOWED_RECORD_TYPES.has(record.record_type))
    .map((record) => record.id);
  const result = validateLegalReviewQueue(queue, {
    knownSourceIds: bundle.source_registry.map((source) => source.id),
    primarySourceIds: bundle.source_registry
      .filter((source) => source.class === "primary_publication")
      .map((source) => source.id),
    expectedRecordIds,
  });
  
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error("MAVIS legal review queue:", error);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({
      recordCount: result.recordCount,
      statusCounts: result.statusCounts,
      canonicalRecordCoverage: expectedRecordIds.length,
      validationErrors: result.errors.length,
    }, null, 2));
  }
  
}
