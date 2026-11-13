export function isJsonContentType(value) {
  if (typeof value !== "string") return false;
  return value.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

export function matchesRequestOrigin(origin, requestUrl) {
  if (typeof origin !== "string" || !origin.trim()) return false;

  try {
    const suppliedOrigin = new URL(origin);
    const expectedOrigin = new URL(requestUrl);
    return (
      (suppliedOrigin.protocol === "https:" || suppliedOrigin.protocol === "http:") &&
      suppliedOrigin.origin === origin &&
      suppliedOrigin.origin === expectedOrigin.origin
    );
  } catch {
    return false;
  }
}

export function safeInternalPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }

  try {
    const url = new URL(value, "https://mavis.invalid");
    if (url.origin !== "https://mavis.invalid") return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function safeExternalHttpUrl(value) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}
