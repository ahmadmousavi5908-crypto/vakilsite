const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{6,20}$/;
const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com"]);

export function getGoogleAnalyticsMeasurementId(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  return MEASUREMENT_ID_PATTERN.test(candidate) ? candidate : null;
}

export function getLeadMethodFromHref(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
  let url;
  try { url = new URL(value.trim(), "https://vakilahmadmousavi.ir"); } catch { return null; }
  if (url.protocol === "tel:") return "phone";
  if (url.protocol === "mailto:") return "email";
  if (url.protocol === "whatsapp:") return "whatsapp";
  if (url.protocol === "https:" && WHATSAPP_HOSTS.has(url.hostname.toLowerCase())) return "whatsapp";
  return null;
}