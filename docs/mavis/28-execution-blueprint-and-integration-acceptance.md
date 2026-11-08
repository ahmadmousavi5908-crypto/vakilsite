# 28 — نقشه اجرایی یکپارچه MAVIS، ماتریس اتصال‌ها و معیارهای پذیرش
تاریخ: 2026-11-08
وضعیت: طراحی اجرایی؛ فاقد مجوز اجرای migration، اتصال حساب‌ها یا انتشار عمومی

## 1. هدف و مرز این سند
این سند، اسناد 22 تا 27 را به یک برنامه قابل اجرا تبدیل می‌کند. هدف، آماده‌سازی یک بسته واحد برای تطبیق با Mother Two و اجرای کنترل‌شده در Termux است؛ نه تغییر فوری runtime.

ترتیب مرجع:
1. تثبیت baseline محلی و remote؛
2. بازیابی و تطبیق دانش و فایل‌ها؛
3. آماده‌سازی قراردادها، تست‌ها و artifact؛
4. اجرای آزمایشی در کپی مستقل؛
5. تأیید مالک؛
6. اجرای یک‌باره در Termux؛
7. پذیرش staging و سپس تصمیم مستقل درباره production.

این سند وضعیت هیچ قابلیت را از designed به implemented/tested/accepted/deployed ارتقا نمی‌دهد.

## 2. معماری مقصد
الگوی منتخب Modular Monolith با مرزهای دامنه و Ports & Adapters است. ماژول‌ها مستقل از یکدیگر قرارداد دارند، ولی تا اثبات نیاز عملیاتی به microservice تبدیل نمی‌شوند.

### 2.1 لایه‌ها
- Presentation: صفحات پنل MAVIS با route و CSS ماژولار مستقل؛ هیچ selector عمومی یا تغییر در ظاهر سایت عمومی.
- Application: use caseها، policy checks، workflowها و approval gates.
- Domain: مدل مقاله، منبع پژوهش، اجرای تحلیل، فرم intake، وضعیت انتشار و رویداد ممیزی.
- Ports: قراردادهای Search Console، Google Ads، Trends، Bing، IndexNow، Supabase و Legal Knowledge.
- Adapters: پیاده‌سازی مجزا برای هر provider؛ قابلیت خاموش‌کردن مستقل و حالت unavailable.
- Persistence: PostgreSQL برای metadata و وضعیت؛ Storage برای فایل مجاز؛ registry و legal-library موجود به‌عنوان مرجع دانش.
- Jobs: صف پردازش افزایشی، idempotent، checkpointدار و قابل resume.

### 2.2 مرزهای قطعی
- Public legal assistant فقط دانش عمومی تأییدشده (Scope A).
- پنل داخلی مدیر، دانش عمومی و داخلی پروژه/دفتر (A+B) بر اساس مجوز.
- داده محرمانه موکل/پرونده (C) در نسخه فعلی خارج از ingestion، search، prompt و telemetry است.
- Public Intake گزارشگر پاسخ‌های صریح کاربر است و تفسیر حقوقی، تشخیص حقانیت یا پیشنهاد راهبرد پرونده انجام نمی‌دهد.
- Research Center فقط discovery، تحلیل منابع و تکمیل metadata را انجام می‌دهد؛ متن مقاله را تولید یا بازنویسی نمی‌کند.
- Google Ads و سایر اتصال‌ها در فاز نخست read-only هستند.
- هیچ انتشار، ارسال بیرونی، تغییر کمپین یا write action بدون preview و approval ثبت‌شده انجام نمی‌شود.

