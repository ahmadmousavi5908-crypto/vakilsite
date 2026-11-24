import { isPrivateIndexNowPath, isValidIndexNowKey } from "../../scripts/indexnow-validation.mjs";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS = 10000;

export async function submitIndexNowUrls(paths, {
  key = process.env.INDEXNOW_KEY,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!isValidIndexNowKey(typeof key === "string" ? key.trim() : "")) {
    return { accepted: false, state: "not_configured", reason: "missing_or_invalid_key" };
  }
  if (typeof siteUrl !== "string" || typeof fetchImpl !== "function") {
    return { accepted: false, state: "not_configured", reason: "site_or_transport_unavailable" };
  }

  let site;
  try {
    site = new URL(siteUrl);
  } catch {
    return { accepted: false, state: "invalid_configuration", reason: "invalid_site_url" };
  }
  if (site.protocol !== "https:" || site.username || site.password || site.pathname !== "/" || site.search || site.hash) {
    return { accepted: false, state: "invalid_configuration", reason: "invalid_site_origin" };
  }
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > MAX_URLS) {
    return { accepted: false, state: "invalid_request", reason: "invalid_url_count" };
  }

  const urls = [];
  const seen = new Set();
  for (const value of paths) {
    if (typeof value !== "string" || !value.trim()) {
      return { accepted: false, state: "invalid_request", reason: "invalid_url" };
    }
    let url;
    try {
      url = new URL(value, site.origin);
    } catch {
      return { accepted: false, state: "invalid_request", reason: "invalid_url" };
    }
    if (url.origin !== site.origin || url.username || url.password || url.search || url.hash ||
      isPrivateIndexNowPath(url.pathname)) {
      return { accepted: false, state: "rejected", reason: "unsafe_or_private_url" };
    }
    if (!seen.has(url.href)) {
      seen.add(url.href);
      urls.push(url.href);
    }
  }
  if (!urls.length) return { accepted: false, state: "invalid_request", reason: "empty_url_list" };

  let response;
  try {
    response = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: site.host,
        key: key.trim(),
        keyLocation: new URL("/" + encodeURIComponent(key.trim()) + ".txt", site.origin).href,
        urlList: urls
      })
    });
  } catch {
    return { accepted: false, state: "unavailable", reason: "network_error" };
  }

  if (response.status !== 200 && response.status !== 202) {
    return { accepted: false, state: "rejected", status: response.status };
  }
  return {
    accepted: true,
    state: response.status === 202 ? "accepted_pending_verification" : "accepted",
    status: response.status,
    submitted: urls.length
  };
}
