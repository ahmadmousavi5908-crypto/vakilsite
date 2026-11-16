"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/supabase/admin";
import {
  parseEditorialBody,
  parseEditorialSources,
  validateEditorialSlug,
} from "../../../../lib/mavis/editorial-content-core.mjs";

function field(formData, name, max = 12000) {
  return String(formData.get(name) || "").normalize("NFC").trim().slice(0, max);
}

function readContent(formData) {
  const title = field(formData, "title", 300);
  const excerpt = field(formData, "excerpt", 1200);
  const intro = field(formData, "intro", 4000);
  const bodyMarkdown = field(formData, "body_markdown", 50000);
  const sections = parseEditorialBody(bodyMarkdown);
  const checklist = field(formData, "checklist", 5000)
    .split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 30);
  const sources = parseEditorialSources(field(formData, "sources", 12000));
  const content = {
    title,
    category: field(formData, "category", 120),
    readTime: field(formData, "read_time", 40),
    excerpt,
    intro,
    sections,
    checklist,
    warning: field(formData, "warning", 3000),
    sources,
    seoTitle: field(formData, "seo_title", 300),
    seoDescription: field(formData, "seo_description", 500),
    keywords: field(formData, "keywords", 1000).split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
    authorName: field(formData, "author_name", 160),
    sourceMetadata: {
      publication: field(formData, "publication", 240),
      publicationDate: field(formData, "publication_date", 40),
      documentNumber: field(formData, "document_number", 120),
      issuingAuthority: field(formData, "issuing_authority", 240),
      documentType: field(formData, "document_type", 120),
    },
  };
  return { content, bodyMarkdown };
}

function validateContent(slug, content) {
  if (!validateEditorialSlug(slug)) return "نشانی مقاله باید انگلیسی، کوتاه و بدون فاصله باشد.";
  if (content.title.length < 8) return "عنوان مقاله کوتاه یا خالی است.";
  if (content.excerpt.length < 30) return "خلاصه مقاله باید حداقل ۳۰ نویسه باشد.";
  if (content.intro.length < 30) return "مقدمه مقاله باید حداقل ۳۰ نویسه باشد.";
  if (!content.sections.length) return "متن مقاله را با حداقل یک تیتر ## و متن زیر آن وارد کنید.";
  return "";
}

async function adminContext() {
  const access = await requireAdmin();
  if (!access.configured || !access.user || !access.isAdmin || !access.supabase) {
    redirect("/admin/login?error=unauthorized");
  }
  return access;
}

export async function saveEditorialDraft(formData) {
  const { supabase, user } = await adminContext();
  const slug = field(formData, "slug", 120);
  const { content } = readContent(formData);
  const validationError = validateContent(slug, content);
  if (validationError) redirect("/admin/mavis/editorial?error=validation");

  const legalReviewStatus = formData.get("legal_review_approved") === "on" ? "approved" : "pending";
  const authorName = field(formData, "author_name", 160);
  const reviewerName = field(formData, "reviewer_name", 160);
  const { data: existing, error: lookupError } = await supabase
    .from("mavis_editorial_articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (lookupError) redirect("/admin/mavis/editorial?error=database");

  const payload = {
    draft_content: content,
    legal_review_status: legalReviewStatus,
    author_name: authorName,
    reviewer_name: reviewerName,
    updated_by: user.sub,
    updated_at: new Date().toISOString(),
    draft_updated_at: new Date().toISOString(),
  };

  const result = existing
    ? await supabase.from("mavis_editorial_articles").update(payload).eq("id", existing.id)
    : await supabase.from("mavis_editorial_articles").insert({ ...payload, slug, status: "draft", created_by: user.sub });

  if (result.error) redirect("/admin/mavis/editorial?error=database");
  revalidatePath("/admin/mavis/editorial");
  redirect("/admin/mavis/editorial?saved=1");
}

export async function publishEditorialArticle(formData) {
  const { supabase, user } = await adminContext();
  const slug = field(formData, "slug", 120);
  const { content } = readContent(formData);
  const validationError = validateContent(slug, content);
  const reviewerName = field(formData, "reviewer_name", 160);
  const authorName = field(formData, "author_name", 160);
  const legalApproved = formData.get("legal_review_approved") === "on";
  if (validationError || !legalApproved || !reviewerName || !authorName || !content.sources.length) {
    redirect("/admin/mavis/editorial?error=review");
  }

  const now = new Date().toISOString();
  const { data: existing, error: lookupError } = await supabase
    .from("mavis_editorial_articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (lookupError) redirect("/admin/mavis/editorial?error=database");

  const payload = {
    draft_content: content,
    published_content: content,
    status: "published",
    legal_review_status: "approved",
    author_name: authorName,
    reviewer_name: reviewerName,
    is_indexable: formData.get("is_indexable") === "on",
    last_legal_review_at: now,
    published_at: now,
    updated_by: user.sub,
    updated_at: now,
    draft_updated_at: now,
  };

  const result = existing
    ? await supabase.from("mavis_editorial_articles").update(payload).eq("id", existing.id)
    : await supabase.from("mavis_editorial_articles").insert({ ...payload, slug, created_by: user.sub });

  if (result.error) redirect("/admin/mavis/editorial?error=database");
  revalidatePath("/articles");
  revalidatePath("/articles/" + slug);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/mavis/editorial");
  redirect("/admin/mavis/editorial?published=1");
}
