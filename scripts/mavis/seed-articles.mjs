import { createClient } from "@supabase/supabase-js";
import { articles } from "../../src/data/articles.js";
import { mapStaticArticleToRow } from "../../src/lib/mavis/article-content.mjs";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL and a server-side Supabase secret are required.");
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const { data: admins, error: adminError } = await supabase
  .from("profiles")
  .select("id")
  .eq("role", "admin")
  .limit(1);

if (adminError) throw new Error("Could not verify the site administrator before importing articles.");

const approvedBy = admins?.[0]?.id || null;
const importedAt = new Date().toISOString();
const rows = articles.map((article) => ({
  ...mapStaticArticleToRow(article, importedAt),
  status: approvedBy ? "published" : "draft",
  approved_by: approvedBy,
  approved_at: approvedBy ? importedAt : null,
  published_at: approvedBy ? importedAt : null,
}));

const { error } = await supabase
  .from("mavis_articles")
  .upsert(rows, { onConflict: "slug", ignoreDuplicates: true });

if (error) throw new Error("Article import failed: " + error.message);

const { count, error: verifyError } = await supabase
  .from("mavis_articles")
  .select("id", { count: "exact", head: true });

if (verifyError) throw new Error("Article import verification failed.");

if (count < rows.length) {
  throw new Error("Article import verification returned fewer rows than the legacy source.");
}

process.stdout.write(
  "MAVIS article import verified. Source rows: " + rows.length +
  "; database rows: " + count +
  "; imported as: " + (approvedBy ? "published legacy content" : "draft pending admin approval") + ".\n"
);
