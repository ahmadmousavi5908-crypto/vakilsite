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
