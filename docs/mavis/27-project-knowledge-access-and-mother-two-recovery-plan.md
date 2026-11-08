# 27 — نقشه جامع دسترسی MAVIS به دانش پروژه و بازیابی بکاپ مادر دو
تاریخ: 2026-11-08
وضعیت: طراحی و ممیزی اولیه؛ اتصال runtime و بکاپ محلی هنوز انجام نشده است.

## 1. هدف و اصل حاکم
MAVIS باید بتواند از دانش تأییدشده و سوابق قابل استفاده پروژه بهره ببرد: دانش حقوقی، پژوهش‌های SEO/AEO/GEO، مقالات، تصمیمات محصول، معماری، تاریخچه تغییرات، گزارش تست و دستورالعمل‌های عملیاتی. «دسترسی کامل» به معنی نمایش همه اسناد به همه کاربران نیست؛ دسترسی باید نقش‌محور، قابل ممیزی و متناسب با مخاطب باشد.

## 2. یافته‌های ممیزی
### 2.1 وضعیت شاخه runtime در GitHub
- کتابخانه حقوقی src/data/legal-library موجود است؛ نسخه اعلام‌شده 1.3.1.
- داده‌های اعلام‌شده: 132 اصطلاح canonical، 16 رکورد قانون، 22 خلاصه مقاله، 19 گروه taxonomy و 353 عبارت جست‌وجوی فارسی.
- فایل‌های داده شامل terms، laws، articles، taxonomy، relations، schema، source-review، manifest و validator هستند.
- src/lib/mavis/public-chat.mjs فقط پیام و تاریخچه محدود را به provider می‌دهد؛ اتصال retrieval به legal-library در آن مشاهده نشد.
- provider فعلی mock است و پاسخ آن صریحاً اعلام می‌کند مدل واقعی متصل نیست.
- MAVIS_PUBLIC_ENABLED پیش‌فرض خاموش است.
- تست‌های موجود قرارداد ورودی، محدودیت history، disabled-by-default، خطا و mock provider را پوشش می‌دهند؛ کیفیت retrieval یا citation را پوشش نمی‌دهند.
- PublicIntake.jsx فرم سه‌مرحله‌ای موضوع/مرحله/فوریت/شهر/شرح و خلاصه قابل ارسال دارد؛ این فرم معادل پذیرش جامع و شرطی نهایی نیست.
- MavisDock.jsx در این شاخه از portrait SVG داخلی استفاده می‌کند. تصویر رسمی سه‌بعدی کاراکتر در Library موجود است و باید پس از تطبیق بصری با Mother Two به‌صورت derivative بهینه شود، نه با بازطراحی.
- migrations مشاهده‌شده Supabase فقط پروفایل/نقش admin و social links/office settings را پوشش می‌دهند؛ schema عملیاتی MAVIS، article research یا knowledge retrieval در این مجموعه migrations مشاهده نشد.
- مسیرهای docs/knowledge/README.md و docs/knowledge/manifest.json در tree شاخه‌های GitHub بررسی‌شده پیدا نشدند.

### 2.2 دانش ثبت‌شده در سابقه محلی
طبق گزارش‌های قبلی، workspace محلی دارای central knowledge registry با 32 سند پژوهشی، 11 مجموعه داده، 4 سطح/مسیر runtime و 47 ارجاع بوده است. این اعداد گزارش تاریخی‌اند و هنوز با filesystem فعلی و manifest قابل مشاهده در این نشست تطبیق نشده‌اند.
- مسیر گزارش‌شده registry: docs/knowledge/README.md و docs/knowledge/manifest.json.
- مسیر گزارش‌شده workspace: ~/downloads/vakilsite-menu-review-20261105.
- وجود registry در سابقه چت به معنی وجود آن در GitHub remote یا archive قابل دسترسی این نشست نیست.
- هیچ‌یک از 32 سند نباید بر اساس نام یا خلاصه حدس زده یا جایگزین شود؛ فایل واقعی، hash و مجوز آن باید دریافت شود.

