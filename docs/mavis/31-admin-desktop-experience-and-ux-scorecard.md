# 31 — مشخصات تجربه دسکتاپ، یکپارچگی پنل مدیریت و الگوهای عملیاتی MAVIS
تاریخ: 2026-11-08
وضعیت: طراحی تفصیلی و ارزیابی آمادگی؛ بدون تغییر runtime، CSS، دیتابیس یا انتشار

## 1. تصمیم طراحی
MAVIS باید داخل پنل فعلی مدیریت Vakilsite به‌عنوان یک فضای کاری مستقل و حرفه‌ای قرار بگیرد؛ نه یک سایت موازی، نه یک پنل دوم با ورود جداگانه و نه یک پنجره چت تزئینی. مسیر پیشنهادی پس از ممیزی مسیرها و مجوزهای واقعی: `/admin/mavis` با زیرمسیرهای ماژولار. اگر ساختار موجود پنل نام دیگری دارد، همان ساختار موجود حفظ و فقط یک بخش مستقل MAVIS به آن افزوده می‌شود.

**دو گزینه بررسی‌شده**
- ساخت داشبورد مستقل با ورود و پوسته جدا: رد؛ تجربه دوگانه، تکرار احراز هویت، نگهداری و خطر ناهماهنگی ایجاد می‌کند.
- افزودن فضای کاری مستقل درون پنل موجود با layout و stylesheet scoped: انتخاب؛ یک نقطه ورود، استفاده از مجوزهای فعلی، تجربه یکپارچه و امکان جداسازی کامل ظاهر عمومی.

## 2. اصل حفاظت از سایت عمومی
- هیچ تغییر در صفحه اصلی، صفحه درباره وکیل، Header/Footer، منوی موبایل، داک‌های فعلی، globals.css یا ظاهر عمومی مجاز نیست.
- پنل MAVIS باید فقط در مسیرهای مجاز admin رندر شود؛ CSS با CSS Modules یا scope محلی و بدون selector عمومی.
- layout داخلی پنل فعلی، ورود، session و منطق موجود ابتدا بررسی و reuse می‌شود؛ کد احراز هویت موازی ساخته نمی‌شود.
- لینک منوی MAVIS فقط پس از کنترل authorization سمت سرور دیده می‌شود؛ مخفی‌کردن آیتم به‌تنهایی کنترل امنیتی نیست.
- لینک مستقیم هر زیرمسیر باید در لایه داده/سرور نیز مجوز را کنترل کند.
- هیچ فایل سالم یا داده موجود صرفاً برای یکدست‌سازی بازنویسی نمی‌شود.

## 3. تجربه دسکتاپ ممتاز
هدف نمایشگرهای 1280 تا 1920 پیکسل است؛ پنل نباید نسخه کشیده‌شده موبایل باشد. ساختار پیشنهادی:
- نوار بالای ثابت و کم‌ارتفاع شامل breadcrumb، عنوان فضای کاری، وضعیت محیط (آزمایشی/عملیاتی)، اعلان‌های مهم و منوی حساب.
- سایدبار راست در RTL با عرض هدف 248 تا 272 پیکسل، قابلیت جمع‌شدن به نوار آیکون و برچسب؛ عنوان و آیکون همیشه با هم قابل تشخیص باشند.
- ناحیه محتوای مرکزی با max-width متناسب و فاصله‌گذاری آرام؛ در نمایشگر عریض فضای خالی بی‌هدف ایجاد نشود.
- ستون کناری contextual فقط در صفحات پژوهش/مقاله و فقط وقتی به فهم کار کمک می‌کند؛ در نمای کلی اجباری نیست.
- نوار وضعیت پایین یا اعلان‌های شناور نباید فوکوس یا دکمه‌های اصلی را بپوشانند.
- داک شخصیت MAVIS در پنل ادمین به‌صورت دستیار راهنما/ورود سریع، نه تصویر بزرگ و مزاحم؛ در دسکتاپ می‌تواند در ناحیه ثابت کوچک و کنترل‌شده قرار گیرد. هنگام کار با جدول یا فرم، محتوای اصلی را نپوشاند و قابلیت بستن داشته باشد.
- از نمایش هم‌زمان کارت‌های فراوان خودداری شود؛ هر صفحه یک کار اصلی و حداکثر چند اقدام فرعی روشن داشته باشد.

