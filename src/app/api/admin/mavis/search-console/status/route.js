import { requireAdmin } from "../../../../../../lib/supabase/admin";
import { getSearchConsoleOAuthConfig } from "../../../../../../lib/mavis/search-console-oauth.mjs";
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

  const requiredConfig = [
    "MAVIS_GSC_CLIENT_ID",
    "MAVIS_GSC_CLIENT_SECRET",
    "MAVIS_GSC_TOKEN_ENCRYPTION_KEY",
    "MAVIS_GSC_SITE_URL",
  ];
  const configured = requiredConfig.every((name) =>
    typeof process.env[name] === "string" && process.env[name].trim()
  );
  if (!configured) {
    return Response.json({
      configured: false,
      connected: false,
      siteUrl: null,
      connectedAt: null,
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    getSearchConsoleOAuthConfig(process.env);
    const connection = await readStoredSearchConsoleConnection(access.supabase);
    const client = await createSearchConsoleClientFromStoredConnection({
      supabase: access.supabase,
      env: process.env,
      storedConnection: connection,
    });
    return Response.json({
      configured: true,
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
