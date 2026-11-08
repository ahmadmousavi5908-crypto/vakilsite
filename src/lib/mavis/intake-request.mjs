import { createHmac } from "node:crypto";
import { isIP } from "node:net";

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
