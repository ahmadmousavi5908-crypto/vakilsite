import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("social_links")
      .select("id,platform,label,url,link_type,sort_order")
      .eq("is_active", true)
      .order("link_type", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ links: [] }, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({ links: data || [] }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ links: [] }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
