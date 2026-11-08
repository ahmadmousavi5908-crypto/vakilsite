# 25 — ماتریس پژوهش اتصال سرویس‌های جست‌وجو، محتوا و تبلیغات
تاریخ بررسی: 2026-11-08
وضعیت: پژوهش مستندات رسمی؛ هیچ حساب یا API به پروژه متصل نشده است.

## 1. Google Search Console
**قابلیت‌های قابل اتکا**
- Search Analytics برای دریافت شاخص‌های جست‌وجو با بازه زمانی، فیلتر و dimensionهایی مانند page، query، country و device.
- Sitemaps API برای فهرست‌کردن، ثبت، دریافت وضعیت و حذف sitemap.
- URL Inspection API برای مشاهده وضعیت نسخه موجود در ایندکس گوگل.

**محدودیت‌ها**
- Search Analytics الزاماً همه ردیف‌های داده را بازنمی‌گرداند و ممکن است ردیف‌های برتر را اولویت دهد؛ خروجی API نباید به‌عنوان کل داده خام تلقی شود.
- URL Inspection API وضعیت URL در نسخه ایندکس‌شده را گزارش می‌کند؛ ابزار live-test یا درخواست مستقیم ایندکس نیست.
- سهمیه‌های Search Analytics و URL Inspection محدود و وابسته به site/user/project هستند؛ quota باید پایش شود.
- دسترسی داده حساب با OAuth 2.0 و scope حداقلی انجام می‌شود؛ برای تحلیل فقط‌خواندنی، scope برابر `webmasters.readonly` ترجیح دارد.

**تصمیم MAVIS:** اتصال read-only در فاز رشد؛ submit sitemap تنها در workflow تأییدشده انتشار. URL Inspection برای ثبت «وضعیت مشاهده‌شده»، نه درخواست ایندکس استفاده می‌شود.

منابع رسمی:
- https://developers.google.com/webmaster-tools/v1/api_reference_index
- https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/webmaster-tools/limits
- https://developers.google.com/webmaster-tools/v1/how-tos/authorizing

## 2. Google Ads API
**وضعیت دسترسی در تاریخ بررسی**
- مستندات رسمی جدید اعلام می‌کنند Developer Tokenها در 2026-09-09 sunset شده‌اند و مدیریت سطح دسترسی API به Google Cloud project منتقل شده است.
- فعال‌سازی API در Cloud project سطح Test می‌دهد؛ برای دسترسی حساب‌های واقعی باید سطح دسترسی متناسب مانند Explorer/Basic/Standard از مسیر Google Ads API Overview درخواست شود.
- مستندات قدیمی‌تر quickstart و برخی صفحات REST هنوز wording قدیمی developer token را نشان می‌دهند؛ برای تصمیم onboarding، صفحه Access levels و راهنمای sunset مرجع اولویت‌دار است. قبل از کدنویسی باید مستندات همان نسخه API دوباره کنترل شود.
- OAuth 2.0 و انتخاب روش authentication، مالکیت Cloud project، سطح دسترسی، محدودیت عملیات و الزامات مشتری باید پیش از اتصال مشخص شود.
- گزارش‌گیری با GAQL و منابع گزارش رسمی انجام می‌شود؛ سطح دسترسی و سقف عملیات، تعداد درخواست‌ها و نرخ فراخوانی باید ثبت شود.

**تصمیم MAVIS**
- فاز اول Ads read-only: کمپین‌ها، ad groups، keywords، search terms در دسترس مجاز، impressions، clicks، cost، conversions و وضعیت سیاست‌ها.
- هیچ ایجاد/تغییر/توقف کمپین، بودجه، bid، keyword یا ad بدون preview و تأیید صریح مدیر انجام نشود.
- داده تبلیغات باید به داده‌های تماس/فرم فقط در چارچوب consent و سیاست محرمانگی متصل شود؛ از ثبت اطلاعات حقوقی حساس در conversion payload اجتناب شود.
- گزارش هزینه جذب سرنخ تنها در صورت تعریف معتبر conversion و کیفیت سرنخ محاسبه شود؛ کلیک یا تماس خام، موکل قطعی نیست.

منابع رسمی:
- https://developers.google.com/google-ads/api/docs/api-policy/access-levels
- https://developers.google.com/google-ads/api/docs/api-policy/developer-token
- https://developers.google.com/google-ads/api/docs/get-started/introduction
- https://developers.google.com/google-ads/api/docs/oauth/cloud-project

