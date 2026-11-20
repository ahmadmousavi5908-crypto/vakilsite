const VERIFIED_ATTORNEY_NAME = "سید احمد موسوی";

export function buildArticleAuthorSchema(siteUrl, authorName) {
  if (typeof authorName !== "string" || !authorName.trim()) return null;

  const name = authorName.normalize("NFC").trim();
  if (name !== VERIFIED_ATTORNEY_NAME) {
    return { "@type": "Person", name };
  }

  if (typeof siteUrl !== "string" || !siteUrl.trim()) {
    return { "@type": "Person", name };
  }

  try {
    const origin = new URL(siteUrl).origin;
    if (!origin || origin === "null") return { "@type": "Person", name };

    return {
      "@type": "Person",
      "@id": origin + "/#attorney",
      name,
      url: origin + "/about",
    };
  } catch {
    return { "@type": "Person", name };
  }
}
