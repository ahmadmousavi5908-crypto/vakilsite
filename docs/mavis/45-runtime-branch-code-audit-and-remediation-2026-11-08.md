# ممیزی کد شاخه MAVIS و اولویت اصلاحات اجرایی
نسخه: 1.0 | تاریخ: 2026-11-08
شاخه بررسی‌شده: `integration/mavis-runtime-reconciliation-20261108`
روش: بررسی remote و فقط‌خواندنی؛ بدون checkout محلی، تغییر runtime یا استقرار
وضعیت: یافته‌های محدود به فایل‌های مشاهده‌شده در شاخه؛ تطبیق با Mother Two محلی هنوز الزامی است.

## 1. خلاصه اجرایی
در شاخه بررسی‌شده، یک هسته اولیه و تست‌پذیر برای چت عمومی وجود دارد، اما محصول هنوز چت حقوقی واقعی یا سامانه عملیاتی MAVIS نیست. UI فعلی بیشتر یک فرم Intake سه‌مرحله‌ای است که متن آماده را به WhatsApp می‌برد. هسته backend از mock provider استفاده می‌کند، feature flag پیش‌فرض خاموش است و در مسیرهای API بررسی‌شده Route Handler مکالمه پیدا نشد.

**حکم:** No-Go برای فعال‌سازی عمومی یا استفاده با داده واقعی. این حکم درباره شاخه remote بررسی‌شده است، نه نسخه محلی Mother Two که هنوز باید تطبیق شود.

## 2. دامنه و شواهد
فایل‌های مشاهده‌شده در شاخه:
- `src/lib/mavis/contracts.mjs`
- `src/lib/mavis/errors.mjs`
- `src/lib/mavis/mock-provider.mjs`
- `src/lib/mavis/public-chat.mjs`
- `src/lib/mavis/public-policy.mjs`
- `src/components/mavis/PublicIntake.jsx`
- `tests/mavis/public-chat.test.mjs`
- `.github/workflows/mavis-core.yml`
- `src/app/ai-assistant/page.js`
- `src/app/admin/page.js`
- `src/lib/supabase/admin.js`
- `src/app/robots.js` و `src/app/sitemap.js`
- `docs/mavis/17-core-foundation-status.md`

محدودیت: این بررسی از طریق فایل‌های remote منتخب است؛ full tree، working tree ترموکس، Mother Two archive، Supabase live schema، secrets، production headers، Search Console و Bing account در دسترس نبوده‌اند. 404 در مسیرهای API آزمایش‌شده فقط نبود همان مسیر در ref را نشان می‌دهد، نه نبود هر endpoint احتمالی در کل مخزن.

## 3. یافته‌های مثبت
1. `MAVIS_PUBLIC_ENABLED` باید صریحاً `true` باشد؛ در غیر این صورت هسته با 503 متوقف می‌شود.
2. اعتبارسنجی ورودی محدودیت طول پیام، تعداد و اندازه history و فقط نقش user را اعمال می‌کند؛ جعل پیام assistant از history کلاینت رد می‌شود.
3. mock provider به‌وضوح اعلام می‌کند که مدل واقعی متصل نیست و متن خام کاربر را بازتاب نمی‌دهد.
4. خطای داخلی به پاسخ عمومی امن تبدیل می‌شود و request ID برمی‌گردد.
5. تست واحد برای ورودی، تاریخچه جعلی، سقف history، feature flag، mock، خطای داخلی، سقف خروجی و عدم افشای usage metadata وجود دارد.
6. صفحه Intake توضیح می‌دهد که متن فرم در سایت ذخیره نمی‌شود و کاربر پیش از بازکردن WhatsApp checkbox تأیید را فعال می‌کند.
7. Admin فعلی در فایل مشاهده‌شده صرفاً موقعیت دفتر و social links را مدیریت می‌کند؛ این صفحه را نباید پنل عملیاتی MAVIS فرض کرد.

## 4. نقص‌های اجرایی مشاهده‌شده