## 3. Google Trends
- صفحه رسمی Google Trends API در حال حاضر دسترسی Alpha را معرفی می‌کند و برای early access درخواست ثبت‌نام می‌پذیرد؛ دسترسی عمومی و قطعی برای همه توسعه‌دهندگان فرض نمی‌شود.
- API معرفی‌شده داده تا پنج سال، aggregation روزانه/هفتگی/ماهانه/سالانه و مقایسه مناطق/زیرمناطق را توصیف می‌کند؛ قابلیت و شرایط واقعی باید پس از پذیرش Alpha و دریافت مستندات حساب بررسی شود.

**تصمیم MAVIS:** تا زمان تأیید دسترسی رسمی، Trends از رابط وب و پژوهش دستی/قابل‌ثبت استفاده شود؛ scraping یا API غیررسمی مبنای production نشود.

منبع رسمی:
- https://developers.google.com/search/apis/trends

## 4. Google News و داده ساختاریافته
- وب‌سایت‌ها برای حضور در Google News و سطوح خبری Search به‌صورت خودکار ارزیابی می‌شوند؛ ثبت درخواست یا ورود دستی در Publisher Center پیش‌شرط عمومی نمایش نیست.
- محتوا باید مرتبط، اصیل، قابل اعتماد و مطابق سیاست‌های News باشد؛ داشتن schema به‌تنهایی eligibility یا نمایش ایجاد نمی‌کند.
- Article / NewsArticle / BlogPosting structured data می‌تواند به فهم بهتر عنوان، تصویر، نویسنده و تاریخ کمک کند؛ Google آن را الزام کلی برای حضور در Top stories نمی‌داند.
- داده ساختاریافته باید دقیقاً با محتوای قابل مشاهده صفحه منطبق باشد؛ نوع NewsArticle فقط برای محتوای واقعاً خبری استفاده شود. برای مقالات حقوقی تحلیلی، Article یا BlogPosting متناسب‌تر است.

**تصمیم MAVIS:** محتوای حقوقی آموزشی را به‌زور NewsArticle معرفی نکنیم. معیارهای اصالت، نویسنده، تاریخ انتشار/اصلاح، منابع و سیاست‌های محتوا رعایت شود.

منابع رسمی:
- https://developers.google.com/search/blog/2021/07/google-news-top-questions
- https://developers.google.com/search/docs/appearance/structured-data/article

## 5. Google Sitemap و درخواست ایندکس
- Google Sitemap ping endpoint deprecated شده است؛ استفاده از URLهای قدیمی `/ping?sitemap=` ممنوع.
- sitemap از طریق robots.txt و Search Console قابل معرفی است؛ Search Console API امکان submit sitemap را فراهم می‌کند.
- ثبت sitemap فقط یک hint است و تضمین crawl/index نیست.
- Google توصیه می‌کند lastmod واقعی و دقیق باشد و از submit مکرر sitemap بدون تغییر پرهیز شود.
- برای URLهای مهم، Request indexing در رابط Search Console مسیر جداگانه‌ای است؛ URL Inspection API جایگزین آن نیست.
- crawl و index ممکن است چند روز یا بیشتر زمان ببرد و حتی محتوای crawl‌شده ممکن است به دلیل کیفیت/تقاضا نمایش داده نشود.

**تصمیم MAVIS:** انتشار سریع داخلی، sitemap تازه و submit کنترل‌شده؛ ثبت زمان و پاسخ API؛ سپس مشاهده وضعیت index با URL Inspection و گزارش جداگانه. هیچ «ایندکس فوری» وعده داده نشود.

منابع رسمی:
- https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors

## 6. Bing Webmaster Tools و IndexNow
- مستندات Microsoft اعلام می‌کنند APIهای Legacy SOAP و POX در 2026-08-31 بازنشسته می‌شوند؛ در تاریخ این گزارش باید REST APIs مبنا قرار گیرد و endpointهای قدیمی در integration جدید استفاده نشوند.
- Bing Webmaster API داده‌هایی مانند crawl stats، keyword، rank/traffic و قابلیت submit URL/sitemap را معرفی می‌کند.
- OAuth 2.0 روش توصیه‌شده دسترسی است؛ API key نیز در مستندات وجود دارد و باید در secret store سرور نگهداری شود.
- IndexNow پروتکل notification برای URLهای اضافه/به‌روزرسانی/حذف‌شده است. کلید باید با فایل متنی قابل دسترسی روی host تأیید شود.
- پاسخ HTTP 200 به معنی دریافت/پذیرش submission است، نه تضمین index. پاسخ 202 می‌تواند به معنی دریافت و انتظار برای اعتبارسنجی key باشد.
- حداکثر ۱۰٬۰۰۰ URL در هر batch POST اعلام شده؛ برای پروژه ما batch کوچک، idempotent و مبتنی بر تغییر واقعی محتوا مناسب‌تر است.

**تصمیم MAVIS:** REST API برای گزارش و مدیریت Bing؛ IndexNow برای notification تغییرات واقعی؛ ثبت پاسخ و وضعیت جدا از index مشاهده‌شده. SOAP/POX legacy استفاده نشود.

