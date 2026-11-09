# 49 — ماتریس مجوزها، مرزبندی داده و کنترل دسترسی سه بازوی MAVIS
تاریخ: 2026-11-08
وضعیت: طراحی امنیتی و معیار پذیرش؛ هنوز به معنی وجود role/RLS اجرایی نیست.

## 1. هدف و قاعده حاکم
سه بازوی MAVIS از هسته مشترک استفاده می‌کنند، اما به یکدیگر دسترسی آزاد ندارند. مجوز در سمت سرور و در مرز هر عملیات/رکورد اعمال می‌شود؛ پنهان‌کردن دکمه در UI یا اتکا به prompt مدل، کنترل دسترسی نیست.
اصل: **Deny by default, least privilege, explicit purpose, record-level authorization**.
هیچ نقش پیشنهادی در این سند به معنی وجود آن در Supabase فعلی نیست. نقش‌های واقعی باید پس از ممیزی Auth، SQL grants، RLS و حساب‌های مدیر تطبیق داده شوند.

## 2. طبقه‌بندی داده
| کلاس | نمونه | دسترسی پیش‌فرض | قاعده |
|---|---|---|---|
| D0 عمومی | مقالات منتشرشده، صفحات سایت، منابع عمومی مجاز | بازدیدکننده؛ بازوهای مجاز با purpose | provenance، نسخه و تاریخ حفظ شود |
| D1 داخلی عملیاتی | تنظیمات داخلی، گزارش غیرحساس، وضعیت job | اپراتور/مدیر مجاز | عدم نمایش عمومی؛ audit تغییر |
| D2 اطلاعات شخصی پذیرش | نام، راه تماس، شهر، پاسخ فرم و مدارک معرفی‌شده | فقط پذیرش/وکیل تعیین‌شده | حداقل‌گرایی، consent، retention و access log |
| D3 محرمانه پرونده | اسناد هویتی، مکاتبات محرمانه، راهبرد و تحلیل وکیل | فقط وکیل/تیم پرونده با assignment صریح | ممنوع برای Public Intake و Growth؛ ارسال به LLM پیش‌فرض ممنوع |
| D4 اسرار فنی | password، API key، OAuth refresh token، service-role key | فقط runtime secret manager و سرویس نیازمند | هرگز در دانش، Git، prompt، browser، export یا log |

محتوای عمومی که در context پرونده خصوصی وارد شود، به دلیل زمینه استفاده می‌تواند D2/D3 شود؛ classification فقط بر اساس ماهیت سند نیست.

## 3. نقش‌های پیشنهادی
| نقش | مجاز | ممنوع |
|---|---|---|
| Visitor | مشاهده فرم، ثبت پاسخ با consent، دریافت receipt امن | مشاهده درخواست دیگران، پنل یا داده محرمانه |
| Intake Operator | مشاهده درخواست‌های تخصیص‌یافته و هماهنگی | دسترسی به همه پرونده‌ها بدون assignment |
| Lawyer | پرونده تخصیص‌یافته، retrieval مجاز، یادداشت حقوقی | مدیریت credential و انتشار بدون مجوز |
| Editor | metadata و پیش‌نویس مقاله | D2/D3 مگر مجوز جداگانه |
| Growth Analyst | داده عمومی/آماری و گزارش read-only | هویت متقاضی، متن Intake و پرونده |
| Admin | مدیریت کاربران/نقش‌ها و تنظیمات مصوب | دسترسی پیش‌فرض به D3؛ هر استثنا باید audit شود |
| Security/Platform Operator | سلامت سرویس، logs redacted و recovery | مقدار secret یا محتوای پرونده مگر break-glass مصوب |
| MAVIS Service | داده لازم برای job و purpose مشخص | دسترسی blanket یا افزایش scope خودسرانه |

نقش فعلی admin/editor سایت نباید خودکار معادل این ماتریس چندنقشی فرض شود. مهاجرت نقش‌ها نیازمند طراحی و آزمون جداست.

## 4. ماتریس سه بازو
| داده/عملیات | Public Intake | Lawyer Copilot | Growth Intelligence |
|---|---|---|---|
| D0 عمومی | راهنما و فرم | بله، با citation | بله، برای تحلیل عمومی |
| D1 داخلی | فقط وضعیت مجاز درخواست خودش | metadata مجاز | گزارش غیرشخصی و aggregate |
| D2 پذیرش | ثبت و مشاهده در context مجاز | فقط پس از assignment | ممنوع |
| D3 پرونده | ممنوع | فقط پرونده تخصیص‌یافته | ممنوع |
| D4 اسرار فنی | ممنوع | ممنوع | ممنوع |
| ارسال به LLM | پیش‌فرض ممنوع؛ استثنا با purpose/consent/approval | D2/D3 پیش‌فرض ممنوع؛ استثنا نیازمند ارزیابی و approval | فقط داده کم‌خطر و مجاز، حداقل‌سازی و approval |
| اقدام بیرونی | فقط ارسال دستی با consent روشن | preview و تأیید انسانی | preview و تأیید انسانی |

