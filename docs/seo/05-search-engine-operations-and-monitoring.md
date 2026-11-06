# 05 — عملیات موتورهای جست‌وجو، خزنده‌ها و پایش AI Visibility

**تاریخ بررسی:** ۴ نوامبر ۲۰۲۶  
**وضعیت:** راهنمای عملیاتی؛ مراحل نیازمند مالکیت دامنه تا زمان اتصال واقعی در حالت pending باقی می‌مانند.

## 1. اصل عملیاتی

Robots.txt فقط راهنمای خزنده‌های سازگار است؛ احراز هویت، کنترل دسترسی یا فایروال نیست. Sitemap اعلام URLهای canonical پیشنهادی است، نه دستور ایندکس. IndexNow اطلاع‌رسانی تغییر URL است، نه تضمین crawl یا index. AI citation نیز رتبه یا ترافیک محسوب نمی‌شود.

هیچ‌یک از این چهار مورد جای دیگری را نمی‌گیرد.

## 2. ماتریس ربات‌ها و تصمیم فعلی

| عامل | کاربرد | سیاست فعلی پروژه | کنترل تکمیلی |
|---|---|---|---|
| Googlebot | جست‌وجوی وب | مجاز | Search Console، URL Inspection و crawl stats |
| Bingbot | Bing و grounding | مجاز | Bing Webmaster و URL inspection |
| OAI-SearchBot | حضور در ChatGPT Search | مجاز | تطبیق User-Agent و IP ranges رسمی OpenAI در WAF |
| GPTBot | crawler مربوط به آموزش مدل | مسدود طبق تصمیم فعلی مالک | جدا از OAI-SearchBot نگهداری شود |
| Claude-SearchBot | جست‌وجوی Anthropic | مجاز طبق سیاست فعلی | لاگ و IP رسمی |
| ClaudeBot | crawler آموزش Anthropic | مسدود طبق تصمیم فعلی مالک | جدا از SearchBot |
| PerplexityBot | کشف و جست‌وجوی Perplexity | مجاز | تطبیق IP رسمی در WAF |
| Perplexity-User | fetch ناشی از درخواست کاربر | تابع robots یکسان فرض نشود | کنترل دسترسی واقعی و لاگ |
| Google-Extended | کنترل استفاده در برخی محصولات AI گوگل | مسدود طبق تصمیم فعلی مالک | با Googlebot یکی نیست |
| ChatGPT-User | fetch ناشی از درخواست کاربر | robots ممکن است اعمال نشود | محرمانگی با auth و عدم انتشار عمومی کنترل شود |

سیاست crawler آموزش و جست‌وجو مستقل است. تغییر یک مورد نباید تصادفاً دیگری را باز کند.

## 3. چک‌لیست قبل از انتشار دامنه

- [ ] دامنه اصلی و نسخه ترجیحی www/non-www مشخص شود.
- [ ] HTTPS و redirect یک‌مرحله‌ای از hostهای جایگزین برقرار باشد.
- [ ] NEXT_PUBLIC_SITE_URL فقط با origin واقعی HTTPS تنظیم شود.
- [ ] canonical در صفحه، sitemap و metadata دقیقاً یکسان باشد.
- [ ] robots.txt شامل sitemap URL واقعی و policyهای تأییدشده باشد.
- [ ] sitemap فقط URL عمومی، canonical، indexable و پاسخ‌دهنده را شامل شود.
- [ ] URLهای noindex، private، redirect، 404، query duplicate و صفحات کم‌ارزش از sitemap حذف شوند.
- [ ] هیچ صفحه محرمانه‌ای صرفاً با robots محافظت نشود؛ احراز هویت و authorization سمت سرور الزامی است.
- [ ] فایل IndexNow key در host واقعی و مسیر استاندارد قابل دریافت باشد.
- [ ] هیچ کلید IndexNow یا API secret در Git یا bundle عمومی قرار نگیرد.
- [ ] ربات‌های مجاز در WAF/CDN با User-Agent تنها تأیید نشوند؛ IP ranges رسمی و روش تأیید ارائه‌دهنده بررسی شود.
- [ ] درخواست واقعی از لاگ CDN/origin برای robots، sitemap و چند صفحه عمومی دیده شود.



