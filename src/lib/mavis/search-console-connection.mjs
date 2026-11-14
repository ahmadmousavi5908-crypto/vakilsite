import { createHash } from "node:crypto";
import { createSearchConsoleClient, normalizeSearchConsoleSiteUrl } from "./search-console-client.mjs";
import { decryptSearchConsoleRefreshToken, revokeSearchConsoleRefreshToken } from "./search-console-oauth.mjs";

let cachedClient = null;
let cachedClientFingerprint = null;

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
  storedConnection,
} = {}) {
  const connection = storedConnection === undefined
    ? await readStoredSearchConsoleConnection(supabase)
    : storedConnection;
  if (!connection) return null;

  const clientId = typeof env.MAVIS_GSC_CLIENT_ID === "string" ? env.MAVIS_GSC_CLIENT_ID.trim() : "";
  const clientSecret = typeof env.MAVIS_GSC_CLIENT_SECRET === "string" ? env.MAVIS_GSC_CLIENT_SECRET.trim() : "";
  const configuredSiteUrl = normalizeSearchConsoleSiteUrl(env.MAVIS_GSC_SITE_URL);
  const storedSiteUrl = normalizeSearchConsoleSiteUrl(connection.siteUrl);

  if (!clientId || !clientSecret || !configuredSiteUrl || storedSiteUrl !== configuredSiteUrl) {
    throw new Error("Search Console server configuration does not match the saved connection.");
  }

  const fingerprint = createHash("sha256")
    .update(connection.encryptedRefreshToken)
    .update("\\0")
    .update(clientId)
    .update("\\0")
    .update(clientSecret)
    .update("\\0")
    .update(storedSiteUrl)
    .digest("hex");
  if (cachedClient && cachedClientFingerprint === fingerprint) return cachedClient;

  const refreshToken = decryptSearchConsoleRefreshToken(connection.encryptedRefreshToken, env);
  cachedClient = createSearchConsoleClient({
    clientId,
    clientSecret,
    refreshToken,
    siteUrl: storedSiteUrl,
  });
  cachedClientFingerprint = fingerprint;
  return cachedClient;
}


export async function disconnectStoredSearchConsoleConnection({
  supabase,
  env = process.env,
  revokeToken = revokeSearchConsoleRefreshToken,
} = {}) {
  const connection = await readStoredSearchConsoleConnection(supabase);
  let revoked = false;

  if (connection) {
    try {
      const refreshToken = decryptSearchConsoleRefreshToken(connection.encryptedRefreshToken, env);
      await revokeToken({ refreshToken });
      revoked = true;
    } catch {
      // Local credential removal must not depend on the provider being reachable.
    }
  }

  const { error } = await supabase.rpc("disconnect_mavis_search_console");
  if (error) throw new Error("Search Console connection could not be removed.");

  cachedClient = null;
  cachedClientFingerprint = null;
  return {
    connected: false,
    revoked,
    revocationPending: Boolean(connection) && !revoked,
  };
}