### P0 — مسدودکننده فعال‌سازی
**F-01: نبود مسیر end-to-end**
- `runPublicChat` و تست‌ها وجود دارند، اما در مسیرهای متعارف `src/app/api/ai-assistant/route.js` و `src/app/api/mavis/chat/route.js` فایل پیدا نشد.
- سند 17 نیز می‌گوید Route Handler و Provider واقعی ایجاد نشده‌اند.
- اثر: هسته از UI قابل فراخوانی نیست و نباید به‌عنوان چت آنلاین معرفی شود.
- اصلاح: ابتدا قرارداد API، احراز مجوز، atomic rate limit، timeout، quota، audit و kill switch طراحی و تست شوند؛ سپس route فقط با mock و در staging ساخته شود.

**F-02: نبود rate limiter و budget اجرایی**
- در فایل‌های هسته مشاهده‌شده rate limiter اتمیک، سهمیه کاربر/IP، concurrency cap، budget و kill switch دیده نشد.
- اثر: در صورت افزودن Provider یا endpoint، خطر abuse و هزینه کنترل‌نشده.
- اصلاح: Port مستقل برای rate limit و usage ledger؛ انتخاب backend فقط پس از بررسی سرویس موجود و بار واقعی. در مرحله اول بدون Provider پولی.

**F-03: Provider واقعی وجود ندارد**
- mock provider تنها adapter مشاهده‌شده است؛ `getPublicAssistantConfig` نام provider را می‌خواند، اما `runPublicChat` provider را از caller دریافت می‌کند و registry/selection اجرایی در فایل‌های بررسی‌شده دیده نشد.
- اثر: هیچ پاسخ هوش مصنوعی واقعی تولید نمی‌شود.
- اصلاح: Provider Port/registry با allowlist و قابلیت خاموش‌سازی؛ اتصال provider فقط پس از ارزیابی جغرافیا، قرارداد، privacy، هزینه و کیفیت فارسی.

**F-04: مدل مجوزدهی MAVIS در Admin اثبات نشده**
- صفحه Admin مشاهده‌شده تنها با `requireAdmin` و RPC `is_site_admin` کنترل می‌شود و settings دفتر/social links را مدیریت می‌کند.
- ماتریس نقش‌های مستقل سه بازو، RLS اختصاصی MAVIS و کنترل record-level در این فایل‌ها اثبات نشده‌اند.
- اصلاح: ماتریس role × arm × data class × operation؛ authorization سمت سرور و RLS/grants؛ تست‌های منفی cross-user/cross-arm. نقش عمومی سایت به‌تنهایی مجوز MAVIS نیست.

### P1 — کیفیت Intake و حفاظت داده
**F-05: Intake هنوز جامع و شرطی نیست**
- فرم مشاهده‌شده سه مرحله دارد: موضوع، مرحله/فوریت، و هماهنگی. جزئیات اختیاری، شهر و شرح 500 کاراکتری دارد.
- چک‌لیست مدارک شرطی و درخت پرسش‌های تخصصی کامل برای موضوعات حقوقی مشاهده نشد.
- اصلاح: طراحی پرسش‌نامه جامع مبتنی بر موضوع، بدون حذف پرسش لازم؛ گروه‌بندی و فشرده‌سازی فقط در ارتفاع/چیدمان. هر موضوع schema و شرط نمایش نسخه‌دار داشته باشد.

**F-06: متن راهنمای موضوعی ممکن است از مرز Intake عبور کند**
- آرایه `guidance` در `PublicIntake.jsx` برای هر موضوع توصیه‌های عملی مانند نگهداری اصل مدارک یا حفظ پیام‌ها دارد؛ با اینکه disclaimer می‌گوید تحلیل پرونده نیست.
- این با تعریف مصوب «گزارشگر پاسخ‌های خود کاربر، بدون تحلیل/تفسیر حقوقی» مرز روشنی ندارد.
- اصلاح: تبدیل به پرسش‌های خنثی و چک‌لیست هماهنگی/مدارک، با تأیید وکیل؛ حذف هر توصیه موردی از مسیر Intake. هشدار فوریت و ارجاع مستقیم جداگانه و فقط برای ایمنی حفظ شود.

