# وضعیت عملیاتی SEO / AEO / GEO و جذب موکل

**تاریخ ثبت:** ۱۴ نوامبر ۲۰۲۶  
**برند:** وکیل سید احمد موسوی  
**دامنه:** https://vakilahmadmousavi.ir  
**اولویت بازار:** اهواز ← شهرستان‌های خوزستان ← سراسر ایران  
**هدف تجاری:** جذب درخواست‌های حقوقی واجد شرایط و تبدیل بازدیدکننده به تماس/درخواست مشاوره؛ نه صرفاً افزایش بازدید.

> این سند وضعیت اجرایی را به‌روز می‌کند و بر یادداشت‌های ممیزی اولیه ۴ نوامبر مقدم است. «کد موجود»، «سرویس متصل»، «داده دریافت‌شده» و «نتیجه تجاری» وضعیت‌های جداگانه‌اند.

## 1. خلاصه وضعیت

| حوزه | وضعیت تأییدشده |
|---|---|
| SEO فنی | زیرساخت canonical، sitemap، robots، متادیتا و آزمون‌های CI موجود؛ خزش ۵۰ URL انجام شده |
| خزش اخیر | ۵۰ URL دریافت‌شده؛ ۴۹ پاسخ ۲۰۰ و یک ۳۰۷؛ میانگین پاسخ ۳۷ms و بیشینه ۹۸ms در همان خزش |
| خطاهای خزش | در گزارش نهایی آن خزش خطای canonical، عنوان طولانی، توضیح متا و ترتیب heading مشاهده نشد |
| Google Search Console | پنل مدیریتی و client فقط‌خواندنی در کد وجود دارد؛ اتصال OAuth واقعی و داده property هنوز تأیید نشده |
| Bing Webmaster | مسیر طراحی/راهنما وجود دارد؛ مالکیت و اتصال زنده تأیید نشده |
| IndexNow | workflow کلید اختیاری را آماده می‌کند؛ secret با نام INDEXNOW_KEY تنظیم نشده، پس اعلان URL غیرفعال است |
| Google/Bing verification | workflow secrets را می‌پذیرد؛ GOOGLE_SITE_VERIFICATION و BING_SITE_VERIFICATION هنوز خالی‌اند |
| AI Visibility | ردیاب OpenSEO برای بازار ایران در دسترس/تأیید نشده؛ پروژه فعلی پیش‌فرض US/en دارد |
| Core Web Vitals | خزش HTTP، Lighthouse یا داده RUM جایگزین سنجش LCP/INP/CLS نیست؛ هنوز baseline معتبر میدانی نداریم |
| WAF/CDN | robots اجازه می‌دهد، اما عبور واقعی خزنده‌ها از Cloudflare WAF/Bot Protection با لاگ تأیید نشده |
| Google News | ناشر خبری و چرخه تحریریه مستقل تأیید نشده؛ News sitemap فعلاً ساخته نشود |
| تبدیل و جذب موکل | رویدادهای قیف تماس/فرم و کیفیت سرنخ با داده واقعی هنوز baseline ندارند |

منبع خزش: OpenSEO audit با شناسه `69657734-7c3b-48cc-ab2d-5d2c7a5e1842`، ۵۰ URL، بدون Lighthouse. زمان پاسخ خزنده معیار تجربه کاربر یا Core Web Vitals نیست.

## 2. دارایی‌های موجود در main

- ۸ سند راهبردی در `docs/seo/01` تا `docs/seo/08` و README.
- ۳۵۳ عبارت جست‌وجوی فارسی، خوشه‌های موضوعی و نقشه نگاشت URL.
- رجیستری منابع حقوقی و سیاست تأیید منبع اولیه.
- robots و sitemap پویا، canonical، داده‌های ساختاریافته و اسکریپت IndexNow.
- پنل مدیریتی MAVIS برای گزارش Search Console و مبدل/اعتبارسنجی پاسخ Search Analytics.
- تحلیل‌گر داخلی opportunity برای مرتب‌سازی ردیف‌های Search Console؛ امتیاز داخلی آن رتبه Google یا پیش‌بینی موفقیت نیست.

درخت مخزن `main` در تاریخ ثبت این سند شامل ۸ سند SEO به‌علاوه README است. برخی طرح‌ها و قابلیت‌های رشد در شاخه‌های قدیمی وجود دارند و نباید با ادغام کامل شاخه‌های واگرا وارد نسخه اصلی شوند. انتقال هر قابلیت باید گزینشی، تست‌شده و در PR مستقل باشد.

## 3. سیاست خزنده‌ها و دسترسی AI

سیاست robots فعلی در `src/app/robots.js`:

