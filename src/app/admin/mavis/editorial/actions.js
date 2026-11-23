"use server";

import { revalidatePath, updateTag } from "next/cache";
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
    image: readArticleImage(formData),
  };
  return { content, bodyMarkdown };
}

function publicArticleImageUrl(value) {
  try {
    const candidate = new URL(String(value || ""));
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    if (
      candidate.origin !== project.origin ||
      !candidate.pathname.startsWith("/storage/v1/object/public/mavis-article-images/")
    ) return "";
    return candidate.toString();
  } catch {
    return "";
  }
}

function readArticleImage(formData) {
  const url = publicArticleImageUrl(field(formData, "image_url", 2000));
  if (!url) return null;

  let variants = {};
  try {
    const parsed = JSON.parse(field(formData, "image_variants", 6000) || "{}");
    for (const key of ["small", "medium", "wide", "landscape", "square"]) {
      const safeUrl = publicArticleImageUrl(parsed?.[key]);
      if (safeUrl) variants[key] = safeUrl;
    }
  } catch {
    variants = {};
  }

  return {
    url,
    ogUrl: publicArticleImageUrl(field(formData, "image_og_url", 2000)) || url,
    variants,
    alt: field(formData, "image_alt", 300),
    title: field(formData, "image_title", 300),
    caption: field(formData, "image_caption", 500),
    width: 1600,
    height: 900,
    mimeType: "image/webp",
    showInArticle: formData.get("show_image_in_article") === "on",
    useForSeo: formData.get("use_image_for_seo") === "on" && formData.get("show_image_in_article") === "on",
  };
}

function validateContent(slug, content) {
  if (!validateEditorialSlug(slug)) return "نشانی مقاله باید انگلیسی، کوتاه و بدون فاصله باشد.";
  if (content.title.length < 8) return "عنوان مقاله کوتاه یا خالی است.";
  if (content.excerpt.length < 30) return "خلاصه مقاله باید حداقل ۳۰ نویسه باشد.";
  if (content.intro.length < 30) return "مقدمه مقاله باید حداقل ۳۰ نویسه باشد.";
  if (!content.sections.length) return "متن مقاله را با حداقل یک تیتر ## و متن زیر آن وارد کنید.";
  if (content.image && content.image.alt.length < 5) return "برای تصویر بارگذاری‌شده، متن جایگزین توصیفی (Alt) وارد کنید.";
  return "";
}

async function adminContext() {
  const access = await requireAdmin();
  if (!access.configured || !access.user || !access.isAdmin || !access.supabase) {
    redirect("/admin/login?error=unauthorized");
  }
  return access;
}

export async function uploadEditorialImage(formData) {
  const { supabase, user } = await adminContext();
  const slug = field(formData, "slug", 120);
  const safeSlug = validateEditorialSlug(slug) ? slug : "article";
  const definitions = [
    { key: "small", field: "image_small" },
    { key: "medium", field: "image_medium" },
    { key: "wide", field: "image_wide" },
    { key: "landscape", field: "image_landscape" },
    { key: "square", field: "image_square" },
    { key: "og", field: "image_og" },
  ];
  const files = [];

  for (const definition of definitions) {
    const file = formData.get(definition.field);
    if (!file || typeof file.arrayBuffer !== "function" || file.size < 1 || file.size > 3 * 1024 * 1024 || file.type !== "image/webp") {
      return { ok: false, message: "ساخت نسخه بهینه تصویر ناموفق بود؛ تصویر دیگری انتخاب کنید." };
    }
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const signature = String.fromCharCode(...header);
    if (!signature.startsWith("RIFF") || signature.slice(8, 12) !== "WEBP") {
      return { ok: false, message: "فرمت واقعی تصویر معتبر نیست." };
    }
    files.push({ ...definition, file });
  }

  const uploadedPaths = [];
  const images = {};
  const folder = user.sub + "/" + safeSlug + "/" + Date.now() + "-" + globalThis.crypto.randomUUID();

  try {
    for (const item of files) {
      const path = folder + "/" + safeSlug + "-" + item.key + ".webp";
      const { error } = await supabase.storage.from("mavis-article-images").upload(path, item.file, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      uploadedPaths.push(path);
      images[item.key] = supabase.storage.from("mavis-article-images").getPublicUrl(path).data.publicUrl;
    }
    return { ok: true, images };
  } catch {
    if (uploadedPaths.length) {
      await supabase.storage.from("mavis-article-images").remove(uploadedPaths);
    }
    return { ok: false, message: "بارگذاری تصویر انجام نشد؛ دسترسی Storage و مهاجرت محیط آزمایشی را بررسی کنید." };
  }
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

  content.authorName = authorName;
  content.reviewerName = reviewerName;

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
  updateTag("mavis-editorial");
  revalidatePath("/articles");
  revalidatePath("/articles/" + slug);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/mavis/editorial");
  redirect("/admin/mavis/editorial?published=1");
}
