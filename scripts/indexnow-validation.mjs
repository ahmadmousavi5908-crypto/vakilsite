export function isValidIndexNowKey(value) {
  return typeof value === "string" && /^[A-Fa-f0-9]{8,128}$/.test(value);
}

export function isPrivateIndexNowPath(pathname) {
  if (typeof pathname !== "string") return true;

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return true;
  }

  const normalized = decoded.replace(/\\/g, "/").toLowerCase();
  return (
    normalized === "/admin" ||
    normalized.startsWith("/admin/") ||
    normalized === "/api" ||
    normalized.startsWith("/api/")
  );
}
