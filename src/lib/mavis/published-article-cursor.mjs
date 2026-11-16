const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

function isValidTimestamp(value) {
  return typeof value === "string"
    && TIMESTAMP_PATTERN.test(value)
    && !Number.isNaN(new Date(value).getTime());
}

export function encodePublishedArticleCursor(row) {
  if (!row || !isValidTimestamp(row.published_at) || !UUID_PATTERN.test(row.id || "")) return null;
  return Buffer.from(JSON.stringify({
    publishedAt: row.published_at,
    id: row.id.toLowerCase(),
  }), "utf8").toString("base64url");
}

export function decodePublishedArticleCursor(value) {
  if (typeof value !== "string" || value.length < 20 || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (!isValidTimestamp(parsed.publishedAt) || typeof parsed.id !== "string" || !UUID_PATTERN.test(parsed.id)) return null;
    return { publishedAt: parsed.publishedAt, id: parsed.id.toLowerCase() };
  } catch {
    return null;
  }
}
