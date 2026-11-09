# راه‌اندازی MAVIS در Termux

## تصمیم معماری

Termux محل توسعه، ساخت پروژه یا رفع خطا نیست. بسته اجرایی مخصوص ARM64 در GitHub Actions روی Linux ARM64 ساخته و آزمایش می‌شود. Termux فقط بسته را دریافت می‌کند و آن را در Debian داخل `proot-distro` اجرا می‌کند تا وابستگی‌های glibc با Android/Bionic مخلوط نشوند.

در بسته محلی، بهینه‌سازی سروری تصاویر غیرفعال است و فایل‌های اصلی تصویر مستقیماً ارائه می‌شوند. این تنظیم فقط برای runtime محلی Termux است و تنظیمات انتشار اصلی سایت را تغییر نمی‌دهد.

## پیش‌نیازها

- Termux رسمی از GitHub Releases یا F-Droid
- دستگاه Android با معماری 64-bit ARM
- حداقل 2.5 گیگابایت فضای خالی
- اتصال اینترنت
- دسترسی GitHub از طریق `gh` در صورت خصوصی بودن مخزن

## اجرای یک‌مرحله‌ای

پس از ادغام PR شماره 76 و انتشار بسته تأییدشده:

```bash
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh api "repos/ahmadmousavi5908-crypto/vakilsite/contents/scripts/termux/install.sh?ref=feature/mavis-final-verification-20261109" --jq .content | base64 -d | bash
else
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/ahmadmousavi5908-crypto/vakilsite/feature/mavis-final-verification-20261109/scripts/termux/install.sh)"
fi
```

اگر مخزن خصوصی باشد و هنوز GitHub CLI احراز هویت نشده باشد، فقط یک‌بار پیش از دستور بالا اجرا کن:

```bash
pkg install -y gh
gh auth login
```

نصب‌کننده به‌صورت خودکار:
1. معماری دستگاه و فضای خالی را بررسی می‌کند.
2. ابزار `proot-distro` را در صورت نیاز نصب می‌کند؛ هیچ `pkg upgrade` سراسری اجرا نمی‌شود.
3. محیط مستقل Debian 13 (Trixie) را ایجاد و نسخه آن را کنترل می‌کند؛ محیط‌های Debian موجود کاربر را دست‌کاری نمی‌کند.
4. Node.js نسخه 24.22.2 لینوکس ARM64 را از منبع رسمی دریافت و با SHA-256 کنترل می‌کند.
5. بسته نسخه‌دار MAVIS و فایل checksum را از GitHub دریافت و صحت آن را بررسی می‌کند.
6. سرور آماده را روی `127.0.0.1:3002` اجرا می‌کند.

هیچ `npm install`، `npm ci`، `next build` یا ویرایش کد در Termux انجام نمی‌شود.

## دسترسی و توقف

نشانی محلی:

`http://127.0.0.1:3002`

برای توقف سرور، در همان نشست Termux کلیدهای `Ctrl+C` را بزنید.

## امنیت و مرزهای داده

- چت عمومی MAVIS و پذیرش درخواست‌ها در این بسته خاموش هستند.
- هیچ کلید OpenAI، Supabase یا Google داخل بسته قرار نمی‌گیرد.
- آرشیو Mother Two، پرونده موکلان و داده‌های محرمانه به GitHub یا بسته عمومی منتقل نمی‌شوند.
- Docling و OCR جزء runtime پایه نیستند.
- checksum بسته قبل از استخراج بررسی می‌شود.
- Node.js از فایل checksum رسمی انتشار خودش کنترل می‌شود.
- سرور فقط روی loopback دستگاه گوش می‌دهد و به شبکه عمومی باز نمی‌شود.

## وضعیت انتشار

تگ انتشار نهایی این بسته `mavis-termux-v1.0.0` است. این تگ فقط پس از ادغام PR اصلی و موفقیت build و smoke test روی Runner رسمی ARM64 ساخته می‌شود. تا پیش از آن، شاخه فعلی صرفاً نامزد انتشار است و دستور نصب نهایی نباید اجرا شود.

## بازیابی

اگر دریافت یا checksum شکست خورد، فایل ناقص را اجرا نکنید. همان بسته را دوباره دریافت کنید. اگر خطا در آزمون build یا smoke test GitHub رخ داد، اصلاح باید در شاخه توسعه انجام شود؛ Termux برای دست‌کاری فایل‌های پروژه استفاده نمی‌شود.
