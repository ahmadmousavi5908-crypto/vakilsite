import { NextResponse } from "next/server";
import { getPublicOfficeLocation } from "../../../lib/public-office-location";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
};

export async function GET() {
  try {
    const location = await getPublicOfficeLocation();
    return NextResponse.json({ location }, { headers: responseHeaders });
  } catch {
    return NextResponse.json({ location: null }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
