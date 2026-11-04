export function isValidIndexNowKey(value) {
  return typeof value === "string" && /^[A-Za-z0-9-]{8,128}$/.test(value);
}

export function isPrivateIndexNowPath(pathname) {
  if (typeof pathname !== "string") return true;

  let decoded = pathname;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return true;
    }
  }

  const normalized = decoded.replace(/\\/g, "/").replace(/\\/+ /g, "/").toLowerCase();
  return (
    normalized === "/admin" ||
    normalized.startsWith("/admin/") ||
    normalized === "/api" ||
    normalized.startsWith("/api/")
  );
}