### 3.1 نقاط شکست واکنش‌گرایی
- >= 1440px: سایدبار کامل، محتوای دو/سه‌ناحیه‌ای در صورت نیاز.
- 1024–1439px: سایدبار جمع‌شونده، محتوای تک‌ستونه/دوستونه محدود.
- 768–1023px: ناوبری فشرده، پنل‌های contextual به drawer یا بخش پایین منتقل شوند.
- <= 767px: الگوی موبایل تأییدشده حفظ شود؛ منوی موبایل و فرم‌ها بدون اسکرول افقی کلی.
- تست در 320، 360، 390، 768، 1024، 1280، 1440 و 1920 CSS px و zoom تا 200%؛ ریزش محتوا و پوشیده‌شدن focus ممنوع.

این اعداد breakpoint اولیه طراحی هستند، نه مجوز تغییر breakpointهای موجود سایت؛ باید با layout واقعی پنل و تست مرورگر نهایی شوند.

## 4. معماری ناوبری و IA پنل
منوی راست‌چین پیشنهادی:
1. نمای کلی MAVIS
2. پذیرش و درخواست‌های ورودی
3. مرکز پژوهش حقوقی
4. کتابخانه و منابع
5. مقالات و گردش انتشار
6. رشد ارگانیک و Search Console
7. Google Ads
8. Bing و کشف‌پذیری
9. اجراها، صف‌ها و خطاها
10. تأییدها و تاریخچه تغییرات
11. اتصال‌ها و تنظیمات

قواعد:
- آیتم‌ها براساس capability واقعی کاربر فیلتر می‌شوند؛ سرور برای هر درخواست مجدداً authorization را بررسی می‌کند.
- نام بخش‌ها فارسی، روشن و ثابت باشد؛ اصطلاح انگلیسی فقط در tooltip یا توضیح تکمیلی.
- تعداد سطوح ناوبری حداکثر دو سطح؛ عنوان صفحه، breadcrumb و active state روشن.
- وضعیت اتصال در منو با رنگ تنها نشان داده نشود؛ متن «متصل نیست»، «فقط خواندنی»، «داده قدیمی» نیز وجود داشته باشد.
- صفحه تنظیمات فقط مدیر دارای مجوز را به credential metadata و اتصال‌ها راه می‌دهد؛ secret خام هرگز به UI بازگردانده نمی‌شود.

## 5. سیستم طراحی داخلی MAVIS
پالت پایه از tokens مستندشده پنل موجود استخراج شود؛ در صورت اختلاف، مقادیر واقعی Mother Two مرجع‌اند. رنگ جدید برای سایت عمومی تعریف نمی‌شود.
- Navy: ساختار، عنوان و ناوبری.
- Gold: اقدام اصلی محدود و نشانه هویت حرفه‌ای؛ برای وضعیت موفق/خطا استفاده نشود.
- Teal/Sage: وضعیت‌های عملیاتی موفق.
- Amber: نیازمند بررسی یا داده قدیمی.
- Red: خطا/ریسک واقعی و اقدام نیازمند توقف.
- Neutral/Paper: سطح اصلی خوانا و خلوت.
- تایپوگرافی فارسی با اعداد قابل خواندن؛ برای شناسه، URL و مقادیر فنی از جهت‌دهی LTR کنترل‌شده استفاده شود.
- آیکون با label؛ آیکون تنها برای عملیات مبهم ممنوع.
- تراکم کنترل‌شده: فضای تنفس برای تصمیم‌های مهم؛ جدول متراکم فقط در فهرست‌های حرفه‌ای.
- هر صفحه یک CTA اصلی و عملیات خطرناک در منوی ثانویه با تأیید مجدد.

## 6. الگوهای صفحه و templateهای استاندارد
تمام templateها باید قابل کپی، ذخیره پیش‌نویس، نسخه‌بندی و ممیزی باشند. پرکردن خودکار هر فیلد با برچسب provenance و وضعیت تأیید همراه است.