**F-07: انتقال اطلاعات به WhatsApp، داده را از سایت خارج می‌کند**
- فرم ادعا می‌کند داده در سایت ذخیره نمی‌شود و پیام فقط پس از انتخاب کاربر در WhatsApp باز می‌شود؛ این درست است در حد کد مشاهده‌شده، اما پس از ارسال، داده در سرویس ثالث و حساب مقصد پردازش می‌شود.
- اصلاح: اطلاع‌رسانی دقیق پیش از بازکردن پیام: داده چه چیزی است، مقصد چیست، چه کسی ارسال می‌کند، ارسال اختیاری است و پیام پس از ارسال تابع سیاست WhatsApp/دفتر است. برای نسخه‌های آینده مسیر امن‌تر و حداقل‌گرایانه با رضایت جداگانه بررسی شود.

**F-08: رضایت و اطلاع‌رسانی نیاز به تفکیک دارد**
- checkbox فعلی صرفاً تأیید می‌کند فرم مشاوره اختصاصی نیست و پیام در WhatsApp باز می‌شود؛ رضایت پردازش/انتقال داده، اطلاعیه حریم خصوصی و رضایت جداگانه برای پیام‌های تبلیغاتی/همراهان در UI بررسی‌شده تفکیک نشده‌اند.
- اصلاح: consentهای مستقل و اختیاری، بدون پیش‌انتخاب؛ لینک سیاست حریم خصوصی؛ ثبت حداقل metadata رضایت فقط اگر سرور و مبنای قانونی تصویب شد.

**F-09: شماره WhatsApp fallback در client**
- شماره دفتر به‌صورت fallback در کد client وجود دارد.
- شماره عمومی راز محسوب نمی‌شود، اما fallback می‌تواند در محیط اشتباه، پیام را به مقصد نادرست هدایت کند.
- اصلاح: شماره عمومی از config محیطی واحد و اعتبارسنجی‌شده؛ build/CI باید در production نبود مقدار معتبر را خطا دهد، نه اینکه شماره ثابت fallback شود.

### P2 — کیفیت، نگهداری و کشف‌پذیری
**F-10: خروجی Provider صرفاً از نظر رشته و طول بررسی می‌شود**
- `runPublicChat` نوع string، خالی نبودن و سقف طول را بررسی می‌کند؛ schema ساختاریافته برای citation، safety flags یا refusal در این مسیر مشاهده نشد.
- اصلاح: contract پاسخ نسخه‌دار؛ خروجی به‌صورت متن plain، بدون HTML خام؛ اگر retrieval/citation اضافه شد، citation object و resolver مستقل الزامی.

**F-11: تاریخچه مکالمه فاقد پیام assistant است**
- قرارداد history فقط role=user را می‌پذیرد و تست جعل assistant را رد می‌کند؛ برای جلوگیری از جعل نقش، این خوب است، اما UX چت چندنوبتی نیازمند نگهداری server-side یا امضای context است.
- اصلاح: تا پیش از persistence امن، UI این هسته را چت مکالمه‌ای معرفی نکند. بعداً history از سمت سرور و با شناسه session مجاز ساخته شود، نه از آرایه قابل جعل کلاینت.

**F-12: CI محدود به تست واحد است**
- workflow مشاهده‌شده فقط `npm run test:mavis-core` را اجرا می‌کند و push trigger آن به `feature/mavis-core-foundation` محدود است؛ PR trigger با path filters وجود دارد.
- اصلاح: برای شاخه release candidate، clean install با lockfile، unit، lint، build، integration، dependency/secret scan، accessibility و smoke tests؛ هر check به commit دقیق release متصل شود.

**F-13: sitemap مشاهده‌شده فاقد lastModified واقعی است**
- تابع sitemap فقط path، changeFrequency و priority به `buildSitemapEntries` می‌دهد؛ `lastModified` واقعی در این فایل مشاهده نشد.
- اصلاح: فقط از تاریخ معتبر منبع محتوا استفاده شود؛ اگر تاریخ قابل اثبات نیست، lastmod جعلی نسازیم. قبل از تغییر با Mother Two تطبیق شود.