### Canonical و متادیتای مسیرها

- در Next.js metadata بین layout و page به‌صورت مرحله‌ای ادغام می‌شود؛ هر مسیر عمومی باید canonical مخصوص خود را داشته باشد یا به‌صورت آگاهانه canonical مشترک تعریف کند. canonical ریشه نباید ناخواسته برای صفحات دیگر باقی بماند.
- برای routeهایی که page آن‌ها Client Component است، metadata باید در Server Component والد مانند layout تعریف شود.
- مسیرهای عمومی دستیار، همکاری وکلا و حریم خصوصی canonical مستقل دارند و آزمون HTTP مقدار نهایی canonical را از HTML بررسی می‌کند.
- صفحه ورود مدیر noindex و nofollow است و در robots فقط همین مسیر به‌طور صریح برای مشاهده دستور noindex قابل خزش است؛ مسیر داشبورد و API همچنان مسدود و با احراز هویت/مجوز سمت سرور محافظت می‌شوند.
- noindex جایگزین authorization نیست و Disallow نیز حذف قطعی URL از ایندکس را تضمین نمی‌کند.

## 4. IndexNow: رفتار و محدودیت‌ها

- Key طبق پروتکل ۸ تا ۱۲۸ کاراکتر hexadecimal یا dash است.
- Key file باید در host مالکیت‌دار قابل دریافت باشد.
- URL ارسالی باید متعلق به همان host و RFC 3986-compatible باشد.
- پاسخ HTTP 200 فقط دریافت درخواست را نشان می‌دهد، نه ایندکس قطعی.
- 202 به معنی دریافت با اعتبارسنجی کلید در انتظار است.
- 400 قالب نامعتبر، 403 کلید نامعتبر/یافت‌نشدن، 422 ناسازگاری URL/کلید و 429 محدودیت نرخ است.
- URLها فقط هنگام ایجاد، تغییر معنادار یا حذف ارسال شوند؛ ارسال انبوه تکراری نکنید.
- تغییر URL در IndexNow باید همراه با sitemap و canonical صحیح باشد.

## 5. Google Search Console

پس از تأیید مالکیت دامنه:
1. Domain property با DNS verification ایجاد شود.
2. sitemap اصلی ثبت و پردازش آن کنترل شود.
3. Page indexing و URL Inspection برای نمونه‌ای از صفحات اصلی، مقالات، خدمات و کتابخانه بررسی شود.
4. Crawl stats، host status و خطاهای سرور/خزش پایش شود.
5. Core Web Vitals موبایل و دسکتاپ بررسی شود.
6. Performance بر اساس query/page/country/device و brand/non-brand جدا شود.
7. گزارش Generative AI Performance در صورت نمایش برای property ثبت و ماهانه خروجی گرفته شود.

نبودن گزارش یا داده کم به‌معنای جریمه نیست؛ ممکن است داده کافی یا واجد شرایط وجود نداشته باشد.

## 6. Bing Webmaster Tools

پس از verification:
1. sitemap و IndexNow status ثبت/بررسی شود.
2. Site Explorer، URL inspection و crawl issues بررسی شود.
3. Search Performance برای query/page و دستگاه ثبت شود.
4. AI Performance به‌صورت ماهانه بررسی و CSV/XLSX صادر شود.
5. صفحات cited، grounding queries و روند زمانی تحلیل شوند.
6. در صورت فعال بودن قابلیت‌های preview، Intents، Topics، Citation Share و Compare نیز بررسی شوند.

محدودیت‌های تفسیر:
- AI Performance داده تجمیعی/نمونه‌ای است و تمام پاسخ‌ها را ثبت نمی‌کند.
- Grounding query عبارت گروه‌بندی‌شده است، نه prompt دقیق کاربر.
- Citation count رتبه، اهمیت، کلیک یا lead نیست.
- Citation Share سهم نسبی است، نه شناسایی دامنه رقبا.
- قابلیت‌های preview ممکن است در همه حساب‌ها یا بازارها فعال نباشد.