### 2.3 دارایی رسمی MAVIS
Library شامل MAVIS-OFFICIAL-FACE.png با شناسه MAVIS-OFFICIAL-FACE-20261105-041609، ابعاد 1122×1402 و SHA-256 ثبت‌شده f678e4c1dd0fca2441ad5f76fc10c82ccadb44d22a13260d9ae22a88e2561855 است. فایل master immutable بماند. هر crop/resize/WebP derivative باید فایل جداگانه و با manifest باشد. وجود asset در Library به معنی commit یا deployment نیست.

## 3. سه سطح دانش و مجوز
### A — دانش عمومی حقوقی
فقط محتوای مجاز برای نمایش عمومی، منابع رسمی/علمی قابل انتشار، نسخه‌های بررسی‌شده کتابخانه حقوقی و metadata عمومی مقالات منتشرشده. پاسخ عمومی MAVIS فقط از این scope استفاده می‌کند و باید citation واقعی، تاریخ اعتبار، حوزه قضایی و وضعیت بررسی را نشان دهد.

### B — دانش داخلی پروژه و دفتر
اسناد معماری، roadmap، تصمیمات، changelog، مستندات API، پژوهش SEO و Ads، گزارش CI، بکاپ‌ها، runbookها و مقالات در حال تدوین. فقط برای مدیر/کاربر دارای نقش مجاز در پنل؛ هر query با server-side authorization و RLS/permission filter. این اسناد هرگز از public-chat قابل بازیابی نیستند. ارسال به provider خارجی فقط برای عملیات مشخص، با مجوز، redaction و audit مجاز است.

### C — داده محرمانه و پرونده‌ای
اطلاعات موکل، طرف مقابل، پرونده، مدارک هویتی، اسناد و مکاتبات. در فاز فعلی خارج از retrieval عمومی و ingestion عمومی MAVIS است. تا تصویب سیاست مستقل، ارزیابی خطر، مبنای قانونی، consent، encryption، retention/deletion، جداسازی tenant و دسترسی موردی، هیچ اتصال پرونده‌ای ایجاد نشود. این داده هرگز وارد SEO/Ads یا analytics عمومی نشود.

## 4. معماری منتخب: reuse-first
Modular Monolith با یک Knowledge Gateway و adapterهای read-only؛ نه دانشنامه موازی و نه microservice زودهنگام.
1. Registry موجود inventory و provenance هر منبع را نگه می‌دارد.
2. Ingestion فقط فایل‌های manifest شده را با hash و schema validation می‌پذیرد.
3. canonical legal-library به‌عنوان منبع حقوقی ساختاریافته حفظ می‌شود.
4. Gateway درخواست را بر اساس actor، role، scope و sensitivity فیلتر می‌کند.
5. Retriever نسخه اول از PostgreSQL full-text search و تطبیق قطعی فارسی/alias/metadata استفاده می‌کند.
6. هر نتیجه source_id، source_version، file_hash، jurisdiction، valid_from/valid_to، review_status و source_url دارد.
7. پاسخ‌ساز فقط context مجاز و citation واقعی دریافت می‌کند.
8. Audit log فقط metadata لازم را ثبت می‌کند؛ متن محرمانه خام در log ذخیره نمی‌شود.

مسیر ۱: PostgreSQL full-text + metadata filters + alias normalization؛ انتخاب فعلی به دلیل هزینه کمتر، توضیح‌پذیری، قابلیت تست و سازگاری با داده ساختاریافته.
مسیر ۲: embeddings/pgvector/hybrid retrieval؛ فعلاً deferred و فقط پس از benchmark مسیر ۱ با داده غیرمحرمانه و هزینه‌سنجی بررسی شود.
این ingestion وابسته به API مدل زبانی نیست و MAVIS متن مقاله را تولید یا بازنویسی نمی‌کند.

