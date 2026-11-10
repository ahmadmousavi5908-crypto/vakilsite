import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { articles } from "../../src/data/articles.js";
import { buildPublishedArticleRecords } from "../../src/lib/mavis/published-article-adapter.mjs";

const records = buildPublishedArticleRecords(articles).map((record) => ({
  id: record.id,
  record_type: "published_article",
  source_class: "educational_summary",
  title: record.title,
  summary: record.summary,
  definition: record.definition,
  warning: record.warning,
  category: record.category,
  read_time: record.read_time,
  path: record.path,
  source_url: record.source_url,
  sources: record.sources,
  review_status: "secondary_source_only",
  source_verified: false,
  validity_status: "unknown",
  exact_citation: null,
  law_id: null,
  article_number: null,
  access_class: "public",
  provenance: {
    source_file: "src/data/articles.js",
    source_review_status: "secondary_source_only",
    exact_primary_document_verified: false,
    current_validity_verified: false,
    note: "مقاله منتشرشده سایت یک منبع آموزشی ثانویه است و مرجع رسمی یا تأیید اعتبار روز قانون محسوب نمی‌شود.",
  },
}));

if (records.length !== articles.length || records.length === 0) {
  throw new Error("Published article export is incomplete; refusing to write the offline bundle.");
}

const output = {
  schema_version: "1.0.0",
  generated_at: new Date().toISOString(),
  source: "src/data/articles.js",
  counts: { published_articles: records.length },
  records,
};

const outputPath = fileURLToPath(new URL("../../public/mavis-offline/published-articles.json", import.meta.url));
const temporaryPath = outputPath + ".tmp";
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(temporaryPath, JSON.stringify(output, null, 2) + "\n", { encoding: "utf8", mode: 0o644 });
await rename(temporaryPath, outputPath);

console.log(JSON.stringify({
  status: "published_article_bundle_generated",
  count: records.length,
  path: "public/mavis-offline/published-articles.json",
  allSecondaryOnly: records.every((record) => record.review_status === "secondary_source_only" && record.source_verified === false),
}, null, 2));
