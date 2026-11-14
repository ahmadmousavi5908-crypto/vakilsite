import { requireAdmin } from "../../../../../../lib/supabase/admin";
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
    const { error } = await access.supabase.rpc("disconnect_mavis_search_console");
    if (error) throw new Error("Disconnect failed.");
    return Response.json({ connected: false }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "قطع اتصال Search Console انجام نشد." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
