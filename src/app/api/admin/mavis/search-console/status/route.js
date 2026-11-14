import { requireAdmin } from "../../../../../../lib/supabase/admin";
import {
  createSearchConsoleClientFromStoredConnection,
  readStoredSearchConsoleConnection,
} from "../../../../../../lib/mavis/search-console-connection.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const access = await requireAdmin();
  if (!access.configured || !access.user || !access.isAdmin || !access.supabase) {
    return Response.json({ error: "دسترسی مدیر تأیید نشد." }, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const [connection, client] = await Promise.all([
      readStoredSearchConsoleConnection(access.supabase),
      createSearchConsoleClientFromStoredConnection({ supabase: access.supabase, env: process.env }),
    ]);
    return Response.json({
      connected: Boolean(connection && client),
      siteUrl: connection?.siteUrl || null,
      connectedAt: connection?.connectedAt || null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "وضعیت اتصال Search Console در دسترس نیست." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
