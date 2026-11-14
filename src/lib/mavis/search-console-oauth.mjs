import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { getSiteUrl } from "../site-url.mjs";
import { normalizeSearchConsoleSiteUrl } from "./search-console-client.mjs";

export const SEARCH_CONSOLE_READ_ONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const SEARCH_CONSOLE_STATE_COOKIE = "mavis_gsc_oauth_state";
export const SEARCH_CONSOLE_CALLBACK_PATH = "/api/admin/mavis/search-console/callback";
const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const STATE_DOMAIN = "mavis-search-console-oauth-state-v1";

function readEncryptionKey(env = process.env) {
  const value = env.MAVIS_GSC_TOKEN_ENCRYPTION_KEY;
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("Search Console encryption key is not configured.");
  }
  return Buffer.from(value, "hex");
}

function stateSigningKey(env = process.env) {
  return createHmac("sha256", readEncryptionKey(env)).update(STATE_DOMAIN).digest();
}

export function getSearchConsoleOAuthConfig(env = process.env) {
  const clientId = typeof env.MAVIS_GSC_CLIENT_ID === "string" ? env.MAVIS_GSC_CLIENT_ID.trim() : "";
  const clientSecret = typeof env.MAVIS_GSC_CLIENT_SECRET === "string" ? env.MAVIS_GSC_CLIENT_SECRET.trim() : "";
  const siteUrl = normalizeSearchConsoleSiteUrl(env.MAVIS_GSC_SITE_URL);
  const siteOrigin = getSiteUrl(env, { required: true });
  readEncryptionKey(env);

  if (!clientId || !clientSecret || !siteUrl || !siteOrigin) {
    throw new Error("Search Console OAuth configuration is incomplete.");
  }

  return {
    clientId,
    clientSecret,
    siteUrl,
    siteOrigin,
    redirectUri: new URL(SEARCH_CONSOLE_CALLBACK_PATH, siteOrigin).href,
  };
}

export function createSearchConsoleAuthorizationUrl(config, state) {
  if (!config?.clientId || !config?.redirectUri || typeof state !== "string" || state.length < 32) {
    throw new Error("Search Console authorization request is invalid.");
  }

  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: SEARCH_CONSOLE_READ_ONLY_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return url.href;
}

export function createSearchConsoleOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function signSearchConsoleOAuthState(state, env = process.env) {
  if (typeof state !== "string" || !/^[A-Za-z0-9_-]{40,}$/.test(state)) {
    throw new Error("Search Console OAuth state is invalid.");
  }
  const signature = createHmac("sha256", stateSigningKey(env)).update(state).digest("base64url");
  return state + "." + signature;
}

export function verifySearchConsoleOAuthState(state, cookieValue, env = process.env) {
  if (typeof state !== "string" || typeof cookieValue !== "string") return false;
  const separator = cookieValue.lastIndexOf(".");
  if (separator < 1) return false;
  const cookieState = cookieValue.slice(0, separator);
  const signature = cookieValue.slice(separator + 1);
  if (cookieState !== state || !/^[A-Za-z0-9_-]{40,}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) {
    return false;
  }

  try {
    const expected = createHmac("sha256", stateSigningKey(env)).update(state).digest();
    const received = Buffer.from(signature, "base64url");
    return received.length === expected.length && timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}

export function encryptSearchConsoleRefreshToken(refreshToken, env = process.env) {
  if (typeof refreshToken !== "string" || refreshToken.length < 10 || refreshToken.length > 4096) {
    throw new Error("Search Console refresh token is invalid.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", readEncryptionKey(env), iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSearchConsoleRefreshToken(payload, env = process.env) {
  if (typeof payload !== "string" || payload.length > 8192) {
    throw new Error("Stored Search Console credentials are invalid.");
  }
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Stored Search Console credentials are invalid.");
  }

  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const encrypted = Buffer.from(parts[3], "base64url");
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length < 1 || encrypted.length > 4096) {
      throw new Error("Invalid encrypted token shape.");
    }
    const decipher = createDecipheriv("aes-256-gcm", readEncryptionKey(env), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Stored Search Console credentials could not be decrypted.");
  }
}

export async function exchangeSearchConsoleAuthorizationCode({
  code,
  config,
  fetchImpl = globalThis.fetch,
  timeoutMs = 20000,
} = {}) {
  if (typeof code !== "string" || code.length < 8 || code.length > 4096 ||
      !config?.clientId || !config?.clientSecret || !config?.redirectUri ||
      typeof fetchImpl !== "function") {
    throw new Error("Search Console authorization callback is invalid.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    if (!response?.ok) throw new Error("Google authorization code exchange failed.");

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Google authorization code exchange failed.");
    }

    const grantedScopes = typeof payload?.scope === "string" ? payload.scope.split(/\s+/) : [];
    if (typeof payload?.refresh_token !== "string" || payload.refresh_token.length < 10 ||
        typeof payload?.access_token !== "string" ||
        !grantedScopes.includes(SEARCH_CONSOLE_READ_ONLY_SCOPE)) {
      throw new Error("Google did not grant the required offline read-only Search Console access.");
    }

    return {
      refreshToken: payload.refresh_token,
      grantedScope: SEARCH_CONSOLE_READ_ONLY_SCOPE,
    };
  } finally {
    clearTimeout(timer);
  }
}


export async function revokeSearchConsoleRefreshToken({
  refreshToken,
  fetchImpl = globalThis.fetch,
  timeoutMs = 20000,
} = {}) {
  if (typeof refreshToken !== "string" || refreshToken.length < 10 || refreshToken.length > 4096 ||
      typeof fetchImpl !== "function") {
    throw new Error("Search Console revocation request is invalid.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ token: refreshToken }).toString(),
    });
    if (response?.ok) return { revoked: true, alreadyRevoked: false };

    let payload = null;
    try { payload = await response.json(); } catch { /* Ignore untrusted provider details. */ }
    if (response?.status === 400 && payload?.error === "invalid_token") {
      return { revoked: true, alreadyRevoked: true };
    }
    throw new Error("Google token revocation failed.");
  } finally {
    clearTimeout(timer);
  }
}
