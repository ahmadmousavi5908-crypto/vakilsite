const WORKERS_STAGING_HOST = /^vakilahmadmousavi-ir-staging\.[a-z0-9-]+\.workers\.dev$/i;

export function isStagingSite() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return false;

  try {
    const { hostname } = new URL(siteUrl);
    return hostname.startsWith("staging.") || WORKERS_STAGING_HOST.test(hostname);
  } catch {
    return false;
  }
}
