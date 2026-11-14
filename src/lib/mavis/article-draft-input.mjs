const LIMITS = { title: 300, slug: 180, excerpt: 1200, category: 100, author: 180, seoTitle: 300, seoDescription: 500, intro: 8000, heading: 240, body: 12000, tag: 60, tags: 40, sections: 80 };

function text(form, key) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function between(value, min, max) {
  return value.length >= min && value.length <= max;
}

export function parseMavisArticleDraftInput(form) {
  if (!form || typeof form.get !== "function" || typeof form.getAll !== "function") {
    return { ok: false, error: "اطلاعات فرم معتبر نیست." };
  }

  const title = text(form, "title");
  const slug = text(form, "slug");
  const excerpt = text(form, "excerpt");
  const category = text(form, "category");
  const intro = text(form, "intro");
  const author = text(form, "author_name");
  const seoTitle = text(form, "seo_title");
  const seoDescription = text(form, "seo_description");
  const tags = [...new Set(text(form, "tags").split(/[,،]/).map((item) => item.trim()).filter(Boolean))];
  const headings = form.getAll("section_heading");
  const bodies = form.getAll("section_body");

  if (!between(title, 3, LIMITS.title)) return { ok: false, error: "عنوان باید بین ۳ تا ۳۰۰ نویسه باشد." };
  if (!between(slug, 3, LIMITS.slug) || !/^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return { ok: false, error: "نامک باید انگلیسی، کوچک و شامل حروف، عدد و خط تیره باشد." };
  }
  if (!between(excerpt, 10, LIMITS.excerpt)) return { ok: false, error: "خلاصه باید بین ۱۰ تا ۱۲۰۰ نویسه باشد." };
  if (!between(category, 2, LIMITS.category)) return { ok: false, error: "دسته‌بندی باید بین ۲ تا ۱۰۰ نویسه باشد." };
  if (!between(intro, 10, LIMITS.intro)) return { ok: false, error: "مقدمه باید بین ۱۰ تا ۸۰۰۰ نویسه باشد." };
  if (author.length > LIMITS.author || seoTitle.length > LIMITS.seoTitle || seoDescription.length > LIMITS.seoDescription) {
    return { ok: false, error: "یکی از فیلدهای نویسنده یا سئو بیش از حد مجاز است." };
  }
  if (tags.length > LIMITS.tags || tags.some((item) => !between(item, 1, LIMITS.tag))) {
    return { ok: false, error: "حداکثر ۴۰ برچسب و ۶۰ نویسه برای هر برچسب مجاز است." };
  }
  if (headings.length !== bodies.length || headings.length < 1 || headings.length > LIMITS.sections) {
    return { ok: false, error: "مقاله باید حداقل یک بخش معتبر داشته باشد." };
  }

  const sections = headings.map((heading, index) => ({
    heading: typeof heading === "string" ? heading.trim() : "",
    body: typeof bodies[index] === "string" ? bodies[index].trim() : "",
  }));
  if (sections.some((section) => !between(section.heading, 2, LIMITS.heading) || !between(section.body, 10, LIMITS.body))) {
    return { ok: false, error: "عنوان هر بخش باید ۲ تا ۲۴۰ و متن آن ۱۰ تا ۱۲۰۰۰ نویسه باشد." };
  }

  const payload = { slug, title, excerpt, category, tags, content: { intro, sections } };
  if (author) payload.author_name = author;
  if (seoTitle) payload.seo_title = seoTitle;
  if (seoDescription) payload.seo_description = seoDescription;
  return { ok: true, payload };
}
