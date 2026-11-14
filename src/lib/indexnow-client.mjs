import { isPrivateIndexNowPath, isValidIndexNowKey } from "../../scripts/indexnow-validation.mjs";

function getCanonicalOrigin(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export async function submitIndexNowUrls(inputUrls, {
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const key = env.INDEXNOW_KEY?.trim();
  if (!key) return { state: "skipped", reason: "not_configured" };
  if (!isValidIndexNowKey(key)) return { state: "skipped", reason: "invalid_key" };

  const site = getCanonicalOrigin(env.NEXT_PUBLIC_SITE_URL);
  if (!site) return { state: "skipped", reason: "invalid_site_url" };
  if (!Array.isArray(inputUrls) || inputUrls.length < 1 || inputUrls.length > 10000) {
    return { state: "rejected", reason: "invalid_batch" };
  }

  const urls = [];
  const seen = new Set();
  for (const value of inputUrls) {
    if (typeof value !== "string" || !value.trim()) return { state: "rejected", reason: "invalid_url" };
    let url;
    try {
      url = new URL(value, site.origin);
    } catch {
      return { state: "rejected", reason: "invalid_url" };
    }
    if (url.origin !== site.origin || url.protocol !== "https:" || url.username || url.password
      || url.search || url.hash || isPrivateIndexNowPath(url.pathname)) {
      return { state: "rejected", reason: "invalid_url" };
    }
    if (!seen.has(url.href)) {
      seen.add(url.href);
      urls.push(url.href);
    }
  }

  if (!urls.length) return { state: "rejected", reason: "empty_batch" };

  try {
    const response = await fetchImpl("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: site.host,
        key,
        keyLocation: new URL("/indexnow-key.txt", site.origin).href,
        urlList: urls,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (response.status === 200 || response.status === 202) {
      return { state: "accepted", status: response.status, submitted: urls.length };
    }
    return { state: "rejected", status: response.status };
  } catch {
    return { state: "unavailable" };
  }
}
