import { NextResponse } from "next/server";
import { getPublishedEditorialArticlesStrict } from "../../../../lib/mavis/editorial-content";
import { buildPublishedArticleRecords } from "../../../../lib/mavis/published-article-adapter.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const articles = await getPublishedEditorialArticlesStrict();
    const records = buildPublishedArticleRecords(articles).map((record) => ({
      ...record,
      access_class: "public",
    }));

    return NextResponse.json(
      {
        schema_version: "1.0.0",
        generated_at: new Date().toISOString(),
        source: "mavis_editorial_articles",
        counts: { published_articles: records.length },
        records,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "PUBLISHED_ARTICLES_UNAVAILABLE" } },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}