### T01 — کارت موضوع پژوهش حقوقی
- شناسه پایدار؛ عنوان پیشنهادی؛ پرسش/مسئله حقوقی؛ هدف مخاطب؛ intent جست‌وجو؛ دسته؛ اولویت و دلیل امتیاز.
- حوزه قضایی: ایران؛ موضوع/شاخه حقوق؛ تاریخ پژوهش و بازه اعتبار.
- واژگان کلیدی اصلی/فرعی و اصطلاحات مترادف؛ intent و پرسش‌های مرتبط.
- وضعیت: discovered، triaged، researching، needs_lawyer_review، approved، rejected، archived.
- دلیل رد/ادغام؛ موارد تکراری؛ مقاله‌های مرتبط موجود.
- هیچ رتبه یا حجم جست‌وجوی تخمینی بدون منبع و تاریخ ثبت نشود.

### T02 — پرونده منبع حقوقی
- source_id؛ عنوان دقیق؛ مرجع صادرکننده؛ نوع منبع؛ شماره؛ تاریخ صدور؛ تاریخ انتشار؛ تاریخ اجرا؛ وضعیت اعتبار.
- URL رسمی؛ URL جایگزین مجاز؛ ناشر؛ زبان؛ jurisdiction؛ تاریخ دریافت؛ وضعیت دسترسی.
- hash فایل اصلی؛ hash متن استخراج‌شده؛ روش استخراج؛ نسخه؛ اصلاح/نسخ/جایگزینی.
- درجه منبع: primary_official، judicial_decision، advisory_opinion، official_research، academic_secondary، commentary.
- review_status: unreviewed، metadata_checked، primary_source_verified، superseded، unavailable، rejected.
- دسترسی A/B/C؛ مجوز نگهداری/استفاده؛ محدودیت حقوقی یا کپی‌رایت.
- تأییدکننده و زمان تأیید.

### T03 — brief پژوهش و انطباق حقوقی مقاله
- پرسش اصلی و دامنه دقیق؛ فرضیات مجاز؛ پرسش‌های خارج از دامنه.
- فهرست قوانین و اصلاحات؛ آرای وحدت رویه؛ آرای هیأت عمومی؛ نظریات مشورتی؛ آرای موردی؛ منابع علمی.
- برای هر مرجع: شماره، تاریخ، مرجع، لینک مستقیم، وضعیت اعتبار، نسبت آن با پرسش و یادداشت بازبین.
- اختلاف دیدگاه‌ها و خلأهای منبع به‌صورت صریح.
- چک‌لیست قانون ایران: مرجع صالح، قلمرو، تاریخ اجرا، اصلاح/نسخ، قواعد انتقالی، استثناها.
- این brief ابزار پژوهش است؛ MAVIS متن مقاله را تولید یا بازنویسی نمی‌کند.

### T04 — metadata مقاله و پیش‌نمایش
- article_id ثابت؛ title؛ slug؛ category؛ summary؛ primary/secondary keywords؛ search intent.
- outline H1/H2/H3؛ FAQ پیشنهادی؛ meta title/description؛ canonical؛ لینک داخلی.
- article_type: Article، BlogPosting یا NewsArticle فقط براساس ماهیت واقعی محتوا.
- author؛ datePublished؛ dateModified؛ تصویر و alt؛ URL پیش‌نمایش.
- منابع و وضعیت اعتبار؛ فیلدهای تأییدشده/نیازمند اصلاح.
- متن اصلی مقاله فقط از محتوای موجود و تأییدشده CMS خوانده می‌شود؛ در این template تولید نمی‌شود.

### T05 — دروازه بازبینی و انتشار
- source review؛ legal review؛ editorial review؛ SEO review؛ preview hash/version.
- تصمیم هر بازبین: approve، request_changes، reject؛ توضیح اجباری برای رد/اصلاح.
- تأیید نهایی وکیل/مدیر مجاز؛ هویت، زمان، نسخه و hash محتوای تأییدشده.
- انتشار فقط همان نسخه تأییدشده؛ هر تغییر بعدی approval را باطل و بازبینی را الزامی می‌کند.
- رویدادهای مجزا: publish_attempted، publish_succeeded، sitemap_updated، indexing_submission_accepted، index_observed، indexing_error.
- ارسال درخواست ایندکس هرگز معادل ایندکس‌شدن گزارش نمی‌شود.

