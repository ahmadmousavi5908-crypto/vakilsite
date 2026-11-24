import { MAVIS_ARTICLE_IMAGE_VARIANTS } from "./article-image-metadata.mjs";

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 24_000_000;
const MAX_OUTPUT_BYTES = Math.floor(2.8 * 1024 * 1024);
const WEBP_QUALITIES = [0.84, 0.76, 0.68, 0.6];
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function canvasToWebp(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== "image/webp") {
        reject(new Error("مرورگر یا دستگاه فعلی خروجی WebP واقعی تولید نمی‌کند."));
        return;
      }
      resolve(blob);
    }, "image/webp", quality);
  });
}

async function encodeVariant(bitmap, variant) {
  const canvas = document.createElement("canvas");
  canvas.width = variant.width;
  canvas.height = variant.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("امکان پردازش تصویر در این مرورگر وجود ندارد.");

  const targetRatio = variant.width / variant.height;
  const sourceRatio = bitmap.width / bitmap.height;
  let sourceWidth = bitmap.width;
  let sourceHeight = bitmap.height;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceRatio > targetRatio) {
    sourceWidth = bitmap.height * targetRatio;
    sourceX = (bitmap.width - sourceWidth) / 2;
  } else {
    sourceHeight = bitmap.width / targetRatio;
    sourceY = (bitmap.height - sourceHeight) / 2;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  try {
    for (const quality of WEBP_QUALITIES) {
      const blob = await canvasToWebp(canvas, quality);
      if (blob.size <= MAX_OUTPUT_BYTES) return blob;
    }
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }

  throw new Error("حجم یکی از نسخه‌های تصویر بیش از ۲٫۸ مگابایت است؛ تصویر سبک‌تری انتخاب کنید.");
}

export async function prepareMavisArticleImage(file) {
  if (!(file instanceof File)) throw new Error("فایل تصویر انتخاب نشده است.");
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error("فقط تصویر JPEG، PNG یا WebP مجاز است.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("حجم تصویر اولیه نباید بیشتر از ۱۵ مگابایت باشد.");

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    if (bitmap.width < 1600 || bitmap.height < 1200) {
      throw new Error("برای ساخت نسخه‌های باکیفیت، تصویر اولیه باید حداقل ۱۶۰۰ در ۱۲۰۰ پیکسل باشد.");
    }
    if (bitmap.width * bitmap.height > MAX_SOURCE_PIXELS) {
      throw new Error("تصویر اولیه بیش از ۲۴ مگاپیکسل است؛ نسخه‌ای با وضوح متعارف انتخاب کنید تا مرورگر موبایل تحت فشار قرار نگیرد.");
    }

    const variants = {};
    for (const [name, size] of Object.entries(MAVIS_ARTICLE_IMAGE_VARIANTS)) {
      variants[name] = await encodeVariant(bitmap, size);
    }
    return variants;
  } finally {
    bitmap?.close?.();
  }
}
