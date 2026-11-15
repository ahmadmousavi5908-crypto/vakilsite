// Keep the Edge middleware convention for Cloudflare Workers.
// Next.js 16 proxy.js uses Node.js, which OpenNext does not officially support on Workers.
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function copyResponseCookies(source, target) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function middleware(request) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/admin/login";
  const isAdminPage = pathname === "/admin" || (pathname.startsWith("/admin/") && !isLoginPage);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (isLoginPage) return response;

  if (!url || !key) {
    if (!isAdminPage) return response;
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("error", "config");
    return copyResponseCookies(response, NextResponse.redirect(loginUrl));
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  let claimsResult;
  try {
    claimsResult = await supabase.auth.getClaims();
  } catch {
    claimsResult = { data: null, error: true };
  }

  if (isAdminPage) {
    const claims = claimsResult?.data?.claims;
    const authenticated =
      !claimsResult?.error &&
      typeof claims?.sub === "string" &&
      claims.role === "authenticated";

    if (!authenticated) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "authorization");
      return copyResponseCookies(response, NextResponse.redirect(loginUrl));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/mavis/knowledge-search",
  ],
};