## 3. ماتریس اتصال‌های بیرونی
| اتصال | فاز اول | داده/عملیات مجاز | محدودیت و fallback |
|---|---|---|---|
| Google Search Console | Read-only | Search Analytics، sitemap status، URL Inspection و گزارش‌های در دسترس property | OAuth 2.0؛ quota و محدودیت داده؛ نبود دسترسی یعنی گزارش دستی/Unavailable |
| Google AI Search reporting/control | Read-only / مشاهده | ثبت وضعیت کنترل‌ها و گزارش Generative AI در صورت نمایش برای property | rollout/availability باید در حساب واقعی بررسی شود؛ عدم وجود گزارش به معنی صفر عملکرد نیست |
| Google Trends | Discovery | تحلیل روند موضوع و عبارت | API Alpha نیازمند پذیرش؛ تا آن زمان بررسی دستی/منبع مجاز و ثبت محدودیت |
| Google Ads | Read-only | campaign/ad group/keyword/report metrics و conversionهای تعریف‌شده | دسترسی وابسته به Cloud project و permissible use؛ Test/Explorer/Basic/Standard؛ هیچ mutate در فاز اول |
| Bing Webmaster REST | Read-only سپس submit کنترل‌شده | crawl، query، link و performance؛ submit URL/sitemap فقط با approval | APIهای SOAP/POX قدیمی پس از 2026-08-31 مبنا نیستند؛ OAuth توصیه‌شده، API key فقط در secret store |
| IndexNow | Submit تغییر واقعی | URLهای جدید/به‌روزشده/حذف‌شده پس از انتشار تأییدشده | 200=ارسال موفق، 202=دریافت و اعتبارسنجی key در انتظار؛ هیچ‌کدام اثبات index نیست |
| Google News | Eligibility monitoring | بررسی policy، article page، crawl و News sitemap در صورت نیاز | ثبت‌نام دستی publication شرط حضور نیست؛ نمایش/رتبه تضمین نمی‌شود |
| Supabase | Operational data | PostgreSQL، Auth، RLS، Storage و audit metadata | plan/backup/region/retention واقعی باید بررسی شود؛ database backup شامل Storage objects نیست |

### 3.1 قواعد داده
هر metric باید provider، property/account، query dimensions، بازه زمانی، timezone، زمان دریافت، زمان آخرین تازگی، واحد، تعریف metric، محدودیت quota و وضعیت completeness داشته باشد.
مقایسه Ads و Organic فقط با بازه زمانی، timezone و تعریف تبدیل سازگار انجام شود. «موکل جذب‌شده» فقط با رویداد تبدیل معتبر و کنترل کیفیت سرنخ ثبت می‌شود؛ کلیک یا فرم خام معادل موکل نیست.

### 3.2 قواعد دسترسی
- OAuth با حداقل scope لازم و refresh token سمت سرور.
- secretها در Git، client bundle، URL، log و گزارش قابل مشاهده قرار نمی‌گیرند.
- برای هر provider: connected، read-only، stale، unavailable، quota-exceeded و error وضعیت‌های مستقل وجود دارد.
- خطای provider نباید به عدد صفر یا موفقیت ساختگی تبدیل شود.
- هیچ fallback scraping خلاف شرایط سرویس یا دور زدن محدودیت دسترسی مجاز نیست.

## 4. Knowledge Gateway و بازیابی حقوقی
### 4.1 منبع واحد
- ابتدا registry و legal-library موجود inventory و hash می‌شوند.
- رکورد جدید فقط با provenance و قرارداد schema وارد registry می‌شود.
- ایجاد پایگاه موازی، کپی بی‌ردیابی یا prompt stuffing ممنوع است.
- نسخه اول retrieval با PostgreSQL full-text، فیلتر metadata، alias normalization فارسی و فیلتر scope اجرا می‌شود.
- pgvector فقط پس از benchmark مقایسه‌ای و اثبات بهبود کیفیت/latency/هزینه بررسی می‌شود.

### 4.2 قرارداد نتیجه retrieval
هر نتیجه باید شامل source_id، عنوان، ناشر، jurisdiction، URL یا مسیر فایل، تاریخ دریافت، تاریخ اعتبار/بازبینی، وضعیت review، scope، hash، بخش/ماده مرتبط و confidence/limitation باشد.
اگر منبع اولیه یافت نشد، نتیجه باید صریحاً no verified source باشد؛ مدل یا سامانه نباید استناد، ماده، رأی یا URL بسازد.
در تعارض، منبع منسوخ، تاریخ نامعلوم یا متن ناقص، نتیجه به human review ارجاع می‌شود.

### 4.3 آزمون‌های اجباری
- پاسخ با منبع معتبر و citation دقیق؛
- نبود منبع و عدم hallucination؛
- قانون اصلاح‌شده/منسوخ و تقدم نسخه معتبر؛
- تعارض دو منبع و ارجاع انسانی؛
- فیلتر Scope A در public؛
- عدم نشت B/C به public با تست منفی؛
- prompt injection در محتوای بازیابی‌شده و بی‌اثر بودن دستورهای داخل سند؛
- فارسی، نیم‌فاصله، اعداد فارسی/لاتین، alias و غلط املایی رایج.

