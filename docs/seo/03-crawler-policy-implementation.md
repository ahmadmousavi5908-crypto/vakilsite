# 03 — سیاست خزنده‌ها و اعتبارسنجی دسترسی موتورهای جست‌وجو

**وضعیت:** سیاست اجرایی پیشنهادی برای شاخهٔ یکپارچه؛ robots.txt در همین شاخه آزمون واحد دارد.  
**آخرین بازبینی منابع:** ۴ نوامبر ۲۰۲۶

## هدف

قابلیت کشف و استناد محتوای عمومی حقوقی در Google، Bing/Copilot، ChatGPT Search، Claude Search و Perplexity حفظ شود؛ دسترسی خزنده‌های آموزش مدل مستقل از خزنده‌های جست‌وجو تصمیم‌گیری شود؛ صفحات خصوصی و API در نقشه سایت یا اعلان IndexNow قرار نگیرند.

## ماتریس تصمیم

| Token | کارکرد اعلام‌شده | سیاست فعلی |
|---|---|---|
| Googlebot | جست‌وجوی Google و تجربه‌های AI متصل به Search | مجاز |
| Bingbot | جست‌وجوی Bing و Copilot grounding | مجاز |
| OAI-SearchBot | کشف و نمایش در ChatGPT Search | مجاز |
| Claude-SearchBot | کیفیت و نمایه‌سازی جست‌وجوی Claude | مجاز |
| PerplexityBot | نمایه‌سازی برای پاسخ‌های جست‌وجوی Perplexity | مجاز |
| GPTBot | جمع‌آوری وب برای توسعه مدل‌های OpenAI | مسدود، مستقل از Search |
| ClaudeBot | جمع‌آوری داده برای توسعه مدل‌های Anthropic | مسدود، مستقل از Search |
| Google-Extended | کنترل استفاده در Gemini Apps/مدل‌ها، نه user-agent مستقل | مسدود به‌عنوان کنترل استفاده |
| Claude-User | واکشی به درخواست کاربر؛ Anthropic می‌گوید robots را رعایت می‌کند | از قانون عمومی مجاز پیروی می‌کند |
| ChatGPT-User | واکشی ناشی از درخواست کاربر؛ robots ممکن است اعمال نشود | ادعای کنترل دسترسی با این token نمی‌شود |
| Perplexity-User | واکشی ناشی از درخواست کاربر؛ معمولاً robots را نادیده می‌گیرد | ادعای کنترل دسترسی با این token نمی‌شود |

## اصول اجرایی

1. robots.txt ابزار کنترل crawl است، نه احراز هویت یا حفاظت اطلاعات. مسیرهای admin و API باید با auth و کنترل دسترسی واقعی محافظت شوند؛ Disallow به‌تنهایی داده را خصوصی نمی‌کند.
2. اجازه به search crawlerها به معنای تضمین crawl، index، ranking یا citation نیست.
3. GPTBot، ClaudeBot و Google-Extended را با Search crawlerها یکی نکنید؛ تصمیم آموزش/استفاده از محتوا از تصمیم دیده‌شدن در جست‌وجو جداست.
4. User-agent به‌تنهایی قابل جعل است. در WAF/CDN، قبل از allow/block بر اساس IP، فهرست رسمی و جاری همان اپراتور و روش تأیید هویت خزنده را بررسی کنید.
5. OpenAI فهرست IP رسمی هر crawler را منتشر می‌کند؛ Perplexity نیز IP JSON رسمی دارد. Anthropic اعلام کرده فعلاً IP range عمومی منتشر نمی‌کند و توصیه می‌کند برای opt-out به robots.txt تکیه شود؛ پس IP ثابت ساختگی تعریف نکنید.
6. robots.txt نباید مسیرهای ضروری رندر، CSS، JS یا تصاویر معنادار را ببندد.
7. robots، sitemap و canonical باید یک origin واحد HTTPS داشته باشند. دامنه واقعی هنوز توسط مالک تعیین و روی deployment آزمایش نشده است.

## وضعیت پیاده‌سازی

- src/app/robots.js: wildcard همه را به‌طور پیش‌فرض مجاز می‌کند و مسیرهای admin و API را از crawl منع می‌کند؛ search botهای اصلی به‌صورت صریح مجازند؛ GPTBot، ClaudeBot و Google-Extended مسدودند.
- tests/site-url/robots.test.mjs: سیاست گروه‌ها و معرفی sitemap را بررسی می‌کند.
- src/app/sitemap.js: فقط مسیرهای عمومی تعریف‌شده و رکوردهای قابل نمایه‌سازی را می‌سازد.
- scripts/submit-indexnow.mjs: فقط URLهای origin اصلی و عمومی را می‌پذیرد؛ query/fragment، host خارجی و مسیرهای admin/API رد می‌شوند.
- scripts/indexnow-validation.mjs: قالب کلید و مسیرهای خصوصی را اعتبارسنجی می‌کند؛ آزمون در scripts/indexnow-validation.test.mjs قرار دارد.

## IndexNow

- فقط URL تازه ایجادشده، به‌روزشده یا حذف‌شده ارسال شود؛ ارسال تکراری کل sitemap توصیه نمی‌شود.
- کلید باید ۸ تا ۱۲۸ نویسه با مجموعه مجاز حروف انگلیسی، عدد و خط تیره باشد؛ مستند رسمی IndexNow در متن خود واژه hexadecimal را نیز به‌کار برده اما مجموعه کاراکتر مجاز را صریحاً حروف a-z/A-Z، اعداد و dash اعلام می‌کند. پیاده‌سازی از مجموعه کاراکتر صریح پیروی می‌کند.
- فایل کلید باید از مسیر اعلام‌شده در keyLocation با محتوای منطبق و بدون احراز هویت قابل دریافت باشد.
- HTTP 200/202 فقط پذیرش اعلان را نشان می‌دهد، نه index شدن یا رتبه گرفتن.
- کلید واقعی و فایل عمومی آن تا تعیین دامنه و تأیید مالکیت تنظیم نمی‌شود.

## چک‌لیست پس از استقرار

1. با URL Inspection در Search Console، HTML رندرشده، canonical انتخابی Google و وضعیت index صفحات اصلی/مقالات را بررسی کنید.
2. sitemap را در Search Console و Bing Webmaster Tools ثبت و خطاهای parse/fetch را بررسی کنید.
3. در Bing Webmaster Tools، IndexNow status و AI Performance را بررسی کنید؛ citation معادل کلیک یا رتبه نیست.
4. لاگ‌های CDN/origin را برای user-agent، IP، مسیر، status، latency و نرخ خطا تحلیل کنید؛ خزنده جعلی را از روی UA تنها مجاز نکنید.
5. دسترسی واقعی OAI-SearchBot، Claude-SearchBot و PerplexityBot را در لاگ‌های پس از استقرار تأیید کنید.
6. مسیرهای admin/API را با نشست ناشناس و نقش‌های مختلف تست کنید؛ robots.txt را کنترل امنیتی حساب نکنید.
7. بعد از تغییر محتوا، فقط URLهای تغییرکرده را به IndexNow بفرستید و نتیجه پذیرش را ثبت کنید.

## منابع رسمی

- Google Search Central: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Google crawler management: https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers
- Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
- Bing AI Performance: https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c
- OpenAI crawler reference: https://developers.openai.com/api/docs/bots
- Anthropic crawler policy: https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Perplexity crawler policy: https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- IndexNow protocol: https://www.indexnow.org/documentation
