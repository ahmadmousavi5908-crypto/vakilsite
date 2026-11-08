# 46 — تطبیق شاخه‌های GitHub و شواهد ساختار اجرایی MAVIS
تاریخ بررسی: 2026-11-08
وضعیت: ممیزی فقط‌خواندنی مخزن remote؛ Mother Two محلی، Supabase عملیاتی و production در این بررسی در دسترس نبوده‌اند.

## 1. دامنه و روش
این گزارش بر اساس مقایسه Git refs و دریافت مستقیم directory/file metadata از GitHub تهیه شده است. شاخه اجرایی بررسی‌شده:
`integration/mavis-runtime-reconciliation-20261108`
شاخه مستندات:
`docs/mavis-master-charter-v1.1-20261108`
شاخه مرجع مقایسه:
`integration/mother-two-research-only-20261106`
نتایج زیر فقط درباره snapshotهای همین refs معتبرند و جایگزین تطبیق با checkout و آرشیو Mother Two نیستند.

## 2. نقشه شاخه‌ها در زمان بررسی

| مقایسه | Ahead | Behind | وضعیت |
|---|---:|---:|---|
| runtime نسبت به main | 152 | 0 | ahead |
| feature/mavis-seo-integration-validation نسبت به main | 139 | 0 | ahead |
| feature/mavis-core-foundation نسبت به main | 57 | 0 | ahead |
| docs نسبت به integration/mother-two-research-only | 61 | 0 | ahead |
| docs نسبت به runtime | 65 | 152 | diverged |
| runtime نسبت به integration/mother-two-research-only | 152 | 4 | diverged |

مقایسه runtime با شاخه `integration/mother-two-research-only-20261106` شامل 75 فایل است: 60 فایل افزوده و 15 فایل اصلاح‌شده؛ 41 فایل در docs و 34 فایل خارج از docs قرار دارند. هیچ فایل حذف‌شده‌ای در این compare دیده نشد.

**تصمیم:** شاخه مستندات و شاخه runtime نباید مستقیماً به یکدیگر merge شوند. ابتدا baseline محلی، تغییرات untracked/modified و تفاوت چهار commit باید بررسی شوند؛ سپس cherry-pick یا reconciliation انتخابی با حفظ ancestry و فایل‌های موجود انجام شود. عدد ahead/behind به‌تنهایی مجوز merge نیست.

## 3. ساختار واقعی API و پایگاه داده در شاخه runtime

فهرست کامل `src/app/api` در ref بررسی‌شده فقط دو مسیر دارد:
- `office-location`
- `social-links`

بنابراین در این snapshot هیچ Route Handler برای چت MAVIS، Intake submission، Knowledge Gateway یا Growth jobs وجود ندارد.

فهرست `supabase/migrations` شامل سه migration است:
- `001_social_links.sql`
- `002_office_location.sql`
- `003_social_link_types.sql`

در این فهرست migration اختصاصی MAVIS، نقش‌های مجزای سه بازو، جدول job/audit/usage، consent یا registry عملیاتی دیده نمی‌شود. این یافته فقط وضعیت migrationهای موجود در همین شاخه را توصیف می‌کند؛ وضعیت پروژه Supabase عملیاتی هنوز بررسی نشده است.

## 4. هسته و رابط MAVIS

در `src/lib/mavis/` پنج فایل مشاهده شد:
- contracts
- errors
- mock-provider
- public-chat
- public-policy

Provider موجود mock است. در این پوشه registry انتخاب Provider، adapter واقعی، rate limiter اتمیک، budget ledger یا persistence مکالمه مشاهده نشد.

در `src/components/mavis/` چهار فایل وجود دارد:
- MavisDock.jsx و CSS
- PublicIntake.jsx و CSS

تست MAVIS فهرست‌شده در `tests/mavis/` فقط `public-chat.test.mjs` است. این به معنی نبود تست‌های دیگر در تمام پروژه نیست؛ فقط پوشه و snapshot بررسی‌شده را توصیف می‌کند.

صفحه `src/app/admin/page.js` داشبورد فعلی را با `requireAdmin` و وضعیت مدیر سایت کنترل می‌کند و تنظیمات موقعیت دفتر و شبکه‌های اجتماعی را نمایش می‌دهد. در این صفحه، مرکز مدیریت MAVIS یا ماتریس نقش اختصاصی سه بازو مشاهده نشد.

## 5. کتابخانه حقوقی موجود و سیاست عدم ایجاد دانشنامه موازی

در شاخه runtime، `src/data/legal-library/` وجود دارد و Manifest نسخه 1.3.1 این موارد را اعلام می‌کند:
- 132 اصطلاح canonical
- 16 رکورد قانون
- 22 خلاصه مقاله
- 19 گروه taxonomy
- 353 عبارت جست‌وجوی فارسی

