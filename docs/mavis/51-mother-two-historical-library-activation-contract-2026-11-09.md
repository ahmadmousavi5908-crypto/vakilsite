# 51 — قرارداد نهایی دسترسی MAVIS به دانش تاریخی، کتابخانه‌ها و محتوای Mother Two

**تاریخ:** 2026-11-09  
**وضعیت:** الزام محصول و طراحی اجرایی؛ پیاده‌سازی runtime و ممیزی محلی باید جداگانه اثبات شود.  
**دامنه:** تمام بازوهای MAVIS، کتابخانه حقوقی موجود، مقالات و کتاب‌ها، پژوهش‌های تاریخی، مجموعه‌داده‌ها، اسناد و منابعی که در Mother Two و نسخه‌های پیشین پروژه نگهداری می‌شوند.

## 1. تصمیم مالک محصول

MAVIS باید بتواند از دانش تاریخی و فعلی پروژه استفاده کند؛ نه فقط از داده‌هایی که در جریان توسعه جدید تولید می‌شوند. هر دارایی واجد شرایط در Mother Two، workspace، شاخه‌ها و بسته‌های پژوهشی قبلی باید در ممیزی کشف شود و پس از احراز منشأ، سلامت، مجوز، طبقه‌بندی دسترسی و وضعیت اعتبار، از طریق Knowledge Gateway قابل بازیابی شود.

**هیچ کتابخانه یا مجموعه‌داده موازی ساخته نمی‌شود.** منابع موجود و registryهای فعلی canonical باقی می‌مانند؛ فقط mapping، metadata و index لازم به آن‌ها افزوده می‌شود.

## 2. محدوده دارایی‌هایی که باید کشف و بررسی شوند

ممیزی باید حداقل تمام این دسته‌ها را پوشش دهد:

1. کتابخانه حقوقی فعلی Vakilsite در `src/data/legal-library/` و منطق آن در `src/lib/legal-library.js`.
2. قوانین، مقررات، آیین‌نامه‌ها، اصلاحیه‌ها، نسخ، آرای وحدت رویه، آرای قضایی منتشرشده، آرای دیوان عدالت اداری، نظریات مشورتی و راهنماهای رسمی.
3. کتاب‌ها، فصل‌ها، فهرست مطالب، یادداشت‌های کتاب‌شناختی، فایل‌های PDF و متن‌های استخراج‌شده؛ با رعایت حق نشر و مجوز استفاده.
4. مقالات علمی، مقالات حقوقی منتشرشده، چکیده‌ها، یادداشت‌های پژوهشی، منابع و ارجاعات، نسخه‌های نویسنده و اطلاعات ناشر.
5. مجموعه‌داده‌ها، taxonomyها، واژه‌نامه‌ها، اصطلاحات حقوقی، مترادف‌ها، کلیدواژه‌ها و داده‌های ساختاریافته JSON/JSONL/CSV.
6. اسناد پژوهشی تاریخی MAVIS و SEO، گزارش‌های فنی، تحلیل‌های بازار/جست‌وجو، تصمیمات معماری و راهنماهای عملیاتی.
7. محتوای موجود سایت، مقالات منتشرشده، FAQها، خدمات، صفحات راهنما و داده‌های ساختاریافته واقعی.
8. manifestها، source registryها، inventoryها، indexهای موجود و خروجی‌های پردازش قبلی.
9. دارایی‌های مجاز موجود در Git refs، tagها، releaseها، بسته‌های MAVIS و آرشیوهای مادر قبلی.
10. داده‌های Supabase و Storage فقط پس از شناسایی schema، مالکیت، RLS/grants و مجوز دسترسی؛ وجود فایل در backup به معنی مجاز بودن استفاده عمومی نیست.

### شواهد تاریخی که باید مبنای جست‌وجو باشند

