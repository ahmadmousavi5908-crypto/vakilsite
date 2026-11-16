const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

function isValidTimestamp(value) {
  return typeof value === "string"
    && TIMESTAMP_PATTERN.test(value)
    && !Number.isNaN(new Date(value).getTime());
}

export function encodeMavisArticleCursor(row, ordinal = 0) {
  if (!row || !isValidTimestamp(row.updated_at) || !UUID_PATTERN.test(row.id || "")) return null;
  const safeOrdinal = Number.isSafeInteger(ordinal) && ordinal >= 0 ? ordinal : 0;
  const payload = JSON.stringify({ updatedAt: row.updated_at, id: row.id.toLowerCase(), ordinal: safeOrdinal });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeMavisArticleCursor(value) {
  if (typeof value !== "string" || value.length < 20 || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (!isValidTimestamp(parsed.updatedAt) || typeof parsed.id !== "string" || !UUID_PATTERN.test(parsed.id)) return null;
    const ordinal = Number.isSafeInteger(parsed.ordinal) && parsed.ordinal >= 0 ? parsed.ordinal : 0;
    return { updatedAt: parsed.updatedAt, id: parsed.id.toLowerCase(), ordinal };
  } catch {
    return null;
  }
}