### T06 — گزارش رشد و Ads
- provider و account/property؛ تاریخ شروع/پایان؛ timezone؛ زمان دریافت؛ تازگی داده؛ query filters.
- metric name، تعریف، واحد، aggregation و attribution window.
- مقدار، مقایسه با دوره قبل، منبع و محدودیت داده.
- تفکیک organic، paid و lead-quality؛ «موکل جذب‌شده» تنها با تبدیل معتبر و بررسی انسانی.
- پیشنهاد بهینه‌سازی از داده جداست؛ اجرای تغییر کمپین در فاز نخست ممنوع و read-only.

### T07 — گزارش اجرای job و خطا
- job_id؛ نوع job؛ درخواست‌کننده؛ شروع/پایان؛ وضعیت؛ checkpoint؛ تعداد رکوردها؛ provider.
- retry count؛ idempotency key؛ error code؛ خلاصه امن خطا؛ correlation id.
- لینک به run detail؛ اقدام پیشنهادی؛ قابلیت resume/retry فقط برای نقش مجاز.
- secret، متن کامل پرونده، token یا داده شخصی در log ممنوع.

### T08 — فرم intake و گزارش پاسخ‌ها
- نسخه فرم؛ topic؛ پرسش‌های نمایش‌داده‌شده و شرط نمایش؛ پاسخ صریح؛ فیلد اختیاری/اجباری.
- نسخه checklist؛ متن گزارش نهایی منطبق با پاسخ‌ها؛ تأیید کاربر؛ زمان ارسال.
- هیچ inference درباره جرم، حق، مهلت، احتمال موفقیت یا استراتژی دعوا تولید نمی‌شود.
- داده‌های پرونده تا تصویب سیاست جداگانه Scope C وارد دانش MAVIS نمی‌شوند.

## 7. چرخه کار مدیر؛ کاهش کلیک و خطا
- صفحه اصلی MAVIS فقط «کار بعدی» و وضعیت واقعی را برجسته کند: نیازمند بازبینی، job ناموفق، اتصال قطع، مقاله منتظر approval.
- پژوهشگر/مدیر از یک موضوع به brief، منابع، metadata و preview با حفظ context منتقل شود.
- ذخیره پیش‌نویس خودکار فقط پس از بررسی conflict و نسخه؛ نمایش «ذخیره شد» تنها پس از تأیید سرور.
- عملیات destructive یا بیرونی دو مرحله‌ای: preview دقیق تغییر، سپس تأیید صریح؛ برای انتشار و Ads نام محیط و حساب نشان داده شود.
- Bulk actions فقط برای فیلتر/برچسب/تخصیص امن؛ انتشار گروهی، حذف گروهی و تغییر campaign در فاز اول غیرفعال.
- جدول 300–400+ رکورد با server-side query، stable sort، محدودسازی ستون‌ها و virtualization فقط پس از benchmark.
- هر فیلتر/مرتب‌سازی قابل پاک‌کردن و بازگشت باشد؛ state غیرمحرمانه می‌تواند در URL بماند.
- راهنمای contextual کوتاه، مثال واقعی غیرمحرمانه و tooltip برای واژه‌های فنی.

## 8. دسترس‌پذیری و کیفیت تعامل
هدف طراحی و آزمون بر مبنای WCAG 2.2 AA:
- keyboard کامل؛ tab order منطقی؛ focus واضح و هرگز کاملاً پوشیده نشود.
- کنتراست متن عادی حداقل 4.5:1؛ کنترل‌های ضروری/آیکون‌ها حداقل 3:1 در موارد مشمول.
- رنگ تنها حامل معنا نباشد؛ متن و آیکون وضعیت همراه آن باشد.
- reflow در عرض معادل 320 CSS px؛ بدون از دست رفتن محتوا یا عملکرد.
- اندازه هدف لمس مطابق WCAG 2.2 2.5.8 و ترجیحاً بزرگ‌تر برای کنترل‌های پرتکرار.
- label، description، error summary، ارتباط خطا با فیلد و اعلان وضعیت با live region مناسب.
- reduced motion؛ هیچ animation حیاتی یا flashing.
- زبان صفحه fa-IR، direction RTL؛ قطعات فنی/URL با dir=ltr و bidi isolation.
- جدول‌ها دارای caption/headers و row expansion قابل دسترس.
- آزمون screen reader، keyboard-only، zoom 200% و در صورت امکان 400% reflow.