| سامانه | توکن/رفتار | سیاست فعلی |
|---|---|---|
| Google Search و AI Overviews/AI Mode | Googlebot | مجاز؛ این قابلیت‌های Search به ایندکس و شرایط عادی Google Search متکی‌اند |
| ChatGPT Search | OAI-SearchBot | مجاز |
| استفاده آموزشی OpenAI | GPTBot | مسدود |
| Claude Search | Claude-SearchBot و Claude-User | مجاز |
| استفاده آموزشی Anthropic | ClaudeBot | مسدود |
| Perplexity | PerplexityBot و Perplexity-User | مجاز |
| Gemini Apps / Vertex AI grounding | Google-Extended | مسدود |
| Grok و DeepSeek | crawler token اختصاصیِ رسمی و قابل راستی‌آزمایی در اسناد بررسی‌شده پیدا نشد | wildcard عمومی مجاز است؛ توکن حدسی اضافه نشود |
| Common Crawl | CCBot | به‌واسطه wildcard مجاز است؛ این دسترسی غیرمستقیم می‌تواند به آرشیو وب عمومی و برخی مجموعه‌داده‌ها کمک کند |

**تمایز Google:** Google-Extended کنترل جداگانه‌ای برای استفاده از محتوای خزیده‌شده در آموزش مدل‌های آینده Gemini و grounding در Gemini Apps و Vertex AI است. مسدودکردن آن، حضور در Google Search یا رتبه‌بندی Google Search را مسدود نمی‌کند. AI Overviews و AI Mode به Googlebot، ایندکس Search و کنترل Search generative AI در Search Console وابسته‌اند.

**تصمیم مالک لازم:** بازکردن Google-Extended می‌تواند امکان grounding در Gemini Apps را فراهم کند، اما با سیاست فعلی محدودکردن استفاده از محتوا برای Gemini تعارض دارد. این تغییر بدون تأیید مالک انجام نشود. همچنین CCBot اکنون با wildcard مجاز است؛ مسدودکردن آن تصمیمی جداگانه درباره آرشیو عمومی و استفاده غیرمستقیم در داده‌های آموزش است.

Robots به‌تنهایی کافی نیست. WAF و Bot Protection در Cloudflare باید با User-Agent، IPهای رسمی منتشرشده، reverse DNS یا روش تأیید خود ارائه‌دهنده بررسی شوند. هیچ User-Agent ناشناخته‌ای صرفاً به‌خاطر نامش معتبر فرض نشود.

## 4. محدودیت‌های جغرافیایی و تبلیغات

- Google Business Profile رسماً از کسب‌وکارهای مستقر در ایران پشتیبانی نمی‌کند.
- Google Ads ایران را در فهرست مناطق غیرقابل استفاده و غیرقابل هدف‌گیری قرار داده است. راهکار دورزدن تحریم یا ساخت حساب/موقعیت جعلی توصیه نمی‌شود.
- این محدودیت‌ها به معنی ناممکن‌بودن SEO محلی نیست. برای اهواز و خوزستان باید از محتوای محلی واقعی، اطلاعات دفترِ تأییدشده، صفحات خدمات منطقه‌ای با ارزش مستقل، منابع و فهرست‌های معتبر محلی/حرفه‌ای و لینک‌های واقعی استفاده شود.
- شهرهایی که فقط از آن‌ها درخواست آنلاین پذیرفته می‌شود نباید به‌عنوان دفتر یا شعبه فیزیکی معرفی شوند.
- ضوابط تبلیغ و معرفی خدمات وکالتی باید با مقررات جاری مرجع صادرکننده پروانه خود و نظر مرجع انتظامی مربوط تطبیق داده شود. اطلاعیه‌های کانون وکلای دادگستری را نباید بدون احراز شمول، به عضو مرکز وکلای قوه قضاییه تعمیم داد. تا احراز مقررات اختصاصی، از وعده نتیجه، تضمین رأی، بزرگ‌نمایی، نفی همکاران، review ساختگی، بازاریابی مزاحم و ادعاهای بی‌سند پرهیز شود.

## 5. Google News

- از آوریل ۲۰۲۴ ناشران دیگر نمی‌توانند publication page جدیدی را در Publisher Center ثبت کنند؛ صفحات انتشار به‌صورت خودکار ایجاد می‌شوند.
- ناشران برای واجد بررسی‌شدن در News surfaces نیازی به submit دستی سایت ندارند؛ محتوا به‌صورت الگوریتمی کشف و ارزیابی می‌شود و حضور تضمین نیست.
- News sitemap فقط برای خبرهای واقعی و تازه است و باید فقط URLهای منتشرشده در دو روز اخیر را نگه دارد.
- برای مقالات خبری واقعی، Article/NewsArticle با author، datePublished، dateModified و image منطبق با محتوای قابل مشاهده مفید است؛ تاریخ و نویسنده نباید جعل شوند.
- تا زمان ایجاد چرخه تحریریه واقعی، خبر حقوقی روز، مسئول نویسنده/بازبین و سیاست اصلاحیه، بخش Google News را به‌عنوان «هدف آماده‌سازی» نگه داریم، نه اینکه sitemap صوری بسازیم.

## 6. بازار و ردیابی AI

OpenSEO project فعلی در بازار پیش‌فرض US/en تنظیم شده است. location lookup برای Iran/Ahvaz نتیجه قابل استفاده برنگرداند. بنابراین:

