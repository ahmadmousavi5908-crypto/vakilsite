const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function encodeMavisArticleCursor(row) {
  if (!row || typeof row.updated_at !== "string" || !UUID_PATTERN.test(row.id || "")) return null;
  const timestamp = new Date(row.updated_at);
  if (Number.isNaN(timestamp.getTime())) return null;
  const payload = JSON.stringify({ updatedAt: timestamp.toISOString(), id: row.id.toLowerCase() });
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function decodeMavisArticleCursor(value) {
  if (typeof value !== "string" || value.length < 20 || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (typeof parsed.updatedAt !== "string" || typeof parsed.id !== "string" || !UUID_PATTERN.test(parsed.id)) return null;
    const timestamp = new Date(parsed.updatedAt);
    if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== parsed.updatedAt) return null;
    return { updatedAt: parsed.updatedAt, id: parsed.id.toLowerCase() };
  } catch {
    return null;
  }
}
