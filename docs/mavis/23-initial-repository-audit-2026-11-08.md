# گزارش ممیزی اولیه GitHub — MAVIS / Vakilsite
تاریخ: 2026-11-08
وضعیت: بررسی remote repository؛ بررسی local Termux و Supabase production انجام نشده است.

## 1. مخزن و مجوزها
- Repository: ahmadmousavi5908-crypto/vakilsite
- Visibility: public
- Default branch: main
- Default branch SHA در زمان ممیزی: 71b8defdbedb2419cf4f8aae0c3acf64483c2977
- Repository size گزارش‌شده: 1284 KB
- اتصال حساب اصلی: admin=true, maintain=true, pull=true, push=true
- بنابراین اتصال فعلی صرفاً read-only نیست. هیچ تغییری روی main در این مرحله انجام نشده است.

## 2. شاخه‌ها و نقطه شروع امن
شاخه‌های مهم مشاهده‌شده:
- main — 71b8defdbedb2419cf4f8aae0c3acf64483c2977
- integration/mother-two-research-only-20261106 — 0f582a57a7aad57cc3b0ac847aa4e3ccab263962
- feature/mavis-core-foundation — c8aa1abb761cab602c816dcbab986a441fe4fde3
- feature/mavis-public-intake — edc0bff17246621c78f28359eb3de9f685dd224f
- feature/mavis-seo-integration-validation — fd6eb077865b4929955baabe4993d91a1179365d
- feature/seo-aeo-geo-growth-system — e74b1cdd16ac5fe8316a043d43879a4d05484f55
- feature/seo-technical-quality — 8f983d0104065a3f0030b00a91441f9979b03b40

برای حفظ main و شاخه‌های قبلی، شاخه مستندات مستقل زیر از integration ایجاد شد:
- docs/mavis-master-charter-v1.1-20261108
- Base: integration/mother-two-research-only-20261106
- هیچ merge، reset، force push یا تغییر main انجام نشده است.

## 3. ساختار remote مشاهده‌شده
- integration tree: 175 entries، truncated=false.
- main tree: 139 entries، truncated=false.
- integration شامل ۲۱ سند اصلی MAVIS، اسناد پژوهشی، اسناد SEO و legal-library است.
- ساختار حقوقی موجود:
  - src/data/legal-library/terms/terms.json
  - laws/laws.json
  - articles/articles.json
  - taxonomy/categories.json
  - relations/legal-content-links.json
  - schema/record-contracts.json
  - reports/source-review.json
  - validation/validate_library.py
  - MANIFEST.json
- helper موجود: src/lib/legal-library.js
- ساختار admin موجود: src/app/admin و Server Actions مرتبط.
- migrations مشاهده‌شده: 001_social_links.sql، 002_office_location.sql، 003_social_link_types.sql.
- اسناد معماری و قراردادها وجود دارند، اما endpointهای نمونه MAVIS در docs/mavis/05-api-contracts.md صراحتاً طرح منطقی و هنوز ساخته‌نشده معرفی شده‌اند.

## 4. یافته‌های فنی اولیه
- package.json روی شاخه integration: Next.js 16.4.3، React 19.3.0، @supabase/ssr ^0.6.1 و @supabase/supabase-js ^2.57.4.
- scripts موجود: dev/build با webpack، lint، validate:legal-library-seo، indexnow:prepare/submit و test:legal-library-http.
- در کد admin مشاهده‌شده، requireAdmin از auth.getClaims و RPC به نام is_site_admin استفاده می‌کند.
- نقش admin/editor سایت به‌تنهایی مدل نقش و مجوز MAVIS نیست؛ این نکته در اسناد امنیتی موجود نیز تصریح شده است.
- legal-library نسخه 1.3.1 در README معرفی شده و شامل 132 اصطلاح، 16 قانون و 22 خلاصه مقاله است؛ این اعداد metadata همان dataset هستند، نه تأیید صحت جاری قوانین.
- سند امنیتی موجود MAVIS public core را در وضعیت disabled by default و فاقد public chat Route Handler و live provider توصیف می‌کند.
- UI داک MAVIS باید مستقل بماند و ظاهر داک معرفی وکیل و سایر CTAهای فعلی تغییر نکند.

## 5. مواردی که هنوز اثبات نشده‌اند
- وضعیت واقعی workspace محلی Termux، branch، git status، فایل‌های untracked/modified و تطابق آن با remote.
- وجود، سلامت، اندازه و checksum آرشیو محلی VAKILSITE-MOTHER-TWO-UPDATED-20261106.
- انتقال و اعتبارسنجی ۳۲ فایل پژوهشی در بکاپ مادر دو.
- وضعیت واقعی Supabase project، schema اعمال‌شده، RLS فعال، grants، secrets و محیط staging/production.
- اجرای lint، build، unit/integration/e2e یا آزمون بصری روی دستگاه.
- وضعیت runtime MAVIS در هر شاخه دیگر؛ این گزارش فقط inventory remote اولیه و چند فایل منتخب را پوشش می‌دهد.
- وجود و سلامت Google Search Console، Google Ads، Trends، Bing Webmaster و دسترسی APIهای مربوطه.

## 6. تصمیمات اجرایی
1. main و baseline بصری سایت بدون تغییر باقی می‌مانند.
2. قبل از انتخاب شاخه پیاده‌سازی، branchها با compare و inventory کامل فایل‌ها تطبیق داده می‌شوند.
3. از legal-library و knowledge registry موجود استفاده می‌شود؛ دانشنامه موازی ساخته نمی‌شود.
4. اولین بسته اجرایی Termux باید یک اسکریپت idempotent و preflight-first باشد: تشخیص مسیر پروژه، بررسی branch/status، backup پیش از اعمال، دریافت artifact مشخص، checksum، اعتبارسنجی، و توقف امن در صورت هر مغایرت.
5. برای کاهش رفت‌وبرگشت، artifact نهایی فقط پس از آماده‌سازی کامل، lint/build/test در محیط قابل دسترس و بازبینی diff منتشر می‌شود. تستی که به secrets، Supabase یا Termux محلی وابسته است، با برچسب نیازمند اجرای محیط مالک تحویل می‌شود.
6. هیچ migration عملیاتی، انتشار عمومی، فعال‌سازی API پولی یا تغییر کمپین تبلیغاتی بدون مجوز جداگانه انجام نمی‌شود.

## 7. محدودیت این گزارش
این ممیزی از GitHub remote و فایل‌های خوانده‌شده انجام شده است. به فایل‌سیستم Termux، محیط اجرای محلی، داشبورد Supabase و حساب‌های تبلیغاتی/وبمستر دسترسی مستقیم نداشته‌ام. هیچ‌یک از این موارد به‌عنوان بررسی‌شده یا سالم اعلام نمی‌شوند.
