function getOrigin(siteUrl) {
  if (typeof siteUrl !== "string" || !siteUrl.trim()) return null;
  try {
    const url = new URL(siteUrl);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function buildPracticeAreaServiceSchema(siteUrl, area) {
  const origin = getOrigin(siteUrl);
  if (
    !origin ||
    !area ||
    typeof area.slug !== "string" ||
    typeof area.title !== "string" ||
    typeof area.description !== "string"
  ) return null;

  const url = new URL("/services/" + encodeURIComponent(area.slug), origin).href;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": url + "#service",
    name: area.title + " در اهواز و خوزستان",
    serviceType: area.title,
    description: area.description,
    url,
    inLanguage: "fa-IR",
    provider: { "@id": origin + "/#attorney" },
    areaServed: [
      { "@type": "City", name: "اهواز" },
      { "@type": "AdministrativeArea", name: "استان خوزستان" },
    ],
  };
}

export function buildFaqPageSchema(pageUrl, faqs) {
  if (typeof pageUrl !== "string" || !Array.isArray(faqs)) return null;

  let url;
  try {
    url = new URL(pageUrl);
    if (url.protocol !== "https:") return null;
  } catch {
    return null;
  }

  const mainEntity = faqs
    .map((faq) => {
      const name = Array.isArray(faq) ? faq[0] : faq?.question;
      const text = Array.isArray(faq) ? faq[1] : faq?.answer;
      if (typeof name !== "string" || !name.trim() || typeof text !== "string" || !text.trim()) {
        return null;
      }
      return {
        "@type": "Question",
        name: name.trim(),
        acceptedAnswer: {
          "@type": "Answer",
          text: text.trim(),
        },
      };
    })
    .filter(Boolean);

  if (mainEntity.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": url.href.replace(/#.*$/, "") + "#faq",
    url: url.href.replace(/#.*$/, ""),
    inLanguage: "fa-IR",
    mainEntity,
  };
}
