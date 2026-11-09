# Google Search، تجربه‌های مولد و Google News

**تاریخ پژوهش:** 2026-11-09  
**وضعیت:** مبنای رسمی راهبرد؛ اجرای تغییرات سایت نیازمند ممیزی کد و تأیید مالک است.

## نتیجه اصلی

طبق راهنمای رسمی Google در سال 2026، بهینه‌سازی برای AI Overviews و AI Mode ادامه همان SEO بنیادی است. صفحه باید برای Search قابل خزش، ایندکس و نمایش snippet باشد. Google هیچ schema ویژه GEO، فایل llms.txt، chunking مصنوعی یا بازنویسی صرفاً برای AI را شرط حضور معرفی نمی‌کند. محتوای اصیل، مفید، دقیق، قابل اعتماد و دارای تخصص واقعی اولویت دارد.

## موارد اجرایی Vakilsite

1. canonical، robots، sitemap، status code و لینک داخلی را در سطح route بررسی کن.
2. متن اصلی مقاله باید در HTML قابل دسترس باشد؛ محتوای اصلی را پشت تعامل JavaScript یا login غیرضروری پنهان نکن.
3. صفحه اصلی باید نام برند/سایت را به‌صورت یکنواخت ارائه کند. WebSite structured data فقط در homepage و با نام واقعی/ترجیحی قرار گیرد.
4. Article/BlogPosting schema تنها با داده واقعی نویسنده، عنوان، تصویر، تاریخ اصلی انتشار، تاریخ اصلاح واقعی و URL canonical تولید شود.
5. schema با متن قابل مشاهده صفحه تطبیق داده شود؛ داده ساختگی، review یا rating اضافه نشود.
6. صفحات حقوقی باید منابع اولیه، حوزه قضایی، تاریخ بررسی و حدود کاربرد را روشن کنند.
7. صفحات شهری فقط در صورت وجود ارزش مستقل، خدمت واقعی و اطلاعات محلی تأییدشده ساخته شوند.
8. عملکرد را با داده میدانی CWV و آزمایشگاه Lighthouse جداگانه بسنج.
9. Search Console generative AI performance را فقط در صورت دسترسی واقعی property پایش کن؛ عدم مشاهده گزارش را به‌عنوان صفر citation یا جریمه تفسیر نکن.

## Search Console: گزارش عملکرد جست‌وجوی مولد

از ۳۱ اوت ۲۰۲۶ گزارش Generative AI performance برای وب‌سایت‌ها در Search Console به‌صورت جهانی عرضه شده است. گزارش Search، impressionهای AI Overviews و AI Mode را با ابعاد صفحه، کشور، دستگاه و تاریخ نشان می‌دهد؛ گزارش Discover جداگانه است.

این گزارش impression است، نه شمارش citation، کلیک یا سرنخ. نبود گزارش معمولاً می‌تواند ناشی از impression ناکافی یا خارج بودن سایت از شمول تجربه‌های مولد باشد. تا زمانی که Google در Search Analytics API بُعد یا فیلد رسمی برای این داده منتشر نکند، آن را از UI Search Console بررسی می‌کنیم و endpoint یا dimension فرضی نمی‌سازیم. اتصال API موجود پروژه صرفاً Search Analytics استاندارد است.

منابع:
- معرفی رسمی گزارش: https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports
- راهنمای گزارش Search: https://support.google.com/webmasters/answer/16984139

## Local SEO و نمایه کسب‌وکار

Google Business Profile باید نام واقعی و ثابت کسب‌وکار را مطابق تابلو، اسناد و وب‌سایت نشان دهد؛ افزودن کلیدواژه یا شعار به نام مجاز نیست. آدرس و محدوده خدمت باید دقیق و واقعی باشد. دفتر مجازی، نشانی غیرواقعی یا چند نمایه برای یک محل ایجاد نمی‌شود. اگر دفتر برای مراجعه موکلان فعال است، اطلاعات مکانی و تلفن باید با وضعیت واقعی تطبیق داده شود.

LocalBusiness schema گوگل برای rich result به نام و آدرس فیزیکی نیاز دارد. تا زمانی که آدرس دقیق عمومی دفتر و تطابق آن با صفحه تماس/پروفایل تأیید نشده، نباید نشانی یا مختصات تخمینی به JSON-LD اضافه شود. داده سازمانی باید در صفحه اصلی یا صفحه معرفی کسب‌وکار متمرکز باشد، نه اینکه بی‌دلیل در تمام صفحات تکرار شود.

## سیاست محتوای ضداسپم

Google تولید انبوه صفحات کم‌ارزش، بازنویسی ماشینی یا جایگزینی نام شهرها در صفحات مشابه را مصداق بالقوه scaled content abuse و doorway abuse می‌داند. پوشش شهرهای خوزستان باید از راه محتوای واقعاً متمایز و اطلاعات خدمت واقعی انجام شود، نه تولید ده‌ها صفحه تقریباً یکسان. مقاله حقوقی باید ارزش افزوده، تحلیل مستقل و استناد اولیه داشته باشد.

## Google News

Google News ناشر خبری را صرفاً بر اساس تعداد مقاله یا NewsArticle schema انتخاب نمی‌کند. الزامات فنی شامل URL یکتا و پایدار، HTML قابل خزش، لینک متنی از صفحات بخش، عنوان و تاریخ آشکار و محتوای مقاله قابل خواندن است. سیاست‌های News بر شفافیت نویسنده/ناشر، تاریخ، اطلاعات سازمان و تماس، عدم گمراه‌سازی و افشای محتوای حمایت‌شده تأکید دارند.

News sitemap برای ناشر واقعی مفید است و فقط URLهای مقاله‌های منتشرشده در 48 ساعت اخیر را نگه می‌دارد. فایل باید پایدار و به‌روزرسانی‌شونده باشد، نه اینکه با هر انتشار از نو ساخته شود.

**تصمیم پروژه:** در وضعیت فعلی، Vakilsite باید ابتدا کیفیت مرجع حقوقی و تحریریه را بسازد. ایجاد News sitemap یا معرفی خود به‌عنوان ناشر خبری تا زمانی که فرایند واقعی خبر، نویسنده، زمان انتشار، اصلاحیه و سیاست تحریریه وجود ندارد، انجام نمی‌شود.

## منابع رسمی

- Google AI features: https://developers.google.com/search/docs/appearance/ai-features
- Google AI optimization guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Site names: https://developers.google.com/search/docs/appearance/site-names
- Article structured data: https://developers.google.com/search/docs/appearance/structured-data/article
- News sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
- Google News technical guidelines: https://support.google.com/news/publisher-center/answer/9606708
- Google News policies: https://support.google.com/news/publisher-center/answer/6204050
- Google Business Profile representation guidelines: https://support.google.com/business/answer/3038177
- LocalBusiness structured data: https://developers.google.com/search/docs/appearance/structured-data/local-business
- Organization structured data: https://developers.google.com/search/docs/appearance/structured-data/organization
- Google Search spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- Search Console Search Analytics: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Search Console quotas: https://developers.google.com/webmaster-tools/limits

## عدم قطعیت‌ها

- ایندکس، ranking، AI citation و Google News inclusion تضمین‌شدنی نیست.
- Search Console API داده top rows و سهمیه محدود دارد؛ برای completeness فرض نکن.
- داده Search Console واقعی property و CrUX/Lighthouse هنوز باید با دسترسی مالک/دامنه اندازه‌گیری شود.