## 9. امنیت پنل و حفاظت از داده
- authentication و session با سازوکار فعلی پروژه؛ authorization در DAL/route handler/server action و هر data access.
- نقش‌ها بر اساس capability: owner_admin، legal_reviewer، content_editor، growth_analyst، intake_operator، read_only_auditor؛ این‌ها نقش‌های پیشنهادی‌اند و تا بررسی مدل فعلی به‌صورت کد/claim نهایی نمی‌شوند.
- اصل least privilege؛ تفکیک read، propose، approve، publish، manage_connections.
- MFA/step-up authentication برای مدیریت secrets، تغییر permission، انتشار و هر عملیات حساس در صورت پشتیبانی سازوکار موجود.
- RLS همراه با grants صریح؛ تست allow و deny برای anon/authenticated و نقش‌ها؛ تست storage.objects؛ service-role فقط server-side.
- viewها، RPCها، Edge Functions و security definer جداگانه ممیزی شوند؛ RLS روی جدول پایه به‌تنهایی کافی نیست.
- logهای ممیزی append-only و بدون secret؛ زمان UTC ذخیره و در UI به timezone کاربر تبدیل شود.
- فایل‌های منبع و اسناد داخلی با scope و bucket policy جدا؛ URL امضاشده کوتاه‌عمر در صورت نیاز.
- هیچ client/case data در prompt عمومی، analytics، telemetry، URL یا log وارد نشود.

## 10. الگوی اتصال به پنل موجود
پیش از کدنویسی باید این نقاط در Mother Two بررسی شوند:
1. route واقعی ورود و admin layout؛
2. منبع نقش و مجوز و middleware/proxy/route guards؛
3. Supabase server client و session handling؛
4. navigation config و active state؛
5. الگوی CSS module و فونت/توکن فعلی؛
6. الگوی فرم، جدول، modal، toast و error handling موجود؛
7. تست‌های route و authorization.

سپس فقط:
- یک navigation entry در محل موجود؛
- route group مستقل MAVIS در فضای admin؛
- scoped layout/style؛
- DAL/use-caseهای مجاز؛
- تست route، نقش و رگرسیون بصری.
هیچ منوی عمومی، لینک عمومی یا فایل global تغییر نمی‌کند مگر اینکه بررسی ثابت کند اجتناب‌ناپذیر است و مالک جداگانه تأیید کند.

## 11. امتیازدهی مستقل آمادگی
امتیازها، ارزیابی اسناد و شواهد remote هستند، نه نمره محصول اجراشده. مقیاس 0–10؛ «آمادگی طراحی» با «آمادگی پیاده‌سازی/عملیاتی» اشتباه نشود.

| محور | امتیاز طراحی | امتیاز اجرا | دلیل/شکاف اصلی |
|---|---:|---:|---|
| چشم‌انداز و مرزبندی محصول | 9.0 | 4.0 | charter کامل؛ implementation نامعلوم |
| حفظ ظاهر عمومی | 9.5 | 5.0 | اصل scoped روشن؛ رگرسیون Mother Two لازم |
| تجربه دسکتاپ و پنل | 8.5 | 2.0 | مشخصات این سند؛ هنوز prototype/test نشده |
| تجربه موبایل | 8.5 | 6.0 | موبایل baseline تأییدشده؛ پنل MAVIS نیازمند تست |
| UX مقالات 400+ | 8.5 | 2.0 | table spec؛ benchmark و UI واقعی لازم |
| Intake جامع | 8.0 | 3.0 | اصول و template روشن؛ فرم فعلی باید ممیزی/تکمیل شود |
| پژوهش حقوقی و provenance | 9.0 | 3.0 | source map و schema؛ inventory/hash و validation ناقص |
| Knowledge Gateway | 8.5 | 2.0 | معماری و retrieval contract؛ adapter واقعی مشاهده نشده |
| اتصال Google/Bing/Ads | 8.0 | 1.5 | مستندات رسمی؛ credential/OAuth/real data نامعلوم |
| انتشار و indexing ledger | 8.5 | 3.0 | workflow مشخص؛ end-to-end verification نامعلوم |
| امنیت و privacy | 9.0 | 3.0 | scope/RLS requirements؛ production audit و pgTAP لازم |
| تست، مشاهده‌پذیری و recovery | 8.5 | 2.5 | acceptance plan؛ CI/runtime/local restore evidence ناقص |