`src/lib/legal-library.js` داده‌های JSON همین کتابخانه را import می‌کند و توابع دسترسی، رابطه، برچسب بازبینی و تشخیص رکورد قابل index را ارائه می‌دهد. indexability به وضعیت `verified_primary_source` و وجود مدرک منبع اولیه HTTPS وابسته است.

README کتابخانه تصریح می‌کند که validator ساختاری، شمارش و ارجاعات را کنترل می‌کند، اما صحت حقوقی، آخرین اصلاحات یا تنقیح کامل را تأیید نمی‌کند. بنابراین:
- این کتابخانه باید منبع داده موجود و مبنای adapter/registry MAVIS باقی بماند.
- ساخت corpus یا دانشنامه حقوقی موازی ممنوع است.
- لایه registry آینده باید metadata اجرایی، provenance، نسخه، مجوز، اعتبار زمانی و وضعیت ingest را به‌صورت سازگار به همین داده متصل کند؛ نه اینکه رکوردهای حقوقی را بی‌دلیل تکثیر کند.
- قبل از هر ingest، محتوای تاریخی و داده‌های Mother Two باید با hash و lineage تطبیق داده شوند.

در `docs/` شاخه runtime، پوشه‌ای با نام `knowledge` در فهرست مشاهده‌شده وجود ندارد. این موضوع وجود هر registry در دیتابیس یا مسیر دیگر را رد نمی‌کند؛ آن بخش فقط با بررسی local و Supabase قابل تعیین است.

## 6. پیامدهای اجرایی و ترتیب اصلاح

### P0 — پیش از فعال‌سازی هر قابلیت عمومی
1. تطبیق runtime branch با Mother Two واقعی و چهار commit اختلافی.
2. تعیین authorization مدل‌محور: role × arm × data class × operation، با server-side checks و RLS/grants.
3. طراحی atomic rate limit، quota، budget ledger، kill switch و audit log.
4. ساخت Route Handler با contract نسخه‌دار و خطاهای امن؛ تا پیش از این دروازه‌ها، feature flag خاموش بماند.
5. تعیین مسیر Provider فقط پس از بررسی صلاحیت جغرافیایی، قرارداد، privacy، retention و هزینه.

### P1 — پس از تثبیت baseline
1. بازطراحی Intake جامع و شرطی با پرسش‌های خنثی، چک‌لیست مدارک و رضایت‌های مستقل؛ بدون تحلیل حقوقی.
2. تبدیل انتقال WhatsApp به مسیر دارای افشای روشن مقصد و رضایت مستقل؛ حذف fallback مقصد از client.
3. ساخت مرکز مدیریت MAVIS به‌صورت ماژول داخل پنل موجود، با نقش‌های مجزا و بدون تغییر ظاهر عمومی سایت.
4. اتصال Knowledge Gateway به کتابخانه حقوقی موجود، با فیلتر مجوز و citation provenance.

### P2 — کیفیت و رشد
1. گسترش CI از تست واحد به lint، build، integration، security، accessibility و smoke tests.
2. آزمون sitemap/robots/canonical و schema فقط پس از تطبیق Mother Two و بدون جعل تاریخ.
3. اتصال read-only سرویس‌های رشد پس از بررسی حساب، مجوز و secret storage.
4. سنجش performance، کیفیت citation، هزینه و تبدیل با baseline قابل تکرار.

## 7. وضعیت آزمون و محدودیت شواهد
- این بررسی remote و read-only بوده است.
- در این نوبت build، lint، unit test، integration test، RLS test یا production HTTP test اجرا نشده است.
- وضعیت commit status و workflow runs برای head شاخه مستندات در زمان بررسی خالی بود؛ CI سبز تأیید نشده است.
- Mother Two archive، working tree محلی، فایل‌های untracked، دیتابیس Supabase، Storage و secrets بررسی نشده‌اند.
- هیچ runtime، migration، سایت عمومی، backup یا داده production در این مرحله تغییر نکرده است.

## 8. دروازه انتقال به Termux
پیش از اجرای هر patch محلی باید گزارش ممیزی فقط‌خواندنی Mother Two دریافت و این موارد روشن شود:
1. تطابق hash آرشیو و companion manifests؛
2. Git HEAD، branch، working tree و untracked files؛
3. inventory و hash کتابخانه حقوقی و اسناد تاریخی؛
4. تفاوت واقعی local با runtime/docs refs؛
5. مسیر بازگشت و snapshot جدید مستقل.

تا آن زمان این گزارش صرفاً مبنای برنامه‌ریزی است و هیچ‌یک از یافته‌های remote به‌عنوان تأیید نسخه محلی یا production معرفی نمی‌شود.
