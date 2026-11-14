import { requireAdmin } from "../../../../../../lib/supabase/admin";
import { decryptSearchConsoleRefreshToken, revokeSearchConsoleRefreshToken } from "../../../../../../lib/mavis/search-console-oauth.mjs";
import { readStoredSearchConsoleConnection } from "../../../../../../lib/mavis/search-console-connection.mjs";
import { matchesRequestOrigin } from "../../../../../../lib/mavis/request-guards.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  const access = await requireAdmin();
  if (!access.configured || !access.user || !access.isAdmin || !access.supabase) {
    return Response.json({ error: "دسترسی مدیر تأیید نشد." }, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (!matchesRequestOrigin(request.headers.get("origin"), request.url)) {
    return Response.json({ error: "مبدأ درخواست مجاز نیست." }, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const connection = await readStoredSearchConsoleConnection(access.supabase);
    if (connection) {
      const refreshToken = decryptSearchConsoleRefreshToken(connection.encryptedRefreshToken, process.env);
      await revokeSearchConsoleRefreshToken({ refreshToken });
    }
    const { error } = await access.supabase.rpc("disconnect_mavis_search_console");
    if (error) throw new Error("Disconnect failed.");
    return Response.json({ connected: false, revoked: Boolean(connection) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "قطع امن اتصال Search Console انجام نشد؛ اتصال محلی حفظ شد." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
