function getOrigin(siteUrl) {
  if (typeof siteUrl !== "string" || !siteUrl.trim()) return null;
  try {
    const url = new URL(siteUrl);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function normalizePublicTelephone(value) {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/[\\s().-]/g, "");
  if (!/^\\+?[0-9]+$/.test(compact)) return null;
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return "+" + compact.slice(2);
  if (compact.startsWith("0")) return "+98" + compact.slice(1);
  if (compact.startsWith("98")) return "+" + compact;
  return null;
}

function normalizeHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function buildLegalServiceSchema(siteUrl, officeLocation) {
  const origin = getOrigin(siteUrl);
  if (!origin || !officeLocation || officeLocation.is_location_public !== true) return null;

  const streetAddress = typeof officeLocation.address === "string" ? officeLocation.address.trim() : "";
  const city = typeof officeLocation.city === "string" ? officeLocation.city.trim() : "";
  const region = typeof officeLocation.province === "string" ? officeLocation.province.trim() : "";
  if (!streetAddress || !city || !region) return null;

  const latitude = Number(officeLocation.latitude);
  const longitude = Number(officeLocation.longitude);
  const hasValidCoordinates = officeLocation.latitude !== null
    && officeLocation.latitude !== undefined
    && officeLocation.longitude !== null
    && officeLocation.longitude !== undefined
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;

  const telephone = normalizePublicTelephone(officeLocation.phone);
  const hasMap = normalizeHttpsUrl(officeLocation.map_url);

  return {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": origin + "/#legal-service-office",
    name: typeof officeLocation.office_name === "string" && officeLocation.office_name.trim()
      ? officeLocation.office_name.trim()
      : "خدمات حقوقی سید احمد موسوی",
    url: origin,
    address: {
      "@type": "PostalAddress",
      streetAddress,
      addressLocality: city,
      addressRegion: region,
      addressCountry: "IR",
    },
    ...(telephone ? { telephone } : {}),
    ...(hasValidCoordinates
      ? { geo: { "@type": "GeoCoordinates", latitude, longitude } }
      : {}),
    ...(hasMap ? { hasMap } : {}),
    areaServed: [
      { "@type": "City", name: "اهواز" },
      { "@type": "AdministrativeArea", name: "استان خوزستان" },
      { "@type": "Country", name: "ایران" },
    ],
    founder: { "@id": origin + "/#attorney" },
    inLanguage: "fa-IR",
  };
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

export function buildSchemaGraph(...entities) {
  const graph = entities.flatMap((entity) => {
    if (!entity || typeof entity !== "object") return [];
    const nodes = Array.isArray(entity["@graph"]) ? entity["@graph"] : [entity];
    return nodes
      .filter((node) => node && typeof node === "object")
      .map((node) => {
        const normalized = { ...node };
        delete normalized["@context"];
        delete normalized["@graph"];
        return normalized;
      })
      .filter((node) => Object.keys(node).length > 0);
  });

  return graph.length
    ? { "@context": "https://schema.org", "@graph": graph }
    : null;
}