- داده رتبه/کلیدواژه/AI از بازار آمریکا به‌عنوان بازار ایران گزارش نشود.
- AI Visibility Tracker تا پشتیبانی location مناسب ایران یا یک روش معتبر جایگزین، با market اشتباه فعال نشود.
- پایش دستی با prompt ثابت می‌تواند برای ChatGPT، Gemini، Claude، Perplexity و Grok/DeepSeek نمونه‌برداری شود، اما هر نتیجه باید با تاریخ، زبان، منطقه، حالت جست‌وجو، URLهای citation و تکرارها ثبت شود؛ یک پاسخ منفرد نرخ دیده‌شدن را اثبات نمی‌کند.
- Grok و DeepSeek تا زمان وجود ابزار و منبع قابل اتکا، «اندازه‌گیری‌نشده» گزارش شوند.

## 7. GitHub agents بررسی‌شده

| مخزن | ارزیابی |
|---|---|
| `muryulia/google-search-console-mcp` | MIT، Python، سه ابزار read-only برای property، Search Analytics و URL Inspection؛ گزینه کم‌ریسک برای محیط MCP محلی |
| `AminForou/mcp-gsc` | MIT، حدود ۲۰ ابزار؛ read-only پیش‌فرض اما ابزارهای مدیریتی/نوشتن هم دارد و باید محدود شود |
| `Akxan/google-seo-mcp` | حدود ۱۰۲ ابزار و قابلیت‌های write، WordPress و GitHub؛ برای این سایت Next.js/Cloudflare و سیاست read-only نصب مستقیم نشود |

این مخازن در این بررسی روی دستگاه کاربر نصب نشده‌اند. OpenSEO از قبل متصل است و مسیر native برای Search Console دارد؛ اولویت، اتصال همان سرویس و جلوگیری از چندپارگی OAuth و ابزارهاست. هیچ MCP شخص ثالثی به production اضافه نشود.

## 8. موانع و اولویت اجرا

1. مالکیت و اتصال واقعی Google Search Console؛ سپس بررسی Search generative AI control و داده‌های Search Analytics، به‌ویژه query/page/country/device.
2. اتصال Bing Webmaster و بررسی Bing AI Performance در صورت پشتیبانی حساب و منطقه.
3. ثبت secrets اختیاری `GOOGLE_SITE_VERIFICATION`، `BING_SITE_VERIFICATION` و `INDEXNOW_KEY` در GitHub Actions؛ مقادیر در Git یا چت قرار نگیرند.
4. سنجش WAF/Cloudflare برای خزنده‌های رسمی و گرفتن baseline واقعی LCP/INP/CLS با Lighthouse و RUM.
5. طراحی رویدادهای first-party و حداقلی: کلیک تماس، WhatsApp، کپی شماره، شروع/ارسال فرم و سرنخ واجد شرایط؛ بدون ثبت متن پرونده یا اطلاعات حساس.
6. بازبینی نویسنده، تاریخ انتشار/بازبینی، منابع اولیه و Article schema در مقالات؛ داده واقعی و قابل اثبات.
7. بازبینی حقوقی رکوردهای کتابخانه؛ هیچ مدخل فاقد منبع اولیه وارد sitemap/index نشود.
8. تحلیل رقبا و صفحات خدمات با اولویت اهواز، سپس شهرهای خوزستان؛ از doorway pages و صفحات شهری تکراری اجتناب شود.
9. توسعه تدریجی citation و مرجعیت از منابع علمی/حرفه‌ای معتبر؛ خرید لینک، شبکه لینک و review ساختگی ممنوع.
10. توسعه خبر حقوقی فقط در صورت داشتن چرخه تحریریه و منابع رسمی به‌روز.

## 9. مرزهای اجرا

- Search Console و Analytics فقط خواندنی.
- هیچ تغییر عمومی، انتشار محتوا، تغییر WAF، خرید API credit، ارسال پیام به سرنخ یا تماس با اشخاص بدون تأیید صریح.
- هیچ اطلاعات محرمانه پرونده یا موکل به سرویس AI خارجی ارسال نشود.
- ظاهر عمومی، نسخه موبایل و نسخه تأییدشده مادر دو به‌روزشده حفظ شود.
- هیچ نتیجه تجاری، رتبه، citation یا تعداد موکل تضمین نمی‌شود.

## منابع رسمی

- Google Search Essentials: https://developers.google.com/search/docs/essentials
- Google generative AI search guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google AI features: https://developers.google.com/search/docs/appearance/ai-features
- Google-Extended and crawler tokens: https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- Google News eligibility: https://support.google.com/news/publisher-center/answer/9606634
- Google News sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
- Article structured data: https://developers.google.com/search/docs/appearance/structured-data/article
- Google Business Profile supported countries: https://support.google.com/business/answer/6270107
- Google Ads country restrictions: https://support.google.com/google-ads/answer/6163740
- OpenAI crawler documentation: https://developers.openai.com/api/docs/bots
- Anthropic crawler guidance: https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Perplexity crawlers: https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- Common Crawl CCBot: https://www.commoncrawl.org/ccbot
