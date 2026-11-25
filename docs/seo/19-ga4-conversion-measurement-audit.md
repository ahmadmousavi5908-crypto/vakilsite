# ممیزی اندازه‌گیری GA4 و جذب تماس — ۲۵ نوامبر ۲۰۲۶

**Property:** `Vakilsite Website`  
**Measurement ID:** `G-4W4H01THN5`  
**دامنه:** `vakilahmadmousavi.ir`  
**بازه داده قابل مشاهده:** ۱۹ تا ۲۴ نوامبر ۲۰۲۶  
**هدف:** تفکیک بازدید واقعی Production، ورودی ارگانیک، ارجاع AI و اقدام تماس.

## ۱. وضعیت اتصال و محدودیت تاریخی

- GA4 property متصل به پروژه OpenSEO همان Property وب‌سایت و Measurement ID مورد انتظار است.
- Web data stream در ۱۹ نوامبر ۲۰۲۶ ساخته شده؛ بنابراین داده قبل از این تاریخ برای تحلیل فعلی در دسترس نیست.
- Enhanced Measurement فعال است و ممیزی اتصال، issue فعالی گزارش نکرد.
- منطقه زمانی Property برابر `Asia/Kuwait` و واحد پول `USD` است. این منطقه زمانی ۳۰ دقیقه با `Asia/Tehran` اختلاف دارد؛ برای گزارش روزانه دفتر ایرانی بهتر است در تنظیمات GA4 بررسی و در صورت تأیید مدیر، به تهران تغییر کند. تغییر منطقه زمانی را بدون تأیید انجام نده؛ بر مرزبندی گزارش‌های روزانه اثر می‌گذارد.
- گزارش‌ها فقط شش روز داده دارند؛ هیچ روند ماهانه یا نرخ تبدیل پایدار از آن‌ها استنتاج نمی‌شود.

## ۲. عملکرد واقعی ۱۹ تا ۲۴ نوامبر

### Acquisition

| Source / Medium | Sessions | Active users | Engaged sessions | Engagement rate | Key events |
|---|---:|---:|---:|---:|---:|
| google / organic | 4 | 3 | 3 | 75% | 0 |
| chatgpt.com / ai-assistant | 1 | 1 | 1 | 100% | 0 |
| (direct) / (none) | 1 | 1 | 1 | 100% | 0 |

- همه چهار نشست ارگانیک از صفحه اصلی شروع شده‌اند.
- یک نشست ارجاعی از `chatgpt.com / ai-assistant` ثبت شده است؛ یک نمونه کوچک است و شاخص رتبه یا citation share محسوب نمی‌شود.
- هیچ Key Event در این بازه ثبت نشده است.

### Landing pages و page performance

| Host | Page | Page views | Active users | Engagement duration |
|---|---|---:|---:|---:|
| vakilahmadmousavi.ir | `/` | 9 | 3 | 39 sec |
| vakilahmadmousavi.ir | مقاله رأی وحدت رویه ۸۷۴ | 2 | 1 | 4 sec |
| vakilahmadmousavi.ir | `/about` | 1 | 1 | 3 sec |
| vakilahmadmousavi.ir | `/privacy` | 1 | 1 | 5 sec |
| localhost | `/` و `/about` | 2 | 1 | 6 sec |

دو page view روی `localhost` ترافیک Production نیست و باید از گزارش‌های عملکرد سایت جدا شود. در کد فعلی، allowlist میزبان‌های Production وجود دارد؛ این رکورد می‌تواند تاریخی یا ناشی از تگ دیگری باشد و به‌تنهایی دلیل وجود باگ در کد فعلی نیست.

## ۳. ممیزی کد رویدادهای تماس

فایل‌های بررسی‌شده:
- `src/components/GoogleAnalytics.jsx`
- `src/lib/google-analytics.mjs`
- `src/components/SocialContactDock.jsx`
- `src/app/layout.js`

یافته‌ها:
- سایت از gtag مستقیم استفاده می‌کند؛ در root layout، GoogleAnalytics mount شده است.
- host allowlist فقط `vakilahmadmousavi.ir` و `www.vakilahmadmousavi.ir` را مجاز می‌کند.
- مسیرهای `/admin` از analytics خارج شده‌اند.
- تابع `trackLeadContact` رویداد `contact_click` را با پارامترهای `method`، `page_path` و `source` می‌فرستد.
- روش‌های phone، email و whatsapp پوشش داده شده‌اند؛ فرم تماس نیز می‌تواند source برابر `request_form` بفرستد.
- در کد root layout، شناسه GTM برابر `GTM-5LZ88DTT` مشاهده نشد؛ روش فعلی، gtag مستقیم است. نیازی به نصب هم‌زمان GTM نیست مگر اینکه تصمیم مشخصی برای مدیریت تگ‌ها از طریق GTM گرفته شود.