**F-14: robots به‌تنهایی دسترسی یا ایندکس را تضمین نمی‌کند**
- robots.js در شاخه بررسی‌شده crawlerهای Search را از GPTBot جدا کرده است. این تمایز درست است، اما robots.txt کنترل دسترسی نیست و CDN/WAF/HTTP status/canonical/indexability باید مستقل بررسی شوند.
- اصلاح: تست HTTP از بیرون برای robots، sitemap، canonical، redirect، status، headers و نمونه صفحات. OAI-SearchBot مجاز بودن فقط یک شرط است، نه اثبات نمایش در ChatGPT.

## 5. اولویت اصلاح با کمترین هزینه
1. ابتدا فقط با mock: قرارداد Intake، حریم خصوصی، authorization و rate-limit adapter.
2. اجرای تست‌های منفی و CI روی شاخه مستقل، بدون اتصال provider واقعی.
3. بازطراحی Intake با سؤال‌های خنثی و چک‌لیست شرطی؛ تأیید محتوا توسط وکیل.
4. طراحی Admin Knowledge Center و Article Intelligence به‌عنوان ماژول داخل پنل فعلی، نه سامانه جدا.
5. اتصال registry/legal-library موجود پس از inventory و اعتبارسنجی provenance.
6. provider واقعی تنها پس از عبور از دروازه جغرافیا/شرایط/حریم خصوصی/بودجه.
7. آزمون SEO از محیط production و Search Console/Bing؛ هیچ تغییر در robots/sitemap پیش از تطبیق Mother Two.

## 6. تصمیم معماری
- حفظ Modular Monolith و هسته mock-first.
- استفاده از کد قطعی برای فرم، policy، validation، routing، report، quota و approval.
- مدل زبانی تنها برای وظایف معنایی که ارزش افزوده قابل اندازه‌گیری دارند.
- هیچ microservice، vector database یا SaaS پولی تا زمانی که benchmark نیاز آن را ثابت نکرده، اضافه نشود.
- Public Intake، Lawyer Copilot و Growth Intelligence در کد، policy، داده و مجوز جدا؛ registry مشترک فقط با retrieval gateway و فیلتر مجوز.

## 7. اصلاح مرجع امنیتی
در تاریخ این سند، مرجع جاری OWASP برای ریسک‌های LLM، نسخه **OWASP GenAI LLM Top 10 2026** است که 3 اوت 2026 منتشر شده؛ بنابراین سندهای پروژه نباید نسخه 2025 را «آخرین نسخه» معرفی کنند. نسخه 2025 فقط برای ردیابی تاریخی حفظ شود.
- 2026 resource: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
- 2026 initiative: https://genai.owasp.org/initiative/owasp-top-10-for-llm-and-genai/
- 2026 announcement: https://genai.owasp.org/2026/09/01/owasp-genai-security-project-unveils-2026-top-10-for-llm-applications-new-agent-control-standard-and-sponsors-as-community-tops-30000-members/
- Agent Control Standard: https://genai.owasp.org/resources/
- OpenAI crawler policy: https://developers.openai.com/api/docs/bots

برنامه امنیت MAVIS باید نسخه 2026 را برای threat mapping و test cases مبنا قرار دهد و در صورت استفاده از agent/toolهای عملیاتی، Agent Control Standard را نیز به‌عنوان مرجع کنترل runtime بررسی کند.

## 8. وضعیت آزمون و تحویل
- در این نوبت تست runtime یا CI جدید اجرا نشده است.
- Workflow runs و commit statuses برای commit مستندات `21ffba74b745f0637bb4c572b65a61deb2e209e0` خالی بودند؛ این commit فقط README را تغییر داده است. بنابراین CI سبز ادعا نمی‌شود.
- تست‌های داخل repository در شاخه remote موجودند، اما اجرای آن‌ها در Termux/checkout واقعی هنوز لازم است.
- هیچ فایل runtime، دیتابیس، بکاپ مادر دو، ظاهر عمومی، robots یا sitemap تغییر نکرده است.
- این سند به شاخه مستندات افزوده می‌شود؛ ادغام PR و هر اصلاح runtime نیازمند بازبینی و تأیید مالک است.