منابع رسمی:
- https://learn.microsoft.com/en-us/bingwebmaster/
- https://learn.microsoft.com/en-us/bingwebmaster/getting-access
- https://www.indexnow.org/documentation
- https://www.indexnow.org/faq

## 7. کشف‌پذیری در قابلیت‌های هوش مصنوعی Google
- راهنمای Google می‌گوید اصول SEO بنیادی همچنان مبنا هستند؛ صفحه باید index شده و واجد نمایش snippet در Search باشد تا بتواند به‌عنوان supporting link در AI Overviews/AI Mode مطرح شود.
- Google برای این قابلیت‌ها schema اختصاصی AI یا فایل machine-readable ویژه‌ای را الزام نمی‌کند.
- محتوای مفید، قابل اعتماد، متن قابل crawl، لینک داخلی قابل دنبال‌کردن، تجربه صفحه خوب و تطابق structured data با محتوای مرئی اهمیت دارند.
- حضور یا نمایش در AI features تضمین‌شده نیست.

**تصمیم MAVIS:** تمرکز بر محتوای اصیل، پاسخ روشن به پرسش واقعی، منبع‌دهی قابل بررسی، نویسنده/تاریخ شفاف، ساختار معنایی و قابلیت crawl؛ نه تولید فایل‌ها یا markupهای ادعایی و بی‌پشتوانه برای «سئو هوش مصنوعی».

منابع رسمی:
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

## 8. ترتیب پیاده‌سازی پیشنهادی
1. ثبت وضعیت فعلی property و دسترسی‌های واقعی بدون دریافت secret در چت.
2. ساخت credential جداگانه و حداقل‌دسترسی برای هر سرویس در محیط امن سرور.
3. اتصال Search Console read-only و گزارش اولیه.
4. اتصال Bing Webmaster REST و IndexNow با key امن.
5. تکمیل Article metadata، sitemap، RSS و status tracking.
6. بررسی دسترسی Google Trends API Alpha؛ تا آن زمان fallback دستی.
7. اتصال Google Ads read-only پس از تعیین حساب، Cloud project، سطح دسترسی و conversion definitions.
8. هرگونه write action فقط در مرحله‌ای جدا، با approval log و قابلیت rollback.

## 9. اصل داده و محرمانگی
- Search queries، Ads terms و گزارش‌های رشد داده بازاریابی‌اند و نباید با محتوای پرونده یا اطلاعات محرمانه موکل مخلوط شوند.
- داده conversion نباید شامل شرح دعوا، نام طرف مقابل، شماره پرونده، مدارک یا جزئیات حساس باشد.
- همه credentialها server-side و قابل rotation هستند؛ هیچ secret در Git یا client bundle قرار نمی‌گیرد.


## 10. به‌روزرسانی 2026-11-08: قابلیت‌های جدید Search Console و سیاست backup
- از 2026-08-31، کنترل Search generative AI برای مدیریت حضور سایت در AI Overviews، AI Mode و قابلیت‌های generative AI در Discover به همه سایت‌ها rollout شده است. وضعیت property باید پیش از نتیجه‌گیری بررسی شود.
- گزارش Generative AI performance در Search Console برای impressions، صفحات و کشورها در دسترس عمومی شده؛ اگر حجم impression کافی نباشد ممکن است گزارش نمایش داده نشود. داده این گزارش باید از خود property خوانده شود، نه با عددسازی.
- راهنمای رسمی Google برای AI features تأکید می‌کند اصول SEO بنیادی و محتوای اصیل/مفید همچنان پایه‌اند؛ ساخت فایل‌های خاص AI یا ترفندهای مصنوعی مانند chunking اجباری توصیه نمی‌شود.
- Supabase daily backups شامل اشیای Storage نیستند؛ Storage باید جداگانه backup/restore شود. در restore به نقطه قدیمی، تغییرات بعد از آن از دست می‌روند؛ restore به پروژه جدید برای حفظ production توصیه می‌شود.
- برای پروژه Free، مستندات Supabase export منظم با CLI را توصیه می‌کنند؛ Pro/Team/Enterprise daily backups و PITR بسته به plan دارند. وضعیت واقعی plan و retention پروژه باید در Dashboard بررسی شود.
- این اطلاعات به معنی فعال‌سازی کنترل AI Search، اتصال Search Console یا تنظیم backup Supabase نیست؛ فقط الزامات ممیزی و طراحی‌اند.

منابع رسمی افزوده‌شده:
- https://support.google.com/webmasters/answer/16908024
- https://support.google.com/webmasters/answer/16984139
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://supabase.com/docs/guides/platform/backups