## 5. مدل دامنه پیشنهادی
این‌ها مدل مفهومی‌اند، نه migration آماده اجرا:
- research_runs: نوع اجرا، درخواست مدیر، زمان، وضعیت، actor، provider versions و خلاصه نتیجه.
- research_sources: منبع، ناشر، URL، jurisdiction، تاریخ مشاهده، license، access scope، sensitivity و SHA-256.
- article_records: شناسه پایدار، title، slug، category، keywords، metadata، editorial/legal status، owner/reviewer و version.
- article_source_links: ارتباط مقاله و منابع، نوع استناد، بخش پشتیبان و تاریخ اعتبار.
- article_publication_events: preview، approval، publish، update، withdrawal و نتیجه هر action.
- discovery_events: sitemap، IndexNow، Bing submit، URL Inspection و وضعیت مشاهده‌شده index.
- integration_connections: provider، account/property reference، scopes، status، last_sync و secret reference غیرقابل نمایش.
- audit_events: actor، action، target، before/after hash، approval id، timestamp و outcome.
- job_runs/job_checkpoints: idempotency key، batch، cursor، retry count، error class و resume state.

هر مدل باید قبل از migration به ERD، schema contract، retention، RLS matrix، grants، indexes و test cases تبدیل شود. هیچ‌یک در این سند به دیتابیس اضافه نشده‌اند.

## 6. گردش کار مرکز پژوهش و مقالات
1. مدیر موضوع یا حوزه را درخواست می‌کند.
2. MAVIS محتوای فعلی سایت و registry را جست‌وجو می‌کند تا تکرار/هم‌پوشانی را تشخیص دهد.
3. نیت جست‌وجو، مخاطب، ارزش حقوقی، ظرفیت جذب مسئولانه موکل و اولویت بررسی می‌شود.
4. منابع رسمی اولیه و منابع علمی معتبر کشف و provenance ثبت می‌شود.
5. اصلاح، نسخ، تاریخ اجرا، رأی وحدت رویه و محدودیت دسترسی بررسی می‌شود.
6. metadata فرم موجود تکمیل می‌شود: عنوان، keyword، category، slug، headings، FAQ، meta، internal links و منابع.
7. هر داده پیشنهادی با برچسب پیشنهادی/تأییدنشده نمایش داده می‌شود.
8. مدیر/وکیل متن مقاله را خارج از تولید خودکار MAVIS تهیه یا ویرایش می‌کند.
9. بازبینی حقوقی و تحریریه، preview و approval ثبت می‌شود.
10. انتشار توسط workflow تأییدشده انجام و eventها ثبت می‌شوند.
11. sitemap، RSS، structured data و notification مجاز بررسی می‌شوند.
12. crawl/index observation در زمان‌های بعدی ثبت می‌شود؛ درخواست ارسال‌شده با index واقعی اشتباه گرفته نمی‌شود.

## 7. وضعیت‌های چرخه عمر مقاله
- discovered
- research_in_progress
- metadata_draft
- legal_review
- editorial_review
- needs_revision
- approved
- scheduled
- published
- update_review
- withdrawn
- blocked_source_conflict

وضعیت کشف‌پذیری جداست:
- not_submitted
- sitemap_included
- notification_submitted
- submission_accepted
- crawl_observed
- index_observed
- excluded_or_error
- unknown

## 8. امنیت و حریم خصوصی
- برای تمام جدول‌های exposed، RLS و grants با هم طراحی می‌شوند؛ policy به‌تنهایی جای grant را نمی‌گیرد.
- roleهای عمومی فقط دسترسی صریح به محتوای public دارند؛ B/C از schema/API عمومی خارج می‌مانند.
- service/secret key فقط سمت سرور و در مسیرهای محدود؛ هرگز در مرورگر.
- هر جدول دارای تست allow/deny برای anon و authenticated و عملیات CRUD متناسب است.
- Security Definer فقط با search_path خالی، schema qualification و review امنیتی؛ تا حد امکان از آن اجتناب شود.
- Viewهای روی داده حساس باید با security_invoker یا روش امن معادل محافظت شوند.
- audit log فاقد متن پرونده و داده حساس غیرضروری است.
- retention و deletion برای هر scope جداست؛ backup نیز رمزگذاری و دسترسی محدود دارد.
- rate limit، abuse control، CSRF، XSS، SSRF، injection، secret scanning و audit trail در معیار پذیرش هستند.

## 9. معیارهای پذیرش کلان
### امنیت
- هیچ داده B/C از مسیر عمومی قابل بازیابی نیست.
- تست RLS و grants برای هر جدول موفق است.
- هیچ secret در Git، build output، client bundle یا log وجود ندارد.
- تمام عملیات اثرگذار actor، approval و outcome دارند.

### کیفیت حقوقی
- تمام citationها به رکورد منبع واقعی متصل‌اند.
- وضعیت اعتبار و تاریخ آخرین بازبینی نمایش داده می‌شود.
- no-source، conflict و outdated به‌درستی مدیریت می‌شوند.
- هیچ ادعای قطعی حقوقی از فرم intake تولید نمی‌شود.