## 7. سنجش حضور در سامانه‌های AI

یک مجموعه ثابت ۳۰ تا ۵۰ پرسش واقعی از intentهای اصلی تهیه شود؛ نمونه:
- تعریف/شرایط/مهلت یک موضوع حقوقی
- تفاوت دو نهاد یا مسیر حقوقی
- مراحل اقدام و مرجع صالح
- پرسش محلی درباره وکیل و خدمات در اهواز
- پرسش درباره اصلاحات قانون و تاریخ اجرا

برای هر آزمون ثبت شود:
- تاریخ و ساعت، کشور/زبان و سطح دسترسی
- متن دقیق سؤال و نام سامانه
- ذکر نام وکیل/برند
- citation به URL خود سایت
- منابع رقیب و رسمی ظاهرشده
- صحت حقوقی پاسخ و تناسب jurisdiction
- صفحه‌ای که نیازمند بهبود است

نمونه‌برداری دستی و با رعایت شرایط سرویس انجام شود؛ scraping خودکار یا دستکاری نتایج برای تولید KPI ممنوع است.

## 8. برنامه پایش و آستانه‌های هشدار

| تناوب | بررسی | اقدام در صورت مشکل |
|---|---|---|
| هر deploy | build، lint، unit، HTTP routes، canonical/sitemap/robots | rollback یا توقف انتشار |
| هفتگی | خطاهای crawl، sitemap، 404/5xx، IndexNow response | رفع علت ریشه‌ای |
| ماهانه | GSC، Bing Search و AI Performance، CWV، صفحات cited | اصلاح backlog بر اساس داده |
| ماهانه | نمونه پرسش‌های AI و کیفیت citation | بازبینی محتوا و منابع |
| فصلی | crawler IP/WAF، دسترسی و امنیت، entity consistency | بازبینی policy و کنترل‌ها |
| با هر اصلاح قانون | provenance، نسخه، تاریخ اجرا و مقاله‌های وابسته | بازبینی حقوقی و انتشار اصلاح |

آستانه پیشنهادی هشدار فنی:
- sitemap خالی یا origin اشتباه: بحرانی
- robots پاسخ غیر 200 یا sitemap URL نادرست: بالا
- افزایش ناگهانی 5xx یا 404 در URLهای مهم: بالا
- افت CWV یا LCP/INP/CLS خارج از حدود مطلوب: backlog اولویت‌دار
- کاهش citation به‌تنهایی: هشدار بررسی، نه rollback خودکار

## 9. منابع رسمی

- Google AI features: https://developers.google.com/search/docs/appearance/ai-features
- Google Search Console: https://support.google.com/webmasters/
- Bing AI Performance: https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c
- Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a
- IndexNow protocol: https://www.indexnow.org/documentation
- OpenAI crawlers and IP ranges: https://developers.openai.com/api/docs/bots
- Anthropic crawlers: https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Perplexity crawlers and IP ranges: https://docs.perplexity.ai/docs/resources/perplexity-crawlers

## 10. تصمیم‌های قطعی عملیاتی

- دامنه واقعی، DNS، Search Console، Bing Webmaster و WAF بدون دسترسی/تأیید مالک قابل اتصال یا ادعای بررسی نیست.
- GPTBot، ClaudeBot و Google-Extended طبق سیاست فعلی مسدود می‌مانند؛ crawlerهای جست‌وجو جداگانه مجازند.
- robots.txt برای محتوای خصوصی کافی نیست.
- sitemap فقط صفحات باکیفیت و قابل نمایه‌سازی را معرفی می‌کند.
- IndexNow فقط برای تغییر واقعی URLها استفاده می‌شود.
- هیچ KPI مصنوعی، citation ساختگی یا رتبه تضمینی گزارش نمی‌شود.
