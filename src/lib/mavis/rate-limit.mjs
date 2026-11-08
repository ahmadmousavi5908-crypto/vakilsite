function parseRateLimit(result) {
  if (!result || result.error) return { status: "unavailable" };

  const rows = Array.isArray(result.data)
    ? result.data
    : result.data && typeof result.data === "object"
      ? [result.data]
      : [];

  if (rows.length !== 1) return { status: "unavailable" };

  const row = rows[0];
  const retryAfter = row?.retry_after_seconds;

  if (
    typeof row?.allowed !== "boolean" ||
    !Number.isInteger(retryAfter) ||
    retryAfter < 0 ||
    retryAfter > 60
  ) {
    return { status: "unavailable" };
  }

  return row.allowed
    ? { status: "allowed" }
    : { status: "limited", retryAfterSeconds: Math.max(1, retryAfter) };
}

export function parseKnowledgeSearchRateLimit(result) {
  return parseRateLimit(result);
}

export function parseAdminIntakeRateLimit(result) {
  return parseRateLimit(result);
}
