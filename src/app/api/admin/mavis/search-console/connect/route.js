import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/supabase/admin";
import {
  createSearchConsoleAuthorizationUrl,
  createSearchConsoleOAuthState,
  getSearchConsoleOAuthConfig,
  SEARCH_CONSOLE_CALLBACK_PATH,
  SEARCH_CONSOLE_STATE_COOKIE,
  signSearchConsoleOAuthState,
} from "../../../../../../lib/mavis/search-console-oauth.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const access = await requireAdmin();
  if (!access.configured || !access.user || !access.isAdmin) {
    return NextResponse.json({ error: "دسترسی مدیر تأیید نشد." }, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  let config;
  try {
    config = getSearchConsoleOAuthConfig(process.env);
  } catch {
    return NextResponse.json({
      error: "تنظیمات OAuth سرویس Search Console روی سرور کامل نیست.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const state = createSearchConsoleOAuthState();
  const response = NextResponse.redirect(createSearchConsoleAuthorizationUrl(config, state));
  response.cookies.set(SEARCH_CONSOLE_STATE_COOKIE, signSearchConsoleOAuthState(state, process.env), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: SEARCH_CONSOLE_CALLBACK_PATH,
    maxAge: 600,
  });
  return response;
}
