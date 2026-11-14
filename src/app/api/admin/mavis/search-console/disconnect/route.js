import { requireAdmin } from "../../../../../../lib/supabase/admin";
import { disconnectStoredSearchConsoleConnection } from "../../../../../../lib/mavis/search-console-connection.mjs";
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
    const result = await disconnectStoredSearchConsoleConnection({
      supabase: access.supabase,
      env: process.env,
    });
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "حذف اتصال محلی Search Console انجام نشد." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
