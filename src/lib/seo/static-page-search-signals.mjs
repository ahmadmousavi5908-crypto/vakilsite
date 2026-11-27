const ATTORNEY_IMAGE_PATH = "/images/lawyer.jpg";

// Update these values only when the corresponding public page content changes.
const STATIC_PAGE_LAST_MODIFIED = Object.freeze({
  "/": "2026-11-26",
  "/about": "2026-11-27",
  "/locations/khuzestan": "2026-11-27",
  "/services": "2026-11-24",
  "/services/family-law": "2026-11-24",
  "/services/criminal-law": "2026-11-24",
  "/services/property-law": "2026-11-26",
  "/services/contracts-and-obligations": "2026-11-24",
  "/services/claims-and-enforcement": "2026-11-24",
  "/services/legal-consultation": "2026-11-24",
});

// Keep the portrait associated with the page that visibly identifies the attorney.
const ATTORNEY_IMAGE_PAGES = new Set(["/about"]);

export function getStaticPageSearchSignals(path, siteUrl) {
  let origin;
  try {
    const parsed = new URL(siteUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error("Invalid sitemap origin");
    }
    origin = parsed.origin;
  } catch {
    throw new TypeError("A valid HTTPS site origin is required for sitemap signals.");
  }

  const lastModified = STATIC_PAGE_LAST_MODIFIED[path];
  const images = ATTORNEY_IMAGE_PAGES.has(path)
    ? [new URL(ATTORNEY_IMAGE_PATH, origin).href]
    : [];

  return {
    ...(lastModified ? { lastModified } : {}),
    ...(images.length ? { images } : {}),
  };
}
