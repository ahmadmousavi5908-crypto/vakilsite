import { createHmac } from "node:crypto";
import { isIP } from "node:net";


const IDEMPOTENCY_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidIntakeIdempotencyKey(value) {
  return typeof value === "string" && IDEMPOTENCY_KEY_PATTERN.test(value);
}

export function createIntakeIdempotencyFingerprint(value, secret, context) {
  if (!value || typeof value !== "object" || typeof secret !== "string" || secret.length < 32 ||
      !context || typeof context !== "object" ||
      !Array.isArray(context.detectedSignals) ||
      typeof context.reviewPriority !== "string" ||
      typeof context.requiresDeadlineCheck !== "boolean" ||
      typeof context.consentVersion !== "string" ||
      !Number.isInteger(context.retentionDays) || context.retentionDays < 1 || context.retentionDays > 3650) {
    return null;
  }

  const canonical = JSON.stringify({
    version: 1,
    fullName: value.fullName,
    phone: value.phone,
    caseType: value.caseType,
    summary: value.summary,
    urgency: value.urgency,
    opposingParty: value.opposingParty ?? null,
    consentPurpose: value.consentPurpose,
    marketingConsent: value.marketingConsent === true,
    thirdPartyDataNoticeAcknowledged: value.thirdPartyDataNoticeAcknowledged === true,
    reviewPriority: context.reviewPriority,
    detectedSignals: [...context.detectedSignals].sort(),
    requiresDeadlineCheck: context.requiresDeadlineCheck,
    consentVersion: context.consentVersion,
    retentionDays: context.retentionDays,
  });

  return createHmac("sha256", secret).update(canonical).digest("hex");
}

export function getTrustedClientIp(headers, trustProxyHeader) {
  if (trustProxyHeader !== true || !headers || typeof headers.get !== "function") return null;
  const value = headers.get("x-real-ip");
  if (typeof value !== "string") return null;
  const ip = value.trim();
  return isIP(ip) ? ip : null;
}

export function createIntakeRateLimitHash(ip, secret) {
  if (!getTrustedClientIp(new Headers({ "x-real-ip": ip }), true) ||
      typeof secret !== "string" || secret.length < 32) return null;
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function parseIntakeRateLimit(result) {
  if (result?.error || !Array.isArray(result?.data) || result.data.length !== 1) {
    return { status: "unavailable" };
  }

  const decision = result.data[0];
  if (typeof decision?.allowed !== "boolean" ||
      !Number.isInteger(decision.retry_after_seconds) ||
      decision.retry_after_seconds < 0 || decision.retry_after_seconds > 900) {
    return { status: "unavailable" };
  }

  if (decision.allowed) return { status: "allowed" };
  if (decision.retry_after_seconds < 1) return { status: "unavailable" };
  return { status: "limited", retryAfterSeconds: decision.retry_after_seconds };
}

export function parseIntakeRetentionDays(value) {
  if (typeof value !== "string" || !/^\d{1,4}$/.test(value)) return null;
  const days = Number(value);
  return Number.isInteger(days) && days >= 1 && days <= 3650 ? days : null;
}

export function hasOnlyAllowedIntakeFields(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const allowed = new Set([
    "fullName",
    "phone",
    "caseType",
    "summary",
    "urgency",
    "opposingParty",
    "consent",
    "marketingConsent",
    "thirdPartyDataNoticeAcknowledged",
  ]);
  return Object.keys(payload).every((key) => allowed.has(key));
}
