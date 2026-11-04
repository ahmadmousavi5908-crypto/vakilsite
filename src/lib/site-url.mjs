const SITE_URL_ENV = "NEXT_PUBLIC_SITE_URL";

const INVALID_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function getSiteUrl(
  env = process.env,
  { required = false } = {},
) {
  const configured = env[SITE_URL_ENV]?.trim();

  if (!configured) {
    if (required) {
      throw new Error(
        `${SITE_URL_ENV} is required to generate canonical URLs and the sitemap.`,
      );
    }
    return null;
  }

  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(`${SITE_URL_ENV} must be a valid absolute URL.`);
  }

  const hostname = url.hostname.toLowerCase();
  const isIpAddress =
    hostname.includes(":") ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  const isOriginOnly =
    url.pathname === "/" &&
    !url.search &&
    !url.hash &&
    !url.username &&
    !url.password;

  if (
    url.protocol !== "https:" ||
    !hostname ||
    INVALID_HOSTS.has(hostname) ||
    isIpAddress ||
    !hostname.includes(".") ||
    hostname.endsWith(".") ||
    url.port ||
    !isOriginOnly
  ) {
    throw new Error(
      `${SITE_URL_ENV} must be a public HTTPS origin without credentials, port, path, query, or fragment.`,
    );
  }

  return url.origin;
}
