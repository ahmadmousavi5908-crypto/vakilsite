const SITE_URL_ENV = "NEXT_PUBLIC_SITE_URL";

export function getSiteUrl(env = process.env, { required = false } = {}) {
  const configured = env[SITE_URL_ENV]?.trim();

  if (!configured) {
    if (required) {
      throw new Error(`${SITE_URL_ENV} is required to generate canonical URLs and the sitemap.`);
    }
    return null;
  }

  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(`${SITE_URL_ENV} must be a valid absolute URL.`);
  }

  const isOriginOnly =
    url.pathname === "/" &&
    !url.search &&
    !url.hash &&
    !url.username &&
    !url.password;

  if (url.protocol !== "https:" || !url.hostname || !isOriginOnly) {
    throw new Error(
      `${SITE_URL_ENV} must be an HTTPS origin without credentials, path, query, or fragment.`,
    );
  }

  return url.origin;
}