- نسخه تأییدشده اولیه Mother Two: شناسه `VAKILSITE-MOTHER-TWO-20261105`؛ آرشیو محلی گزارش‌شده با 154 فایل و 5 فایل MAVIS.
- نسخه به‌روزشده گزارش‌شده در 2026-11-06: `VAKILSITE-MOTHER-TWO-UPDATED-20261106-220500-payload.tar.gz`؛ 214,876 ورودی شامل 190,182 فایل، 24,501 پوشه و 193 symlink؛ حدود 5.84 GiB داده خام.
- گزارش تاریخی از 32 سند پژوهشی، 11 مجموعه‌داده و 47 ارجاع و انتقال 32 فایل Markdown (9 SEO و 23 MAVIS) وجود دارد. این اعداد سرنخ ممیزی‌اند، نه موجودی قطعی تا زمان تطبیق فایل‌به‌فایل و hash.
- گزارش قبلی از مسیرهای `docs/knowledge/README.md` و `docs/knowledge/manifest.json` نام برده است؛ وجود و محتوای آن‌ها باید در workspace و Git refs بررسی شود.

آرشیوهای مادر و فایل‌های مرجع هرگز overwrite، rename، extract-in-place یا به runtime متصل نمی‌شوند. آرشیو فقط منبع بازیابی/ممیزی است؛ MAVIS از فایل‌های مستقل تأییدشده و registry فعال استفاده می‌کند.

## 3. طبقه‌بندی امنیتی و دسترسی

هر منبع پیش از ثبت در registry باید یکی از کلاس‌های زیر را داشته باشد:

- `public`: منبع عمومی و مجاز برای پاسخ عمومی، با رعایت مجوز محتوا.
- `internal`: دانش داخلی دفتر/پروژه؛ فقط نقش‌های داخلی مجاز و بر اساس purpose.
- `confidential`: اطلاعات محرمانه موکل، پرونده یا ارتباطات؛ فقط با مجوز پرونده و نقش مشخص، و خارج از Public و Growth.
- `restricted_secret`: گذرواژه‌ها، API keys، access tokens، private keys، recovery codes، کوکی نشست، credential فایل‌ها و اسرار زیرساخت.

**ممنوعیت مطلق:** مقادیر `restricted_secret` نباید به corpus، prompt، embedding، متن قابل جست‌وجو، log، citation، export یا context هیچ بازوی MAVIS وارد شوند. اگر در backup کشف شدند، فقط وجود/مسیر/هش امن و وضعیت quarantine آن‌ها در گزارش محرمانه ثبت شود؛ مقدار secret هرگز چاپ یا کپی نشود. MAVIS نباید «به گذرواژه‌ها دسترسی دانشی» داشته باشد. اگر یک integration به credential نیاز دارد، باید از secret manager یا محیط امن runtime با دسترسی حداقلی استفاده کند و فقط عملیات از پیش مجاز را انجام دهد؛ مقدار credential به مدل نمایش داده نمی‌شود.

## 4. ماتریس دسترسی سه بازو

| منبع | Public Intake | Lawyer Copilot | Growth Intelligence |
|---|---|---|---|
| قوانین/منابع رسمی عمومی تأییدشده | خلاصه‌های عمومی تأییدشده و محدود | بله، با provenance و تاریخ اعتبار | فقط metadata عمومی در صورت نیاز |
| مقالات و کتاب‌های مجاز | محتوای عمومی/خلاصه تأییدشده | بله، طبق مجوز و سطح دسترسی | بله، برای ممیزی و برنامه‌ریزی محتوا |
| مقالات منتشرشده سایت | محتوای عمومی | بله، به‌عنوان محتوای ثانویه | بله، برای تحلیل محتوا |
| پژوهش‌های داخلی و اسناد فنی | خیر | فقط در purpose مجاز و بدون اختلاط با قانون | فقط اسناد SEO/رشد مجاز |
| اطلاعات داخلی دفتر | خیر | فقط نقش و purpose مجاز | خیر |
| پرونده و اسناد موکل | خیر | فقط دسترسی پرونده‌محور پس از تصویب امنیتی مستقل | خیر |
| گذرواژه و secret | هرگز | هرگز در context مدل | هرگز |

