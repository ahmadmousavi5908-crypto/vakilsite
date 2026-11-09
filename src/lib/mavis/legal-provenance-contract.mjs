const REQUIRED_FIELDS = [
  "exact_document_url",
  "issuing_authority",
  "instrument_or_decision_number",
  "publication_reference",
  "publication_date",
  "effective_date_or_explicitly_unknown",
  "amendment_and_repeal_review",
  "retrieved_at",
  "content_sha256",
  "human_reviewer",
  "reviewed_at"
];

const PRIMARY_SOURCE_CLASSES = new Set([
  "primary_publication",
  "official_law_portal",
  "official_judicial_decisions_portal",
  "official_issuing_authority"
]);

const hasText = (value) => typeof value === "string" && value.trim().length > 0;

function isValidCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidTimestamp(value) {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value));
}

function normalizedHost(value) {
  if (!hasText(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) return null;
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Ensures a record-level source cannot claim a different source class or host
 * than the canonical source registry entry it references.
 */
export function isSourceRegistryReferenceConsistent(source, sourceRegistry) {
  if (!source || !Array.isArray(sourceRegistry)) return false;
  const entry = sourceRegistry.find((candidate) => candidate?.id === source.source_id);
  if (!entry || source.source_class !== entry.class) return false;

  const sourceHost = normalizedHost(source.url);
  const registryHost = normalizedHost(entry.url);
  if (!sourceHost || !registryHost) return false;

  return sourceHost === registryHost || sourceHost.endsWith(`.${registryHost}`);
}

export function isLiveAccessEvidenceComplete(source) {
  if (!source || source.live_access_checked === false) return !source?.access_check;
  if (source.live_access_checked !== true) return false;

  const evidence = source.access_check;
  return Boolean(
    evidence &&
    evidence.result === "reachable" &&
    evidence.scope === "landing_page_only" &&
    isValidCalendarDate(evidence.checked_on) &&
    evidence.evidence_url === source.url &&
    hasText(evidence.notes) &&
    /^https:\/\//i.test(evidence.evidence_url)
  );
}

export function isPrimaryVerificationComplete(record, sourceRegistry) {
  if (!record || record.review_status !== "verified_primary_source") return false;

  const provenance = record.provenance;
  if (
    !provenance ||
    provenance.exact_primary_document_verified !== true ||
    provenance.current_validity_verified !== true
  ) return false;

  if (!REQUIRED_FIELDS.every((field) => hasText(provenance[field]))) return false;
  if (!/^https:\/\//i.test(provenance.exact_document_url)) return false;
  if (!isValidCalendarDate(provenance.publication_date)) return false;
  if (!isValidTimestamp(provenance.retrieved_at) || !isValidTimestamp(provenance.reviewed_at)) return false;
  if (!/^[a-f0-9]{64}$/i.test(provenance.content_sha256)) return false;

  return (record.sources || []).some((source) =>
    source.verification_status === "verified_primary_source" &&
    PRIMARY_SOURCE_CLASSES.has(source.source_class) &&
    source.url === provenance.exact_document_url &&
    isSourceRegistryReferenceConsistent(source, sourceRegistry)
  );
}
