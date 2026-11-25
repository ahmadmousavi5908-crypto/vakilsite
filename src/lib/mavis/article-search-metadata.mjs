const articleSearchMetadataOverrides = Object.freeze({
  "criminal-court-authority-restitution-real-estate-third-party-deed-annulment": {
    title: "رد مال غیرمنقول به ثالث؛ اختیار دادگاه کیفری",
    description:
      "بررسی اختلاف رویه درباره رد مال غیرمنقول منتقل‌شده به ثالث با سند رسمی و حدود اختیار دادگاه کیفری در رسیدگی به ابطال سند.",
  },
});

function firstNonEmptyText(values, fallback = "") {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

export function getArticleSearchMetadata(article) {
  if (!article || typeof article !== "object") {
    return { title: "مقاله حقوقی", description: "راهنمای حقوقی بر پایه قوانین ایران." };
  }

  const override = articleSearchMetadataOverrides[article.slug];

  return {
    title: firstNonEmptyText([
      override?.title,
      article.seoTitle,
      article.metaTitle,
      article.title,
    ], "مقاله حقوقی"),
    description: firstNonEmptyText([
      override?.description,
      article.seoDescription,
      article.excerpt,
      article.intro,
      article.title,
    ], "راهنمای حقوقی بر پایه قوانین ایران."),
  };
}
