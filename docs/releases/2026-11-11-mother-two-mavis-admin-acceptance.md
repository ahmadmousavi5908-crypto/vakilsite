# تثبیت و اتقان نسخه مادر دو به‌روزشده + MAVIS + پنل مدیریت

**شناسه مرجع:** `VAKILSITE-ACCEPTANCE-20261111`  
**تاریخ تأیید کاربر:** ۱۱ نوامبر ۲۰۲۶  
**وضعیت:** پذیرفته‌شده از نظر تجربه و عملکرد رابط؛ مرجع ادامه کار  
**مخزن:** [ahmadmousavi5908-crypto/vakilsite](https://github.com/ahmadmousavi5908-crypto/vakilsite)

## ۱. مبنای نسخه و زنجیره ارجاع

- نسخه مادر: `VAKILSITE-MOTHER-TWO-UPDATED-20261106`
- commit مبنای کد: `9d4f8181471224a2b6b0d79c8098a20c84883dc2`
- PR شماره ۸۷: [مشاهده PR #87](https://github.com/ahmadmousavi5908-crypto/vakilsite/pull/87)؛ ادغام‌شده طبق سابقه پروژه.
- شاخه کاری بررسی‌شده: `work/mother-two-updated-mavis-20261110`
- workspace: `vakilsite-mother-two-updated-mavis-work-20261110`
- این سند در شاخه مستقل `docs/acceptance-mother-two-mavis-admin-20261111` نگهداری می‌شود؛ ثبت مستندات به‌خودی‌خود به معنی ادغام آن شاخه با شاخه اصلی یا تغییر کد برنامه نیست.

**قاعده ارجاع:** برای بازسازی وضعیت کد، ابتدا commit مبنا و PR فوق را بررسی کنید؛ سپس فایل‌های مرجع بخش ۷ را در همان شاخه/commit بازبینی کنید. برای وضعیت پذیرش کاربر، این سند مرجع است.

## ۲. موارد پذیرفته‌شده توسط کاربر

در ۱۱ نوامبر ۲۰۲۶ کاربر صریحاً تأیید کرد:
- نسخه مادر دو به‌روزشده و MAVIS در وضعیت مطلوب و مورد قبول هستند.
- پنل مدیریت Admin باز می‌شود و وضعیت سایت عادی و رضایت‌بخش است.
- تعامل ماوس به‌درستی کار می‌کند.
- تمام دکمه‌های سایت و تمام دکمه‌های پنل مدیریت طبق بررسی کاربر درست کار می‌کنند.
- تغییرات مورد انتظار بازگشته‌اند و تجربه فعلی مطلوب است.

این تأیید، **آزمون پذیرش دستی کاربر** است؛ نه ادعای اجرای خودکار تست جامع مرورگر، تست بار، تست دسترس‌پذیری یا آزمون تک‌تک مسیرهای داده‌ای.

## ۳. الزامات تثبیت‌شده MAVIS

- لانچر شخصیت MAVIS مستقیماً گفت‌وگوی واحد را باز می‌کند؛ نه صفحه انتخاب چند مسیر.
- جست‌وجوی آفلاین کتابخانه حقوقی موتور دانش پشت همان گفت‌وگو است، نه مقصدی جداگانه.
- عبارت جست‌وجو، نتیجه بازیابی، توضیح حقوقی و پاسخ MAVIS در همان جریان مکالمه نمایش داده می‌شوند.
- پرسش‌های اختصاصی متناسب با موضوع و فرم جامع پذیرش در همان جریان پیوسته قرار دارند.
- فشرده‌سازی فرم به معنی حذف پرسش‌های ضروری نیست؛ هدف کاهش ارتفاع و اشغال فضای صفحه با گروه‌بندی و چیدمان مناسب است.
- اطلاعات مراجعان بدون مجوز نباید به سرویس خارجی یا شخص ثالث ارسال یا افشا شود.
- ظاهر و رفتار تأییدشده سایت خط قرمز است؛ تغییر یا بازطراحی فقط با درخواست و مجوز صریح کاربر مجاز است.

## ۴. بازیابی اتصال Supabase؛ شرح رخداد و شواهد

### ۴.۱ کشف علت

در workspace جدید، فایل `.env.local` وجود نداشت و این دو متغیر ضروری شناسایی نشدند:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

در نتیجه، مسیر ساخت کلاینت سرور Supabase می‌توانست پیش از بررسی اعتبارنامه ورود با خطای پیکربندی متوقف شود.

### ۴.۲ یافتن منبع تنظیمات

در نسخه‌های قدیمی، فایل‌های محیطی موجود بررسی شدند. فایل مرجع انتخاب‌شده:
`vakilsite-menu-review-20261105/.env.local`

تطبیق امن فایل‌های بررسی‌شده نشان داد همگی به پروژه `jroflcmiczfwtmiaxmpd.supabase.co` اشاره می‌کنند و اثرانگشت کلید در نمونه‌های مقایسه‌شده یکسان بوده است. مقدار کلید عمداً در این سند ثبت نمی‌شود.

### ۴.۳ انتقال موفق

انتقال نهایی با کپی مستقیم فایل مرجع انجام شد:
`cp ../vakilsite-menu-review-20261105/.env.local .env.local`

سپس مجوز فایل با `chmod 600` محدود شد. بررسی بعدی در ترمینال نتیجه داد:
- `NEXT_PUBLIC_SUPABASE_URL: PRESENT`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PRESENT`
- `PERMISSION: 600`

دو تلاش قبلی برای انتقال با دستور Python به‌علت خطای نحوی/نقل‌قول در Bash موفق نشدند؛ هیچ‌کدام مبنای اعلام موفقیت نیستند. معیار موفقیت، اجرای موفق `cp` و خروجی بررسی نهایی بالاست.

### ۴.۴ آزمایش سرویس

درخواست واقعی به endpoint تنظیمات Auth پروژه ارسال شد و خروجی ثبت‌شده در ترمینال چنین بود:
- `HTTP STATUS: 200`
- `AUTH SERVICE: REACHABLE`

این آزمون، دسترسی شبکه و پاسخ endpoint احراز هویت با کلید عمومی را اثبات می‌کند؛ به‌تنهایی سلامت همه جدول‌ها، policyهای RLS یا عملیات ذخیره‌سازی را اثبات نمی‌کند.

## ۵. پنل مدیریت و حساب عملیاتی

- مسیر ورود پیاده‌سازی‌شده: `/admin/login`
- مسیر داشبورد: `/admin`
- ایمیل عملیاتی‌ای که کاربر برای بازشدن پنل تأیید کرده است: `vakil.ahmadmousavi2731@gmail.com`
- کاربر تأیید کرده پنل با این حساب بالا آمده و دکمه‌های پنل درست کار می‌کنند.

**نکته امنیتی:** رمز عبور، توکن نشست، کلید عمومی یا محرمانه Supabase و هر secret در این سند ذخیره نمی‌شود. کلید `service_role`/secret نباید در `NEXT_PUBLIC_*`، مرورگر یا Git قرار گیرد. فایل `.env.local` نیز نباید commit شود.

## ۶. مرز دقیق پذیرش و موارد هنوز نیازمند آزمون مستقل

### پذیرفته‌شده
- حفظ نسخه و ظاهر مورد تأیید کاربر
- تجربه فعلی MAVIS طبق تأیید کاربر
- تعامل ماوس و عملکرد تمام دکمه‌های سایت و پنل طبق آزمون دستی کاربر
- بازیابی تنظیمات محیطی و محدودیت مجوز فایل
- پاسخ HTTP 200 از endpoint تنظیمات Auth
- بازشدن پنل Admin طبق تأیید کاربر

### هنوز به‌عنوان آزمون فنی مستقل ثبت نشده
- آزمون انتها‌به‌انتهای هر عملیات خواندن/نوشتن اطلاعات دفتر و شبکه‌های اجتماعی در Supabase
- آزمون نقش مدیر و حساب غیرمدیر در برابر تمام policyهای RLS
- اجرای مجدد build/lint/test در همین وضعیت نهایی، همراه با ثبت خروجی
- بررسی تنظیمات محیط production و میزبانی
- اتصال و انتشار روی دامنه `vakilahmadmousavi.ir`

بنابراین «تمام دکمه‌ها کار می‌کنند» یک تأیید دستی روشن از سوی کاربر است؛ اما نباید آن را به‌اشتباه معادل ممیزی امنیتی یا آزمون جامع دیتابیس معرفی کرد.

## ۷. نقشه منابع فنی قابل ارجاع در GitHub

تمام مسیرهای زیر در مخزن و شاخه کاری مبنای کد بررسی شده‌اند. برای مشاهده، روی هر مسیر کلیک کنید؛ در عیب‌یابی، نسخه همان فایل را در commit مبنا نیز تطبیق دهید.

| موضوع | مسیر مرجع |
|---|---|
| دستورالعمل راه‌اندازی، مهاجرت‌ها، حساب مدیر و امنیت | [`ADMIN_SETUP.md`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/ADMIN_SETUP.md) |
| صفحه ورود و پیام خطاها | [`src/app/admin/login/page.js`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/src/app/admin/login/page.js) |
| منطق احراز هویت و کنترل نقش مدیر | [`src/app/admin/login/actions.js`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/src/app/admin/login/actions.js) |
| ساخت کلاینت Supabase سمت سرور و متغیرهای لازم | [`src/lib/supabase/server.js`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/src/lib/supabase/server.js) |
| کنترل دسترسی مدیر و نشست | [`src/lib/supabase/admin.js`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/src/lib/supabase/admin.js) |
| تازه‌سازی نشست و عبور درخواست‌ها | [`src/proxy.js`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/src/proxy.js) |
| داشبورد و بارگذاری تنظیمات | [`src/app/admin/page.js`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/src/app/admin/page.js) |
| جدول profiles، تابع is_site_admin و سیاست‌های اولیه شبکه‌ها | [`001_social_links.sql`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/supabase/migrations/001_social_links.sql) |
| تنظیمات دفتر و سیاست‌های دسترسی موقعیت | [`002_office_location.sql`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/supabase/migrations/002_office_location.sql) |
| تفکیک نوع راه ارتباطی و شبکه اجتماعی | [`003_social_link_types.sql`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/supabase/migrations/003_social_link_types.sql) |
| مشخصات تجربه کاربری MAVIS | [`docs/mavis/07-ui-ux-specification.md`](https://github.com/ahmadmousavi5908-crypto/vakilsite/blob/work/mother-two-updated-mavis-20261110/docs/mavis/07-ui-ux-specification.md) |

### اثرانگشت فایل‌های کلیدی در زمان ممیزی

این SHAها برای تشخیص تغییر ناخواسته فایل‌ها در زمان بازبینی ثبت شده‌اند:
- `ADMIN_SETUP.md`: `a79dc87d9543a100388839d14e642dae2a6c133b`
- `src/app/admin/login/page.js`: `ce9027e98140e807102451d39dcef41e432f49b4`
- `src/app/admin/login/actions.js`: `2778a1becaef163dfcfd744a1957a090a6741e4e`
- `src/lib/supabase/server.js`: `3a0c90ee165d26d73930b374a1024d5af89bdfac`
- `src/proxy.js`: `2361cab5e6e5b598b6a76805549d9e7a98015e82`
- `src/app/admin/page.js`: `791f4872e0ebe761e50394946ae73303878af4e2`
- `supabase/migrations/001_social_links.sql`: `b2f627af675e5ac9918132e7874fcec19f34ee0d`
- `supabase/migrations/002_office_location.sql`: `76711d82bee0175620854cd2ba761eea4b6c18d6`
- `supabase/migrations/003_social_link_types.sql`: `a30436314069c10512a07df4177cff91486c61d3`

این مقادیر SHA مربوط به blob فایل‌ها هستند، نه commit پروژه. برای مقایسه معتبر، فایل را از همان شاخه/commit مرجع دریافت کنید؛ تغییر SHA لزوماً به معنی خرابی نیست، اما باید با diff بررسی شود.

## ۸. پروتکل عیب‌یابی و بازیابی

اگر در آینده سایت یا پنل دچار مشکل شد:

1. ابتدا شاخه، commit و نسخه فعال را ثبت کنید؛ با نسخه مرجع `9d4f8181471224a2b6b0d79c8098a20c84883dc2` مقایسه کنید.
2. بدون نمایش مقادیر محرمانه، وجود دو متغیر محیطی را بررسی کنید؛ وجود فایل به‌تنهایی کافی نیست.
3. endpoint تنظیمات Auth را آزمایش کنید؛ پاسخ 200 فقط دسترسی Auth را تأیید می‌کند.
4. پیام خطای صفحه ورود را طبق `src/app/admin/login/page.js` دسته‌بندی کنید:
   - `config`: تنظیمات/ساخت کلاینت
   - `credentials`: اعتبارنامه ورود
   - `unauthorized`: احراز هویت انجام شده اما نقش مدیر تأیید نشده یا RPC خطا داده است
5. منطق واقعی را در `actions.js`، `admin.js` و migration مربوط بررسی کنید؛ نقش را بدون شناسایی حساب و UUID درست تغییر ندهید.
6. قبل از اجرای migration یا SQL، وضعیت فعلی جدول‌ها و policyها را بررسی کنید؛ اجرای کورکورانه migration یا اعطای نقش ممنوع است.
7. ابتدا در محیط محلی/شاخه کاری و با حفظ نسخه مرجع آزمایش کنید؛ هیچ تغییر production یا انتشار دامنه بدون مجوز صریح انجام نشود.

## ۹. دستور قطعی ادامه پروژه

این سند و نسخه مرجع فوق، مبنای ادامه کار هستند. ظاهر، رفتار تأییدشده، جریان واحد MAVIS و پنل سالم نباید برای رفع مسائل نامرتبط بازنویسی شوند. مرحله بعدی برنامه‌ریزی میزبانی و دامنه `vakilahmadmousavi.ir` است؛ انتشار نهایی فقط پس از بررسی و مجوز صریح کاربر انجام می‌شود.

**اصل حاکم:** حفظ دستاوردهای تأییدشده، تغییر حداقلی و قابل بازگشت، ثبت شواهد، تفکیک تأیید کاربر از آزمون فنی، و ممنوعیت ادعای موفقیت بدون خروجی قابل ارجاع.
