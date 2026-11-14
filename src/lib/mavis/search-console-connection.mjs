import { createSearchConsoleClient, normalizeSearchConsoleSiteUrl } from "./search-console-client.mjs";
import { decryptSearchConsoleRefreshToken } from "./search-console-oauth.mjs";

export async function readStoredSearchConsoleConnection(supabase) {
  if (!supabase || typeof supabase.rpc !== "function") {
    throw new Error("Search Console connection storage is unavailable.");
  }
  const { data, error } = await supabase.rpc("get_mavis_search_console_connection");
  if (error) throw new Error("Search Console connection status could not be read.");
  if (!data || data.connected !== true) return null;
  if (typeof data.encryptedRefreshToken !== "string" ||
      typeof data.siteUrl !== "string" ||
      typeof data.connectedAt !== "string") {
    throw new Error("Stored Search Console connection is invalid.");
  }
  return data;
}

export async function createSearchConsoleClientFromStoredConnection({
  supabase,
  env = process.env,
} = {}) {
  const connection = await readStoredSearchConsoleConnection(supabase);
  if (!connection) return null;

  const clientId = typeof env.MAVIS_GSC_CLIENT_ID === "string" ? env.MAVIS_GSC_CLIENT_ID.trim() : "";
  const clientSecret = typeof env.MAVIS_GSC_CLIENT_SECRET === "string" ? env.MAVIS_GSC_CLIENT_SECRET.trim() : "";
  const configuredSiteUrl = normalizeSearchConsoleSiteUrl(env.MAVIS_GSC_SITE_URL);
  const storedSiteUrl = normalizeSearchConsoleSiteUrl(connection.siteUrl);

  if (!clientId || !clientSecret || !configuredSiteUrl || storedSiteUrl !== configuredSiteUrl) {
    throw new Error("Search Console server configuration does not match the saved connection.");
  }

  const refreshToken = decryptSearchConsoleRefreshToken(connection.encryptedRefreshToken, env);
  return createSearchConsoleClient({
    clientId,
    clientSecret,
    refreshToken,
    siteUrl: storedSiteUrl,
  });
}
