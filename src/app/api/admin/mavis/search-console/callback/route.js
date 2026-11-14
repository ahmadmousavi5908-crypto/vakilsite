import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/supabase/admin";
import {
  decryptSearchConsoleRefreshToken,
  encryptSearchConsoleRefreshToken,
  exchangeSearchConsoleAuthorizationCode,
  getSearchConsoleOAuthConfig,
  SEARCH_CONSOLE_CALLBACK_PATH,
  SEARCH_CONSOLE_STATE_COOKIE,
  verifySearchConsoleOAuthState,
} from "../../../../../../lib/mavis/search-console-oauth.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectToAdmin(siteOrigin, status) {
  const response = NextResponse.redirect(new URL("/admin/mavis?gsc=" + status, siteOrigin));
  response.cookies.set(SEARCH_CONSOLE_STATE_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: SEARCH_CONSOLE_CALLBACK_PATH,
    maxAge: 0,
  });
  return response;
}

export async function GET(request) {
  const access = await requireAdmin();
  if (!access.configured || !access.user || !access.isAdmin || !access.supabase) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  let config;
  try {
    config = getSearchConsoleOAuthConfig(process.env);
  } catch {
    return NextResponse.json({ error: "تنظیمات اتصال Search Console کامل نیست." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const params = new URL(request.url).searchParams;
  const state = params.get("state");
  const code = params.get("code");
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(SEARCH_CONSOLE_STATE_COOKIE)?.value;

  if (!verifySearchConsoleOAuthState(state, stateCookie, process.env)) {
    return redirectToAdmin(config.siteOrigin, "state_error");
  }
  if (params.has("error") || !code) {
    return redirectToAdmin(config.siteOrigin, "denied");
  }

  try {
    const exchanged = await exchangeSearchConsoleAuthorizationCode({
      code,
      config,
    });
    const encryptedRefreshToken = encryptSearchConsoleRefreshToken(exchanged.refreshToken, process.env);
    const { error } = await access.supabase.rpc("store_mavis_search_console_connection", {
      p_encrypted_refresh_token: encryptedRefreshToken,
      p_site_url: config.siteUrl,
    });
    if (error) throw new Error("Search Console credential storage failed.");

    return redirectToAdmin(config.siteOrigin, "connected");
  } catch {
    return redirectToAdmin(config.siteOrigin, "error");
  }
}