کنترل مجوز باید پیش از retrieval و در سطح API/داده اعمال شود؛ prompt به‌تنهایی مرز امنیتی نیست. هیچ بازو نباید صرفاً با داشتن شناسه رکورد، مجوز دسترسی پیدا کند.

## 5. جریان استاندارد تبدیل دارایی تاریخی به دانش قابل استفاده

`Discover → Inventory → Hash → Classify → Deduplicate → Parse → Normalize → Review → Register → Index → Retrieve → Monitor`

1. **Discover:** جست‌وجوی read-only در workspace، Mother Two، بسته‌های تاریخی، Git refs و منابع مجاز.
2. **Inventory:** ثبت مسیر، اندازه، نوع فایل، encoding، تاریخ، مالک/منبع، طبقه‌بندی و archive/commit مبدأ.
3. **Hash:** محاسبه SHA-256 برای فایل اصلی و مشتقات؛ نگهداری زنجیره lineage.
4. **Classify:** تعیین public/internal/confidential/restricted_secret، حقوق نشر و purpose مجاز.
5. **Deduplicate:** تشخیص یکسانی بایت‌به‌بایت و شباهت محتوایی؛ تعارض‌ها حفظ و برای تصمیم انسانی صف‌بندی شوند.
6. **Parse:** استخراج متن از PDF/DOCX/HTML/Markdown/JSON/JSONL/CSV با حفظ صفحه، heading، ماده، بند، جدول و محل دقیق.
7. **Normalize:** ایجاد رکورد canonical و اتصال مشتقات به اصل فایل؛ هیچ نسخه تاریخی overwrite نشود.
8. **Review:** بازبینی کیفیت OCR، منشأ، مجوز، تاریخ اعتبار، اعتبار حقوقی و completeness.
9. **Register:** ثبت در registry موجود یا mapping به آن؛ نه ساخت corpus دوم.
10. **Index:** نمایه‌سازی فقط محتوای مجاز و تأییدشده با نسخه parser/schema مشخص.
11. **Retrieve:** جست‌وجو با فیلتر role، purpose، access class، source type، jurisdiction، date و status.
12. **Monitor:** ثبت نسخه، hash، خطا، freshness، زمان sync، وضعیت index و تعداد استفاده.

وضعیت دانش:
- **L0 Downloaded:** فایل سالم و hashدار؛ فقط staging.
- **L1 Parsed/Registered:** متن و metadata استخراج و ثبت شده؛ فقط بازبینی داخلی.
- **L2 Approved/Searchable:** مجوز، provenance و review روشن، index فعال و retrieval tests موفق.
فقط رکوردهای L2 با policy مناسب اجازه ورود به پاسخ را دارند. برای محتوای ثانویه یا کتاب دارای حق نشر، فقط دامنه استفاده مجاز اعمال می‌شود.

## 6. قرارداد canonical رکورد

حداقل فیلدها:
- `record_id`, `source_id`, `canonical_id`, `parent_artifact_id`
- `title`, `document_type`, `topic_tags`, `language`, `jurisdiction`
- `publisher/issuer`, `author`, `publication_id`, `edition`, `page_range`
- `source_uri`, `origin_archive_or_commit`, `retrieved_at`
- `content_hash`, `derived_hash`, `parser_version`, `schema_version`
- `access_class`, `allowed_purposes`, `license_status`, `retention_class`
- `review_status`, `reviewer_id`, `reviewed_at`, `review_notes`
- برای قانون: `document_number`, `publication_date`, `effective_from`, `effective_to`, `amends`, `repeals`, `legal_status`, `official_source_verified_at`.
- برای مقاله/کتاب: `publication_type`, `publisher`, `isbn_or_doi`, `copyright_basis`, `abstract`, `citation`, `permitted_use`.

