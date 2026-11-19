const articleSearchMetadataOverrides = Object.freeze({
  "criminal-court-authority-restitution-real-estate-third-party-deed-annulment": {
    title: "رد مال غیرمنقول به ثالث؛ اختیار دادگاه کیفری",
    description:
      "بررسی اختلاف رویه درباره رد مال غیرمنقول منتقل‌شده به ثالث با سند رسمی و حدود اختیار دادگاه کیفری در رسیدگی به ابطال سند.",
  },
});

export function getArticleSearchMetadata(article) {
  if (!article || typeof article !== "object") {
    return { title: "مقاله حقوقی", description: "" };
  }

  const override = articleSearchMetadataOverrides[article.slug];

  return {
    title:
      override?.title ||
      article.seoTitle ||
      article.metaTitle ||
      article.title ||
      "مقاله حقوقی",
    description:
      override?.description ||
      article.seoDescription ||
      article.excerpt ||
      "",
  };
}
