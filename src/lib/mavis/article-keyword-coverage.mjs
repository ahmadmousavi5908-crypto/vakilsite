import { normalizePersianSearchText } from "./persian-text-normalization.mjs";

function articleBodyText(article) {
  const content = article?.content && typeof article.content === "object" && !Array.isArray(article.content)
    ? article.content
    : {};
  const sections = Array.isArray(content.sections) ? content.sections : [];
  return [
    content.intro,
    ...sections.flatMap((section) => [section?.heading, section?.body])
  ].filter((value) => typeof value === "string" && value.trim()).join(" ");
}

export function analyzeMavisArticleKeywordCoverage(article) {
  const focusKeyword = typeof article?.focus_keyword === "string"
    ? article.focus_keyword.trim()
    : "";
  const normalizedFocus = normalizePersianSearchText(focusKeyword);
  const normalizedBody = normalizePersianSearchText(articleBodyText(article));
  const relatedKeywords = Array.isArray(article?.related_keywords)
    ? article.related_keywords.filter((value) => typeof value === "string" && value.trim())
    : [];
  const seen = new Set();
  const uniqueRelated = relatedKeywords.filter((keyword) => {
    const normalized = normalizePersianSearchText(keyword);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  const matchedRelatedKeywords = uniqueRelated.filter((keyword) =>
    normalizedBody.includes(normalizePersianSearchText(keyword))
  );

  return Object.freeze({
    hasFocusKeyword: Boolean(normalizedFocus),
    focusKeywordPresent: normalizedFocus ? normalizedBody.includes(normalizedFocus) : null,
    relatedKeywordCount: uniqueRelated.length,
    matchedRelatedKeywords,
    relatedCoverage: uniqueRelated.length
      ? matchedRelatedKeywords.length / uniqueRelated.length
      : null
  });
}
