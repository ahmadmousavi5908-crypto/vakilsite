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
export const PRODUCTION_ANALYTICS_HOSTS = Object.freeze([
  "vakilahmadmousavi.ir",
  "www.vakilahmadmousavi.ir",
]);

export function isProductionAnalyticsHost(value) {
  return typeof value === "string" && PRODUCTION_ANALYTICS_HOSTS.includes(value.trim().toLowerCase());
}

export function trackLeadContact(method, pagePath, source = "link") {
  if (!["phone", "email", "whatsapp"].includes(method)) return false;
  if (typeof window === "undefined" || !isProductionAnalyticsHost(window.location?.hostname)) return false;

  if (typeof window.gtag !== "function") return false;

  const safePath = typeof pagePath === "string" && pagePath.startsWith("/")
    ? pagePath.slice(0, 2048)
    : "/";
  const safeSource = source === "request_form" ? "request_form" : "link";

  window.gtag("event", "contact_click", {
    method,
    page_path: safePath,
    source: safeSource,
  });
  return true;
}