## 5. قرارداد حداقلی هر منبع
هر منبع باید دارای source_id پایدار، source_type، title، language، jurisdiction، publisher، source_url، local_path یا storage key، sha256، byte_size، mime_type، version، created_at، retrieved_at، reviewed_at، valid_from، valid_to، review_status، access_scope، sensitivity، license_status و روابط supersedes/related باشد.
Manifest و metadata جای بایت اصلی منبع را نمی‌گیرند. وجود URL به‌تنهایی منبع را verified نمی‌کند.

## 6. خط لوله ingest افزایشی و قابل ادامه
Discover → Inventory → Classify → Deduplicate → Validate → Normalize → Index → Review → Publish-to-scope → Reconcile → Checkpoint → Audit.
- کشف منابع در Mother Two، شاخه‌های GitHub، Library و backup manifests.
- ثبت مسیر، نوع، اندازه، hash، origin، version و access.
- تعیین scope A/B/C و مجوز استفاده/انتشار.
- deduplicate با SHA-256؛ نسخه‌های مشابه حذف نشوند و رابطه نسخه ثبت شود.
- parse/schema، encoding فارسی، لینک‌ها، تاریخ‌ها و cross-reference اعتبارسنجی شوند.
- اصل فایل تغییر نکند؛ هر derivative جداگانه hash شود.
- فقط A در index عمومی، B در index داخلی و C خارج از index تا تصویب مستقل.
- checkpoint شامل cursor، batch_id، hash و نتیجه هر batch باشد تا اجرا قابل resume و idempotent باشد.
- گزارش missing/duplicate/conflict و audit trail اجباری است.

## 7. بکاپ مادر دو: وضعیت و نسخه بعدی
### مراجع تاریخی
- Mother Two updated: VAKILSITE-MOTHER-TWO-UPDATED-20261106.
- snapshot افزوده‌شده دانش: VAKILSITE-MOTHER-TWO-PLUS-KNOWLEDGE-20261106-193055.
- مسیر گزارش‌شده: ~/downloads/vakilsite-backups/vakilsite-mother-two-plus-knowledge-20261106-193055-full.tar.gz.
- SHA-256 گزارش‌شده: 7bbb42656ba7f48a9e7579a89581b12a5ef3230ac258e374cca40f285a6b0cb1.
- گزارش تاریخی: 135 فایل، 707,412 بایت، 4 مورد exclusion؛ gzip/hash/extraction test موفق.
- همان گزارش صریحاً می‌گوید این snapshot فقط workspace فعلی را پوشش می‌دهد؛ کامل بودن نسبت به Mother One/1.1، تمام شاخه‌های GitHub، فایل‌های حذف‌شده و همه داده‌های محلی اثبات نشده است. پس بکاپ کامل تمام تاریخچه پروژه نیست.
- آرشیو اصلی Mother Two هرگز overwrite، rename یا حذف نشود.

### ساختار snapshot بعدی
شناسه مستقل پیشنهادی: VAKILSITE-MOTHER-TWO-PLUS-MAVIS-YYYYMMDD-HHMMSS.
- آرشیو محلی workspace شامل tracked، modified و untracked با سیاست محرمانگی صریح.
- GitHub-safe archive فقط فایل‌های مجاز؛ بدون secrets، credentials، database dump، client data یا فایل حساس.
- manifest.json برای هر فایل: relative_path، size، sha256، file_type، origin، sensitivity، inclusion_status، exclusion_reason.
- git-state.json: repo، branch، head، remotes، status، untracked، modified، staged و diff stat.
- backup-summary.md: backup id، زمان/timezone، منبع، نسخه ابزار، exclusions، آزمون‌ها و راهنمای restore.
- archive.sha256 و manifest.sha256.
- snapshot مستقل branch/commit/tagهای مهم؛ جدا از آرشیو workspace محلی.
- 32 سند پژوهشی و 11 dataset فقط پس از کشف فایل واقعی و تطبیق hash ثبت شوند؛ این اعداد فعلاً expected count تاریخی‌اند.

