export function matchesRequestOrigin(origin, requestUrl) {
  if (typeof origin !== "string" || origin === "null" || !origin.trim()) return false;
  try {
    const parsedOrigin = new URL(origin);
    const parsedRequest = new URL(requestUrl);
    return parsedOrigin.origin === parsedRequest.origin;
  } catch {
    return false;
  }
}

export function isJsonContentType(value) {
  return typeof value === "string" && /^application\/json(?:\s*;|\s*$)/i.test(value.trim());
}
