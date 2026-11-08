const STATUSES = new Set([
  "pending_human_review",
  "in_review",
  "closed",
  "retention_hold",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAdminIntakeListParams(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  const statuses = parsed.searchParams.getAll("status");
  const limits = parsed.searchParams.getAll("limit");
  const offsets = parsed.searchParams.getAll("offset");
  if (statuses.length > 1 || limits.length > 1 || offsets.length > 1) {
    return { ok: false, reason: "duplicate_parameter" };
  }

  const status = statuses[0] || null;
  const limit = limits[0] === undefined ? 50 : Number(limits[0]);
  const offset = offsets[0] === undefined ? 0 : Number(offsets[0]);

  if (status !== null && !STATUSES.has(status)) return { ok: false, reason: "invalid_status" };
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
      !Number.isInteger(offset) || offset < 0 || offset > 10000) {
    return { ok: false, reason: "invalid_pagination" };
  }

  return { ok: true, value: { status, limit, offset } };
}

export function parseAdminIntakeStatusUpdate(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "invalid_payload" };
  }
  const keys = Object.keys(payload);
  if (keys.length !== 2 || !keys.includes("submissionId") || !keys.includes("status")) {
    return { ok: false, reason: "invalid_fields" };
  }
  if (typeof payload.submissionId !== "string" || !UUID_PATTERN.test(payload.submissionId)) {
    return { ok: false, reason: "invalid_submission_id" };
  }
  if (typeof payload.status !== "string" || !STATUSES.has(payload.status)) {
    return { ok: false, reason: "invalid_status" };
  }
  return { ok: true, value: { submissionId: payload.submissionId, status: payload.status } };
}

export function parseAdminIntakeListResult(result) {
  if (result?.error || !Array.isArray(result?.data)) return { status: "unavailable" };
  const items = result.data;
  for (const item of items) {
    if (!item || typeof item !== "object" ||
        typeof item.id !== "string" || !UUID_PATTERN.test(item.id) ||
        typeof item.tracking_code !== "string" || !/^[0-9a-f]{32}$/.test(item.tracking_code) ||
        typeof item.full_name !== "string" || typeof item.phone !== "string" ||
        typeof item.summary !== "string" || !STATUSES.has(item.status)) {
      return { status: "unavailable" };
    }
  }
  return { status: "ok", items };
}

export function parseAdminIntakeUpdateResult(result) {
  if (result?.error || typeof result?.data !== "boolean") return { status: "unavailable" };
  return result.data ? { status: "updated" } : { status: "not_found" };
}