### تجربه کاربری
- پنل مستقل از CSS عمومی سایت است.
- RTL، موبایل، صفحه‌کلید، reduced-motion و وضعیت‌های loading/empty/error/stale پشتیبانی می‌شوند.
- جدول 400 رکورد با داده آزمایشی benchmark می‌شود؛ جست‌وجو/فیلتر/مرتب‌سازی پایدار است.
- مقاله با +/− درجا باز/بسته می‌شود و شناسه پایدار تغییر نمی‌کند.
- صفحه عمومی و ظاهر Mother Two هیچ regression بصری ندارند.

### عملیات
- jobs قابل resume و idempotent هستند.
- retry محدود و خطا قابل مشاهده است.
- publish، submit و index-observed رویدادهای مجزا هستند.
- restore از snapshot مستقل با hash و تست build در کپی اثبات شده است.

## 10. بسته نهایی Termux
فرمان نهایی تا تکمیل همه موارد زیر منتشر نمی‌شود:
- تطبیق واقعی Mother Two با SHA-256 اعلام‌شده مالک؛
- inventory و hash فایل‌های local، remote و Library؛
- مشخص‌شدن exact workspace، branch، HEAD و dirty state؛
- artifact versioned و checksum ثابت؛
- allowlist فایل‌های مجاز و hash مبنا؛
- آزمون script روی copy مستقل با Node/Git سازگار؛
- تست تکرارپذیری، dirty tree، checksum اشتباه، mismatch فایل و rollback؛
- گزارش صریح وابستگی‌های نیازمند حساب/دسترسی مالک؛
- تنها یک دستور اجرا و یک گزارش نهایی.

اسکریپت باید در هر mismatch توقف کند؛ هیچ reset، clean، force-push، حذف یا overwrite بی‌قیدوشرط انجام ندهد. بکاپ Mother Two اصلی و نسخه به‌روزشده فقط خواندنی و immutable می‌مانند.

## 11. منابع رسمی بررسی‌شده در 2026-11-08
- Google Search AI features: https://developers.google.com/search/docs/appearance/ai-features
- Google Article structured data: https://developers.google.com/search/docs/appearance/structured-data/article
- Search Console API: https://developers.google.com/webmaster-tools/v1/api_reference_index
- Search Console OAuth: https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- Search Console quota: https://developers.google.com/webmaster-tools/limits
- Google Ads access levels: https://developers.google.com/google-ads/api/docs/api-policy/access-levels
- Google Ads developer-token transition: https://developers.google.com/google-ads/api/docs/api-policy/developer-token
- Google Trends API Alpha: https://developers.google.com/search/apis/trends
- Bing Webmaster REST/API: https://learn.microsoft.com/en-us/bingwebmaster/
- Bing Webmaster access: https://learn.microsoft.com/en-us/bingwebmaster/getting-access
- IndexNow: https://www.indexnow.org/documentation
- Google News policies: https://support.google.com/news/publisher-center/answer/6204050
- Google News discovery: https://support.google.com/news/publisher-center/answer/9606634
- Supabase backups: https://supabase.com/docs/guides/platform/backups
- Supabase RLS and grants: https://supabase.com/docs/guides/database/postgres/row-level-security

## 12. وضعیت و محدودیت
این سند طراحی اجرایی است. هیچ API متصل، credential ساخته، Supabase migration اعمال، مقاله منتشر یا سایت deploy نشده است. دسترسی و وضعیت واقعی حساب‌های Google، Bing، Supabase و فایل‌سیستم Termux باید در محیط مالک بررسی شود.


## 13. شکاف‌های اجرایی و اولویت‌بندی مبتنی بر شواهد
این فهرست از ممیزی remote و اسناد موجود استخراج شده است. موارد مربوط به Termux، Supabase و حساب‌های سرویس تا بررسی محیط مالک، نامعلوم باقی می‌مانند.