### دروازه‌های پذیرش
Archive integrity، استخراج به مسیر مستقل، exact inventory comparison، per-file SHA-256، بررسی Git state و فایل‌های untracked، بازیابی lockfiles/docs، تست build در کپی مستقل، گزارش تفاوت‌ها و rollback.
تا اجرای آزمون‌ها، وضعیت فقط created یا integrity-checked است؛ نه restore-verified.

## 8. اتصال دانش به مأموریت‌ها
- Public Intake: استفاده از راهنماها و چک‌لیست‌های عمومی از پیش تأییدشده؛ بدون تحلیل پاسخ کاربر.
- Public Legal Assistant: فقط scope A و citation واقعی.
- Admin Research Center: scope A+B طبق role؛ پژوهش و تکمیل metadata، بدون تولید متن مقاله.
- SEO/Growth: scope B برای تصمیمات داخلی و داده مجاز Analytics/Ads؛ پرونده‌های C ممنوع.
- Admin Copilot: جست‌وجوی تصمیمات و گزارش تست با citation به سند/commit؛ فقط مدیر.
- همه ماژول‌ها از Gateway مشترک استفاده کنند؛ index یا دیتابیس موازی نسازند.

## 9. دروازه‌های پیاده‌سازی
- دریافت registry محلی و 32 سند/11 dataset با manifest/checksum واقعی.
- مقایسه با شاخه‌های مهم GitHub و Library assets و ثبت provenance.
- inventory اسناد MAVIS، SEO، legal-library، مقالات، test reports، migrations و backups.
- ممیزی auth، RLS، grants/revokes و Storage policies در Supabase واقعی.
- قرارداد و threat model نهایی Gateway.
- deterministic retrieval adapter در branch مستقل، بدون تغییر UI.
- تست authorization مثبت/منفی و عدم نشت B/C به public.
- تست citation، versioning، منابع منقضی/نسخ‌شده، تعارض، no-result و prompt injection.
- benchmark کیفیت و latency با پرسش‌های فارسی.
- اتصال public chat فقط به scope A؛ پنل داخلی به A/B طبق مجوز.
- تست build/lint/regression و تطبیق بصری با Mother Two.
- backup جدید با manifest/checksum و restore test؛ Mother Two قبلی محفوظ.

## 10. محدودیت دسترسی این نشست
GitHub remote و ChatGPT Library قابل بررسی‌اند؛ filesystem خصوصی Termux، فایل‌های محلی Mother Two و پروژه واقعی Supabase در این نشست قابل خواندن مستقیم نیستند. بنابراین انتقال 32 سند، تأیید backup جدید یا تست Termux ادعا نمی‌شود. بسته نهایی Termux باید این بررسی‌ها را با یک فرمان idempotent انجام دهد و در mismatch متوقف شود.

## 11. منابع رسمی فنی
- Google Search generative AI control: https://support.google.com/webmasters/answer/16908024
- Google generative AI performance report: https://support.google.com/webmasters/answer/16984139
- Google Search AI optimization guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Search Console API: https://developers.google.com/webmaster-tools/v1/api_reference_index
- Bing Webmaster API: https://learn.microsoft.com/en-us/bingwebmaster/
- IndexNow: https://www.indexnow.org/documentation
- Supabase database backups: https://supabase.com/docs/guides/platform/backups
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase pgvector: https://supabase.com/docs/guides/ai/vector-columns

## 12. نتیجه
MAVIS باید همه دانش لازم را از مسیرهای واقعی و قابل ممیزی دریافت کند، نه با کپی بی‌قید فایل‌ها به prompt یا دسترسی عمومی. اصل حاکم: یک registry، یک gateway، سه سطح محرمانگی، retrieval قابل استناد و بکاپ نسخه‌بندی‌شده با restore evidence.
