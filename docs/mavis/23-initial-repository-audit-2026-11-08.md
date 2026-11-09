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


## 8. تکمیل ممیزی شاخه‌ها و CI — 2026-11-08
- Tree شاخه feature/mavis-core-foundation شامل `src/lib/mavis/`، `src/components/mavis/PublicIntake.jsx`، تست `tests/mavis/public-chat.test.mjs` و workflow هسته است.
- Tree شاخه feature/mavis-public-intake شامل فرم PublicIntake و مستندات مرتبط است.
- Tree شاخه feature/mavis-seo-integration-validation شامل هسته MAVIS، فرم پذیرش، داک MAVIS، مستندات SEO، scripts مربوط به IndexNow، sitemap/site-url و تست‌های مرتبط است.
- Tree شاخه integration/mother-two-research-only-20261106 شامل مستندات MAVIS/SEO و legal-library است، اما فایل‌های runtime مربوط به `src/lib/mavis/`، `src/components/mavis/` و تست‌های MAVIS در این tree مشاهده نشدند. بنابراین این شاخه مبنای مستندات است، نه مبنای کامل کد اجرایی.
- مقایسه remote نشان داد `feature/mavis-seo-integration-validation` نسبت به main دارای 139 commit جلوتر و 0 عقب‌تر است؛ این شاخه تغییرات گسترده سایت و MAVIS را دارد. این به معنی تأیید بصری آن با workspace محلی Mother Two نیست.
- مقایسه `feature/mavis-core-foundation` با `feature/mavis-seo-integration-validation` نشان داد شاخه SEO تعداد 82 commit جلوتر است و اصلاحات SEO، sitemap، dock و UI را اضافه می‌کند.
- GitHub Actions برای SHA `fd6eb077865b4929955baabe4993d91a1179365d` در 2026-11-04 دو run موفق گزارش کرده است:
  - Site quality checks: run 41914352116 — success
  - MAVIS Core Tests: run 41914352083 — success
- آخرین run مشاهده‌شده برای شاخه `feature/mavis-official-face-home-dock-20261105` روی SHA `daebbc0bd40d71e941f02be75cc7d01a3863a06c`، workflow سایت در 2026-11-05 با success پایان یافته است. این نتیجه فقط به همان SHA و workflow مربوط است.
- endpoint خواندن branch protection برای main با خطای 403 و عدم دسترسی integration پاسخ داد؛ وضعیت protection در این ممیزی قابل تأیید نیست و نباید disabled یا enabled فرض شود.
- فایل PublicIntake فعلی در شاخه SEO یک فرم سه‌مرحله‌ای با موضوع، مرحله، فوریت، شهر/شرح، سبک پاسخ، گزارش خلاصه و آماده‌سازی متن WhatsApp دارد. خود رابط تصریح می‌کند که مشاوره اختصاصی یا تحلیل حقوقی صادر نمی‌کند و ارسال به WhatsApp با انتخاب کاربر است. این فرم هنوز معادل فرم جامع شرطی نهایی سند مادر نیست.
- کد PublicIntake شامل guidance ثابت بر اساس دسته موضوع است؛ این guidance باید از نظر عدم تفسیر پاسخ شخصی و عدم القای توصیه حقوقی قطعی بازبینی شود. توسعه بعدی باید گزارش صرفاً مبتنی بر پاسخ‌های صریح کاربر را تضمین کند.
- MavisDock فعلی در شاخه SEO از portrait SVG موقت استفاده می‌کند؛ با تصویر مرجع سه‌بعدی مصوب یکسان نیست و باید در مرحله طراحی دارایی بصری بررسی شود، بدون تغییر ظاهر سایت تا زمان پذیرش.


## 9. تطبیق شاخه ظاهر MAVIS و منوی موبایل — 2026-11-08
- شاخه `feature/mavis-official-face-home-dock-20261105` نسبت به main دقیقاً ۹ commit جلوتر و ۰ commit عقب‌تر است؛ تغییرات آن در مقایسه با main پنج فایل است: `src/app/globals.css`، `src/app/page.js`، `src/components/GlobalMobileMenu.jsx` و دو فایل `MavisAvatarDock`.
- همین شاخه نسبت به `feature/mavis-seo-integration-validation` واگراست: ۹ commit اختصاصی ظاهر در برابر ۱۳۹ commit شاخه SEO. پس این دو را نمی‌توان بدون تطبیق merge کرد.
- تغییر منوی موبایل در شاخه official-face اندازه 48×54px، فاصله 8px از safe area، زمینه سرمه‌ای و برچسب «فهرست» دارد؛ شاخه SEO حالت متفاوت 50×50px و ظاهر روشن دارد. این تفاوت مستقیماً با حساسیت مالک نسبت به منوی تأییدشده مرتبط است.
- کامپوننت `MavisAvatarDock` در شاخه official-face از قاب مستطیلی با border طلایی، halo و animation شناور استفاده می‌کند؛ اندازه 52×64 موبایل و 58×70 دسکتاپ است. این implementation با خواسته ثبت‌شده بعدی مالک مبنی بر شخصیت شناور بدون قاب/حلقه طلایی و glow/pulse ظریف یکسان نیست؛ بنابراین نباید بدون مقایسه با نسخه محلی پورت 3002 کپی شود.
- `MavisAvatarDock` صرفاً لینک به `/ai-assistant` است؛ این داک به‌تنهایی runtime مکالمه یا هسته هوشمند فعال ایجاد نمی‌کند.
- نتیجه انتخاب baseline: شاخه SEO برای بررسی runtime و قابلیت‌های فنی، شاخه official-face فقط مرجع مقایسه تغییرات منو/داک، و workspace محلی تأییدشده Mother Two مرجع نهایی ظاهر. هیچ‌یک به‌تنهایی جایگزین بررسی محلی Mother Two نیست.
- تا دریافت snapshot/manifest واقعی workspace محلی، هیچ merge یا port کردن تغییرات منو/داک مجاز نیست.


## 10. شاخه کاری تلفیق runtime و اسناد — 2026-11-08
- شاخه remote کاری `integration/mavis-runtime-reconciliation-20261108` از `feature/mavis-seo-integration-validation` ساخته شد تا runtime و اصلاحات فنی موجود MAVIS/SEO در یک محل بررسی شوند.
- اسناد مادر نسخه ۱.۱، گزارش ممیزی، پروتکل Termux، پژوهش رسمی APIها، مشخصات UX و برنامه اتصال دانش/بکاپ به این شاخه منتقل شدند.
- این شاخه صرفاً baseline بررسی و آماده‌سازی است؛ هنوز با workspace محلی Mother Two مقایسه نشده، هیچ فایل runtime در آن تغییر نکرده و هیچ migration یا deploy انجام نشده است.
- این شاخه نسبت به main تاریخچه گسترده feature/SEO را به ارث می‌برد؛ به همین دلیل merge مستقیم آن به main مجاز نیست.
- قبل از هر کدنویسی runtime، باید snapshot واقعی workspace محلی، branch/HEAD/status و فایل‌های untracked/modified با این شاخه و شاخه official-face مقایسه شود. ظاهر تأییدشده محلی بر هر نسخه remote مقدم است.