| اولویت | شکاف | شواهد فعلی | اقدام لازم | مانع پذیرش |
|---|---|---|---|---|
| P0 | تطبیق Mother Two با workspace و Git | گزارش مالک وجود دارد؛ filesystem محلی در دسترس نیست | بررسی hash آرشیو، manifest، Git state و مسیر پورت 3002 در Termux | هر mismatch یا dirty state ناشناخته |
| P0 | بازیابی registry و inventory دانش | آمار تاریخی 32 سند، 11 dataset و 47 ref گزارش شده؛ فایل/hash واقعی هنوز کامل دریافت نشده | استخراج inventory از Mother Two، Library و branchها و تطبیق SHA-256 | سند یا dataset بدون provenance/hash |
| P0 | امنیت داده و مجوز | مستندات موجود؛ وضعیت واقعی Supabase/RLS/grants نامعلوم | ممیزی schema، grants، policies، storage و auth؛ تست مثبت/منفی | هر دسترسی ناخواسته به B/C |
| P1 | اتصال واقعی legal retrieval | public-chat در شاخه بررسی‌شده فقط پیام/history را به provider می‌دهد؛ retrieval/citation مشاهده نشده | طراحی adapter فقط‌خواندنی از legal-library/registry و تست citation | citation ساختگی، منبع منقضی یا نشت Scope |
| P1 | Provider زنده | mock/disabled-by-default در ممیزی قبلی ثبت شده؛ وضعیت شاخه باید دوباره pin شود | تصمیم مستقل درباره provider، هزینه، privacy، retention و secret | فعال‌سازی بدون تأیید و ارزیابی حریم خصوصی |
| P1 | فرم جامع پذیرش | PublicIntake فعلی سه‌مرحله‌ای و محدود است | طراحی فرم شرطی جامع مطابق سند مادر؛ حفظ همه پرسش‌های لازم | تحلیل حقوقی پاسخ یا حذف پرسش‌های لازم |
| P1 | راهنمای ثابت intake | متن guidance در فرم فعلی ممکن است از گزارش صرف پاسخ‌ها فراتر رود | بازبینی حقوقی؛ تفکیک پیام ایمنی عمومی از توصیه مختص پرونده | توصیه قطعی یا ایجاد انتظار حقوقی نادرست |
| P1 | مدل عملیاتی MAVIS | migrationهای MAVIS در ممیزی شاخه‌های بررسی‌شده مشاهده نشد | طراحی ERD، migration، RLS، grants و pgTAP در شاخه مستقل | اعمال مستقیم به Supabase production |
| P2 | اتصال‌های Search/Ads/Bing | دسترسی حساب و credential نامعلوم | OAuth/API access در محیط مالک، ابتدا read-only | فرض اتصال بدون احراز واقعی |
| P2 | چرخه انتشار/کشف | برخی ابزارهای SEO/IndexNow در branchهای دیگر وجود دارند؛ baseline محلی نامعلوم | ممیزی مجدد sitemap/RSS/Article/IndexNow و ساخت event ledger | یکی دانستن submit و index |
| P2 | UX پنل 400 مقاله | سند طراحی موجود، UI اجرایی تأیید نشده | prototype مستقل و benchmark با 400 رکورد | تغییر ظاهر عمومی یا افت عملکرد |

### 13.1 تصمیم درباره guidance فرم پذیرش
نسخه فعلی PublicIntake دارای پیام‌های ثابت موضوعی است. چون سند مادر، intake را «گزارشگر پاسخ» تعریف کرده، هر متن راهنما باید در سه دسته بازبینی شود:
1. اطلاع ایمنی/فرآیندی عمومی، مانند مسیر تماس انسانی در فوریت؛
2. توضیح اینکه چه اطلاعاتی برای هماهنگی اولیه لازم است؛
3. توصیه حقوقی یا راهبردی مرتبط با پرونده که خارج از دامنه این فرم است.

دسته سوم باید حذف یا به پیام خنثیِ ارجاع به وکیل تبدیل شود. متن آزاد مراجعه‌کننده نباید توسط سیستم به تشخیص، مهلت، احتمال موفقیت یا راهکار تبدیل شود.

### 13.2 ترتیب اجرا پس از دریافت خروجی Termux
1. فقط تطبیق و inventory؛ هیچ کد runtime تغییر نکند.
2. تعیین source of truth برای registry و مقالات موجود.
3. تکمیل threat model و authorization matrix.
4. طراحی ERD و migration روی کپی/branch مستقل؛ اجرای DB فقط پس از approval.
5. پیاده‌سازی Knowledge Gateway read-only و تست‌های منبع/مجوز.
6. تکمیل Article Research Center و approval workflow.
7. تکمیل Intake و بازبینی guidance.
8. اتصالات read-only به Search Console، Bing و Ads؛ Trends فقط در صورت پذیرش Alpha.
9. publication discovery ledger و کنترل‌های مجاز.
10. UX پنل و تست رگرسیون بصری.
11. پذیرش staging و تصمیم مستقل درباره production.

هیچ مرحله‌ای صرفاً با commit شدن کد پذیرفته نمی‌شود.