فیلد مجهول باید null/unknown بماند. اطلاعات ساختگی، citation حدسی و تبدیل منبع ثانویه به منبع رسمی ممنوع است.

## 7. معماری retrieval و انتخاب فناوری

- مرحله اول از کد جست‌وجوی قطعی فارسی و PostgreSQL Full-Text Search/metadata filtering روی corpus موجود استفاده کند.
- فایل اصلی حجیم در Storage خصوصی یا workspace امن بماند؛ metadata و متن استخراج‌شده قابل query باشند.
- retrieval فقط از طریق Knowledge Gateway server-side و API نسخه‌دار باشد.
- citation باید به record، source artifact و صفحه/ماده/بند دقیق بازگردد.
- vector/embedding فقط زمانی افزوده شود که benchmark روی داده واقعی، بهبود معنادار recall/precision را در برابر هزینه، latency، امنیت و نگهداری اثبات کند.
- cache بین نقش‌ها/کاربران مشترک نباشد؛ cache عمومی فقط برای رکورد public و غیرحساس مجاز است.
- timeout، سقف نتایج، سقف متن، rate limit، هزینه، retry محدود و fail-closed تعریف شود.
- اسناد بازیابی‌شده داده غیرقابل‌اعتمادند؛ دستور داخل PDF/مقاله/صفحه وب نباید policy یا ابزار را تغییر دهد.

## 8. اتصال واقعی به سه بازو

- **Public Intake:** فقط taxonomy، FAQ و محتوای عمومیِ تأییدشده؛ وظیفه‌اش راهنمایی و جمع‌آوری حداقلی است، نه پژوهش پرونده یا ارائه نظر حقوقی شخصی.
- **Lawyer Copilot:** تمام legal-library موجود، منابع رسمی، آرای قضایی، نظریات، کتاب‌ها و مقالات دارای مجوز و یادداشت‌های پژوهشی؛ با provenance، نسخه، تاریخ اعتبار، اختلاف منابع و abstention در فقدان منبع.
- **Growth Intelligence:** مقالات و صفحات منتشرشده، اسناد SEO و داده‌های مجاز Search Console/Bing/Analytics؛ تحلیل و پیشنهاد read-only. هیچ داده پرونده/موکل یا secret قابل دسترس نیست.

هر بازو از یک مرجع canonical استفاده می‌کند ولی policy و retrieval filter مستقل دارد.

## 9. آزمون‌های پذیرش اجباری

1. جست‌وجوی نمونه در هر طبقه دارایی تاریخی و تأیید resolve به فایل/نسخه صحیح.
2. تطبیق 32 سند گزارش‌شده، 11 dataset و 47 ارجاع؛ تأیید یا اصلاح شمارش با manifest واقعی.
3. بررسی وجود 9 سند SEO و 23 سند MAVIS گزارش‌شده و حفظ hash/lineage.
4. golden queries فارسی برای قوانین، مقالات، کتاب‌ها، اصطلاحات و محتوای سایت.
5. آزمون فایل تکراری، فایل خراب، OCR ناقص، نسخه متعارض و منبع مفقود.
6. آزمون منفی: Public و Growth نتوانند internal/confidential را retrieve کنند.
7. آزمون منفی: هیچ secret/password/token وارد index، prompt، citation، log یا خروجی نشود.
8. آزمون prompt injection داخل سند بازیابی‌شده و جلوگیری از اجرای دستور.
9. citation به صفحه/ماده/بند واقعی و آزمون abstention برای منبع نامعتبر.
10. آزمون update افزایشی، حفظ نسخه قدیمی، rollback و restore در محیط ایزوله.
11. benchmark p50/p95، precision/recall، خطا و هزینه با dataset واقعی و نسخه مشخص.
12. تست RTL، دسترس‌پذیری و موبایل برای مرکز دانش مدیر؛ بدون تغییر ظاهر عمومی تأییدشده سایت.