## ۴. شکاف اصلی اندازه‌گیری

در تنظیمات GA4 سه Key Event دیده می‌شود:
- `close_convert_lead`
- `qualify_lead`
- `purchase`

اما رویداد واقعی تماس در کد سایت `contact_click` است و در فهرست Key Eventها نیست. گزارش فعلی نیز صفر Key Event نشان می‌دهد.

**نتیجه:** فعلاً نمی‌توان نرخ تبدیل تماس را از GA4 به‌درستی محاسبه کرد. صفر Key Event به معنی صفر تماس واقعی نیست؛ ممکن است تماس‌ها خارج از رویدادهای کلیدی ثبت شده باشند یا کاربر مستقیماً تماس گرفته باشد.

### تنظیمات پیشنهادی در GA4 Admin

1. پس از تأیید ارسال صحیح event در Production، `contact_click` را به‌عنوان Key Event تعریف کن.
2. سه پارامتر event-scoped custom dimension بساز:
   - `method`
   - `page_path`
   - `source`
3. `close_convert_lead` و `qualify_lead` فقط وقتی Key Event بمانند که واقعاً از CRM/فرایند پیگیری سرنخ ارسال شوند؛ در غیر این صورت داده ساختگی یا صفر ایجاد می‌کنند.
4. `purchase` فقط در صورت پرداخت واقعی آنلاین و event معتبر خرید نگه داشته شود؛ سایت وکالت در وضعیت فعلی فروشگاه اینترنتی نیست.
5. منطقه زمانی را به `Asia/Tehran` تغییر بده، اگر مدیر Property تأیید کند.
6. در گزارش‌های داخلی، `localhost` را از host filter حذف کن؛ data filter را بدون بررسی اثر آن روی داده تاریخی فعال نکن.

**محدودیت دسترسی:** اتصال OpenSEO به GA4 در این پروژه فقط خواندنی است؛ امکان تغییر Key Event، custom dimension یا timezone از ابزارهای فعلی در دسترس نیست. هیچ تنظیم GA4 تغییر داده نشده است.

## ۵. KPI تبدیل موکل

| KPI | تعریف |
|---|---|
| Contact intent | تعداد `contact_click` به تفکیک method و page_path |
| Contact attempt rate | contact_click / sessions روی landing page |
| Qualified lead | سرنخی که موضوع، شهر و تناسب خدمت آن تأیید شده است؛ از CRM/ثبت داخلی |
| Consultation booked | وقت مشاوره ثبت‌شده |
| Retained client | قرارداد/وکالت پذیرفته‌شده |
| Organic qualified lead | Qualified lead منتسب به Google organic |
| AI referral lead | Qualified lead منتسب به AI referral |

کلیک تماس معادل تماس موفق نیست و تماس موفق معادل موکل واجد شرایط نیست. اطلاعات پرونده، شماره ملی، اسناد و متن محرمانه هرگز نباید به GA4، URL یا پارامترهای analytics ارسال شوند.

## ۶. اولویت اجرایی

**P0**
- تأیید ارسال `contact_click` در Production با یک تست کنترل‌شده و بررسی DebugView/Realtime.
- ثبت hostname و جلوگیری از ورود داده localhost در گزارش مدیریتی.

**P1**
- تعریف `contact_click` به‌عنوان Key Event و ساخت custom dimensions.
- بازبینی صحت eventهای CRM و حذف `purchase` از Key Eventها اگر پرداخت آنلاین واقعی وجود ندارد.
- بازبینی timezone به Asia/Tehran.

**P2**
- اتصال تماس‌های پاسخ‌داده‌شده و lead qualification به یک ثبت داخلی کم‌داده/CRM.
- گزارش ماهانه landing page → contact intent → qualified lead → retained client.

## ۷. نتیجه

- GA4 متصل است و داده Production از ۱۹ نوامبر به بعد دارد.
- در ۱۹ تا ۲۴ نوامبر: ۴ نشست Google organic، یک نشست ChatGPT referral و یک نشست Direct.
- همه نشست‌های Google organic از صفحه اصلی شروع شده‌اند.
- در گزارش فعلی هیچ Key Event ثبت نشده؛ چون event واقعی `contact_click` در کد وجود دارد ولی در GA4 به‌عنوان Key Event تنظیم نشده است.
- کد analytics در main از نظر host allowlist و عدم ارسال از /admin ساختار درستی دارد؛ هیچ تغییر کدی لازم/اعمال نشده است.
- هنوز داده کافی برای محاسبه نرخ تبدیل موکل یا مقایسه ماهانه نداریم.
