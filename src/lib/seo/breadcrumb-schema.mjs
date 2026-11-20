export function buildBreadcrumbSchema(siteUrl, items) {
  if (typeof siteUrl !== "string" || !siteUrl.trim() || !Array.isArray(items) || items.length < 2) {
    return null;
  }

  let origin;
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    return null;
  }

  if (!origin || origin === "null") return null;

  const itemListElement = [];
  for (const [index, item] of items.entries()) {
    if (!item || typeof item.name !== "string" || !item.name.trim()) return null;

    const entry = {
      "@type": "ListItem",
      position: index + 1,
      name: item.name.trim(),
    };

    if (index < items.length - 1) {
      if (
        typeof item.path !== "string" ||
        !item.path.startsWith("/") ||
        item.path.startsWith("//") ||
        item.path.includes("?") ||
        item.path.includes("#") ||
        item.path.includes("\\")
      ) {
        return null;
      }

      let itemUrl;
      try {
        itemUrl = new URL(item.path, origin);
      } catch {
        return null;
      }

      if (itemUrl.origin !== origin || itemUrl.username || itemUrl.password) return null;
      entry.item = itemUrl.href;
    }

    itemListElement.push(entry);
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}
