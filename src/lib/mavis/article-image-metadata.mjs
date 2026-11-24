const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VARIANT_NAMES = ["small", "medium", "wide", "landscape", "square"];
const ALL_IMAGE_NAMES = [...VARIANT_NAMES, "og"];
const MAX_TEXT = { alt: 300, title: 300, caption: 500 };

function fail(error) {
  return { ok: false, error };
}

function parseHttpsUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    if (!/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export function parseMavisArticleImageMetadata(input) {
  let value = input;
  if (typeof input === "string") {
    if (!input.trim()) return { ok: true, image: null };
    try {
      value = JSON.parse(input);
    } catch {
      return fail("فراداده تصویر معتبر نیست. تصویر را دوباره بارگذاری کنید.");
    }
  }

  if (value == null) return { ok: true, image: null };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail("ساختار تصویر مقاله معتبر نیست.");
  }

  const allowedKeys = new Set([
    "url", "ogUrl", "variants", "alt", "title", "caption",
    "width", "height", "mimeType", "showInArticle", "useForSeo",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return fail("فراداده تصویر شامل فیلد پشتیبانی‌نشده است.");
  }

  const alt = typeof value.alt === "string" ? value.alt.normalize("NFC").trim() : "";
  const title = typeof value.title === "string" ? value.title.normalize("NFC").trim() : "";
  const caption = typeof value.caption === "string" ? value.caption.normalize("NFC").trim() : "";
  if (alt.length < 5 || alt.length > MAX_TEXT.alt) {
    return fail("متن جایگزین تصویر باید بین ۵ تا ۳۰۰ نویسه باشد.");
  }
  if (title.length > MAX_TEXT.title || caption.length > MAX_TEXT.caption) {
    return fail("عنوان یا توضیح تصویر بیش از حد مجاز است.");
  }
  if (value.width !== 1600 || value.height !== 900 || value.mimeType !== "image/webp") {
    return fail("ابعاد یا قالب اصلی تصویر معتبر نیست.");
  }
  if (typeof value.showInArticle !== "boolean" || typeof value.useForSeo !== "boolean") {
    return fail("تنظیمات نمایش و سئوی تصویر معتبر نیست.");
  }
  if (value.useForSeo && !value.showInArticle) {
    return fail("برای استفاده سئویی، نمایش تصویر در مقاله نیز باید فعال باشد.");
  }
  if (!value.variants || typeof value.variants !== "object" || Array.isArray(value.variants)) {
    return fail("نسخه‌های واکنش‌گرای تصویر کامل نیستند.");
  }
  if (Object.keys(value.variants).length !== VARIANT_NAMES.length
    || VARIANT_NAMES.some((name) => typeof value.variants[name] !== "string")) {
    return fail("نسخه‌های واکنش‌گرای تصویر کامل نیستند.");
  }

  const urls = {
    ...value.variants,
    og: value.ogUrl,
  };
  const parsed = {};
  for (const name of ALL_IMAGE_NAMES) {
    parsed[name] = parseHttpsUrl(urls[name]);
    if (!parsed[name]) return fail("یکی از نشانی‌های تصویر امن یا معتبر نیست.");
  }

  const mainUrl = parseHttpsUrl(value.url);
  if (!mainUrl || mainUrl.href !== parsed.wide.href) {
    return fail("نشانی تصویر اصلی با نسخه عریض یکسان نیست.");
  }

  const first = parsed.wide;
  const match = first.pathname.match(/^\/storage\/v1\/object\/public\/mavis-article-images\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/wide\.webp$/i);
  if (!match || !UUID_PATTERN.test(match[1]) || !UUID_PATTERN.test(match[2])) {
    return fail("مسیر ذخیره تصویر با ساختار امن MAVIS سازگار نیست.");
  }
  const [userId, uploadId] = match.slice(1);
  for (const name of ALL_IMAGE_NAMES) {
    const candidate = parsed[name];
    const expectedPath = `/storage/v1/object/public/mavis-article-images/${userId}/${uploadId}/${name}.webp`;
    if (candidate.origin !== first.origin || candidate.pathname !== expectedPath) {
      return fail("نسخه‌های تصویر باید متعلق به یک بارگذاری واحد باشند.");
    }
  }

  return {
    ok: true,
    image: {
      url: first.href,
      ogUrl: parsed.og.href,
      variants: Object.fromEntries(VARIANT_NAMES.map((name) => [name, parsed[name].href])),
      alt,
      title,
      caption,
      width: 1600,
      height: 900,
      mimeType: "image/webp",
      showInArticle: value.showInArticle,
      useForSeo: value.useForSeo,
    },
  };
}

export function isMavisArticleImageOwnedByUser(image, supabaseUrl, userId) {
  if (!image || !UUID_PATTERN.test(String(userId || ""))) return false;
  let expectedOrigin;
  try {
    expectedOrigin = new URL(supabaseUrl).origin;
  } catch {
    return false;
  }

  const match = image.url.match(/^https:\/\/[^/]+\/storage\/v1\/object\/public\/mavis-article-images\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/wide\.webp$/i);
  if (!match || match[1].toLowerCase() !== userId.toLowerCase()) return false;

  const uploadId = match[2];
  const basePath = `/storage/v1/object/public/mavis-article-images/${userId}/${uploadId}/`;
  const urls = [...Object.entries(image.variants), ["og", image.ogUrl]];
  return urls.every(([name, value]) => {
    try {
      const url = new URL(value);
      return url.origin === expectedOrigin
        && url.pathname === basePath + name + ".webp"
        && !url.search && !url.hash;
    } catch {
      return false;
    }
  });
}

export const MAVIS_ARTICLE_IMAGE_VARIANTS = Object.freeze({
  small: { width: 640, height: 360 },
  medium: { width: 960, height: 540 },
  wide: { width: 1600, height: 900 },
  landscape: { width: 1200, height: 900 },
  square: { width: 1200, height: 1200 },
  og: { width: 1200, height: 630 },
});