## 10. برنامه اجرای کم‌هزینه و ترتیب تحویل

### مرحله A — ممیزی تاریخی read-only
- بررسی کامل Mother Two و تمام آرشیوها/شاخه‌های مجاز، با manifest و hash.
- تولید inventory، duplicate groups، conflicts، source lineage و missing/unreadable report.
- بدون extract-in-place، overwrite، حذف یا تغییر بکاپ اصلی.

### مرحله B — تطبیق با دارایی فعلی
- اتصال inventory به `src/data/legal-library/`, `src/lib/legal-library.js`, registry و مسیرهای مقاله/SEO.
- مشخص کردن canonical source هر دسته و رفع اختلاف نسخه‌ها.
- انتقال فایل‌ها به workspace مستقل فقط پس از تأیید hash و فضای ذخیره‌سازی.

### مرحله C — retrieval قابل اثبات
- اتصال read-only به registry موجود و ایجاد mapping/index افزایشی.
- استفاده از جست‌وجوی قطعی و FTS پیش از vector.
- اجرای golden tests و تست‌های دسترسی مثبت/منفی.

### مرحله D — سه بازو
- اتصال جداگانه Public، Copilot و Growth به gateway با allowlist و purpose.
- ثبت citation، audit metadata و شاخص کیفیت.
- عدم فعال‌سازی پرونده محرمانه تا تکمیل MFA/RBAC/RLS/audit/retention و تصویب مستقل.

### مرحله E — عملیات و نگهداری
- مرکز دانش مدیر برای inventory، بررسی، تأیید، reindex، sync، quarantine و گزارش خطا.
- jobهای idempotent، checkpoint، retry محدود و لغو امن.
- بکاپ جداگانه registry، manifest، index و Storage objects؛ restore آزمایشی در محیط ایزوله.
- پس از تکمیل مراحل بالا، آزمون Termux/Android و تحویل عملیاتی.

## 11. معیار پایان مأموریت دانش

این مأموریت فقط زمانی Done است که:
- دارایی‌های Mother Two و منابع تاریخی به‌صورت فایل‌به‌فایل inventory و hash شده باشند.
- کتابخانه‌های موجود، مقالات، کتاب‌ها و پژوهش‌های دارای مجوز به canonical registry متصل شده باشند.
- سه بازو در runtime واقعی و با دسترسی‌های مستقل از همان gateway استفاده کنند.
- هر پاسخ حقوقی دارای provenance/citation قابل بازبینی باشد.
- آزمون‌های منفی عدم نشت internal/confidential/secrets موفق باشند.
- نسخه‌بندی، reindex، monitor و restore آزمایش شده باشد.
- خروجی تست دقیق، commit، branch و محدودیت‌های باقیمانده ثبت شده باشند.

## 12. وضعیت صداقت در زمان تصویب این قرارداد

وجود اسناد طراحی 39 و 41، برنامه اتصال دانش و retrieval فعلی را اثبات می‌کند؛ اما inventory محلی کامل Mother Two، تطبیق تمام کتاب‌ها/مقالات، دسترسی به فایل‌های archive، اتصال واقعی هر سه بازو و restore محلی هنوز در این محیط اثبات نشده‌اند. این موارد نباید به‌عنوان Done گزارش شوند. دسترسی filesystem خصوصی Termux و archive محلی در این نشست در دسترس نیست؛ مرحله A باید در محیطی که آرشیو واقعاً موجود است اجرا شود.

## 13. منابع امنیتی و فنی جاری

- Supabase Storage Access Control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- OWASP GenAI LLM Top 10 2026: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/

این منابع راهنمای طراحی‌اند و جایگزین تست مجوزها در schema و محیط واقعی پروژه نیستند.
