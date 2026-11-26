export const ATTORNEY_OFFICIAL_SOCIAL_PROFILE_URL = "https://www.instagram.com/vakilahmadmousavi/";

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

  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!/^\+?[0-9]+$/.test(compact)) return null;

  let international;
  if (compact.startsWith("+")) international = compact;
  else if (compact.startsWith("00")) international = "+" + compact.slice(2);
  else if (compact.startsWith("0")) international = "+98" + compact.slice(1);
  else if (compact.startsWith("98")) international = "+" + compact;
  else return null;

  const iranianMobile = /^\+98(9\d{9})$/.exec(international);
  if (!iranianMobile) return international;

  const nationalNumber = iranianMobile[1];
  return (
    "+98 " +
    nationalNumber.slice(0, 3) +
    " " +
    nationalNumber.slice(3, 6) +
    " " +
    nationalNumber.slice(6)
  );
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

function normalizeAddressText(value) {
  return typeof value === "string"
    ? value.trim().replace(/[\s،,]+/g, " ").toLocaleLowerCase("fa")
    : "";
}

export function normalizePublicOfficeName(value) {
  if (typeof value !== "string" || !value.trim()) return "خدمات حقوقی سید احمد موسوی";
  const normalized = value.trim().replace(/\s+/g, " ");
  const compact = normalized.replace(/[\s\u200c\u200e\u200f]/g, "");
  return compact === "وکیلسیداحمدموسوی" ? "وکیل سید احمد موسوی" : normalized;
}

export function buildLegalServiceSchema(siteUrl, officeLocation) {
  const origin = getOrigin(siteUrl);
  if (!origin || !officeLocation || officeLocation.is_location_public !== true) return null;

  const rawStreetAddress = typeof officeLocation.address === "string" ? officeLocation.address.trim() : "";
  const city = typeof officeLocation.city === "string" ? officeLocation.city.trim() : "";
  const region = typeof officeLocation.province === "string" ? officeLocation.province.trim() : "";
  if (!city || !region) return null;

  const normalizedAddress = normalizeAddressText(rawStreetAddress);
  const genericAddressValues = new Set([
    normalizeAddressText(city),
    normalizeAddressText(region),
    normalizeAddressText(city + " " + region),
    normalizeAddressText(region + " " + city),
  ]);
  const streetAddress = normalizedAddress && !genericAddressValues.has(normalizedAddress)
    ? rawStreetAddress
    : null;

  const latitude = Number(officeLocation.latitude);
  const longitude = Number(officeLocation.longitude);
  const hasCoordinateValues = officeLocation.latitude !== null
    && officeLocation.latitude !== undefined
    && String(officeLocation.latitude).trim() !== ""
    && officeLocation.longitude !== null
    && officeLocation.longitude !== undefined
    && String(officeLocation.longitude).trim() !== "";
  const hasValidCoordinates = hasCoordinateValues
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;

  const telephone = normalizePublicTelephone(officeLocation.phone);
  const hasMap = normalizeHttpsUrl(officeLocation.map_url)
    || (hasValidCoordinates ? "https://www.google.com/maps?q=" + latitude + "," + longitude : null);

  return {
    "@context": "https://schema.org",
    "@type": ["LegalService", "LocalBusiness"],
    "@id": origin + "/#legal-service-office",
    name: normalizePublicOfficeName(officeLocation.office_name),
    url: origin,
    sameAs: [ATTORNEY_OFFICIAL_SOCIAL_PROFILE_URL],
    address: {
      "@type": "PostalAddress",
      ...(streetAddress ? { streetAddress } : {}),
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