توانایی فنی مدل برای پردازش داده، مجوز ارسال نیست. authorization و purpose limitation باید پیش از فراخوانی Provider در کد قطعی بررسی شود.

## 5. الزامات فنی enforcement
1. هر request باید identity معتبر، role، purpose، resource ID و scope را سمت سرور resolve کند.
2. role، owner_id، case_id، tenant_id یا access scope ارسالی از client قابل اعتماد نیست.
3. RLS روی تمام جداول exposed فعال باشد؛ SQL grants/revokes نیز جداگانه بررسی شوند.
4. service-role فقط در ماژول server-only محدود؛ هر query privileged نیازمند predicate مجوز مستقل است.
5. هر Storage object دارای resource linkage، class، MIME/size validation و object-level authorization باشد.
6. retrieval باید access filter را پیش از ranking/snippet اعمال کند تا metadata خصوصی هم نشت نکند.
7. cache key باید identity/role/scope/version را لحاظ کند؛ D2/D3 در shared public cache ممنوع.
8. audit log شامل actor، action، resource، purpose، decision، timestamp و request ID باشد؛ محتوای پرونده و secret در log نباشد.
9. break-glass دارای علت، تأیید، انقضا و بازبینی پس از استفاده باشد.
10. تغییر role، assignment، consent، retention یا scope audit شود؛ عملیات حساس نیازمند re-authentication باشد.

## 6. تست‌های منفی اجباری
- Visitor با تغییر شناسه، درخواست شخص دیگر را نبیند.
- Intake Operator بدون assignment به پرونده دسترسی نداشته باشد.
- Growth Analyst از URL/query دست‌ساز به D2/D3 دسترسی نداشته باشد.
- Lawyer پرونده تخصیص‌نیافته را نبیند.
- Editor نتواند اسناد پذیرش را از search، export، cache یا Storage بخواند.
- Admin صرفاً با نقش admin به D3 دسترسی خودکار نداشته باشد.
- prompt injection یا document instruction نتواند scope سرویس MAVIS را افزایش دهد.
- snippet، شمار نتایج، autocomplete، error و cache metadata خصوصی افشا نکنند.
- revoke کردن assignment/session/consent در درخواست بعدی اعمال شود.
- secret در client bundle، browser response، Git، logs، analytics یا prompt ظاهر نشود.
- خطای policy/auth به fail-closed منجر شود؛ fallback به query عمومی/گسترده ممنوع.
- تست هم‌زمانی cache و authorization از نشت cross-user جلوگیری کند.

## 7. معیار پذیرش
- schema/ERD و migration با نقش‌های واقعی تطبیق داده شده باشد.
- همه tables، views، functions، grants، policies، buckets و API routes در inventory باشند.
- RLS و grants با تست مثبت و منفی اثبات شوند.
- cross-user، cross-case، cross-arm و cache isolation پاس شوند.
- export/download و object path آزموده شوند.
- policy tests در CI برای هر تغییر schema/authorization اجرا شوند.
- گزارش redacted، commit SHA و محیط آزمون ثبت شود.
هدف: صفر cross-scope access و صفر secret exposure در مجموعه آزمون. تا اجرای آزمون، این هدف pending است؛ امتیاز امنیت 9/10 فقط پس از شواهد مجاز است.

## 8. اقدام پس از ممیزی Mother Two
1. فهرست واقعی tables، views، functions، grants، RLS policies، buckets و routes استخراج شود.
2. نقش‌های واقعی admin/editor با نیاز دفتر تطبیق داده شوند؛ نقش غیرضروری ایجاد نشود.
3. ERD و authorization matrix با منابع موجود تطبیق داده شود.
4. migration و تست در branch و database staging جدا طراحی شوند.
5. هر migration پیش از production نیازمند approval مستقل است.

## 9. محدودیت وضعیت فعلی
این سند طراحی است. ممیزی remote قبلی فقط سه migration مربوط به تنظیمات عمومی سایت و جدول profiles را در شاخه runtime بررسی‌شده مشاهده کرد؛ این مشاهده اثبات نمی‌کند هیچ جدول یا policy دیگری در Supabase/شاخه‌های دیگر وجود ندارد. وضعیت live database، grants، buckets، Auth users و policies از این سند قابل استنتاج نیست.