**میانگین طراحی مستند: 8.6/10. میانگین آمادگی اجرا بر اساس شواهد فعلی: 3.1/10.** این اختلاف عمدی و صادقانه است؛ نباید سند را به‌جای محصول پیاده‌شده جا زد.

## 12. اولویت رفع ضعف
### P0 — قبل از هر runtime code
- تأیید آرشیو Mother Two در Termux با SHA-256 اعلام‌شده و بررسی manifest.
- تثبیت workspace، branch، dirty files و route فعلی admin.
- مقایسه تمام مسیرهای کاندید با Mother Two و مشخص‌کردن source of truth.
- شناسایی واقعی schema، roles، RLS، grants، Storage policies و auth.
- بازیابی registry و اسناد/داده‌های تاریخی با inventory و hash.

### P1 — قبل از فعال‌کردن ماژول‌ها
- ERD و migration plan بدون اجرا در production.
- pgTAP برای allow/deny؛ تست مجوزهای Storage و viewها.
- prototype desktop/tablet/mobile و تست رگرسیون ظاهر.
- Knowledge Gateway read-only با citations و source freshness.
- فرم Intake کامل و legal-neutral، با بررسی حقوقی متن راهنما.
- lifecycle مقاله، approval و indexing event ledger.

### P2 — پس از پذیرش MVP
- اتصال read-only Search Console، Bing، Google Ads؛ credentialها در محیط امن.
- Google Trends فقط در صورت دسترسی رسمی.
- benchmark 400 مقاله و queue/job resumability.
- گزارش‌های مدیریتی و بهینه‌سازی‌های مبتنی بر داده واقعی.

## 13. دروازه پذیرش دسکتاپ
برای پذیرش UI، همه موارد زیر باید با evidence انجام شوند:
- screenshot در 1440×900 و 1920×1080 از overview، article table، research detail، approvals و settings.
- screenshot در 1024×768 و 768×1024 و موبایل 390×844.
- تست 320px reflow و zoom 200%.
- keyboard-only: ورود، ناوبری، بازکردن ردیف، فرم، dialog، بستن dialog، خروج.
- route permission matrix برای تمام نقش‌ها و مسیرهای مستقیم.
- هیچ horizontal overflow در layout کلی؛ scroll افقی فقط داخل grid/table در صورت توجیه و با affordance.
- 400 رکورد ساختگی/ناشناس برای benchmark؛ ثبت p50/p95 query/render و اندازه payload.
- عدم وجود secret، Scope C یا داده واقعی موکل در browser bundle/log.
- screenshot comparison ثابت کند صفحات عمومی با baseline برابرند.
- تست‌های unit، integration، RLS، e2e و build موفق با نسخه Node/Next تثبیت‌شده.

## 14. معیار تصمیم نهایی
اگر layout فعلی admin از نظر دسترسی و UI سالم باشد، MAVIS در همان layout ادغام می‌شود. اگر layout فعلی مشکل بنیادی داشته باشد، اول گزارش gap و طرح کم‌تغییر ارائه می‌شود؛ بازنویسی admin بدون مجوز انجام نمی‌شود. Desktop polish مجوز تغییر ظاهر عمومی نیست.

## 15. منابع رسمی طراحی و امنیت
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WCAG Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/
- Focus not obscured: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- Next.js App Router layouts/pages: https://nextjs.org/docs/app/getting-started/layouts-and-pages
- Next.js Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js Authentication guide: https://nextjs.org/docs/app/guides/authentication
- Supabase RLS and grants: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
