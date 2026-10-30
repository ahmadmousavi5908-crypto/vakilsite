import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("office_name,address,city,province,latitude,longitude,map_url,phone,is_location_public")
      .eq("setting_key", "office_location")
      .eq("is_location_public", true)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ location: null }, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json({ location: data }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ location: null }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
