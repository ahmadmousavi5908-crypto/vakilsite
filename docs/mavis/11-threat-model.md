# 11 — مدل تهدید MAVIS

## 1. دارایی‌های مورد حفاظت

- اسرار Provider، Supabase و کلیدهای امضا.
- هویت و نشست کاربران دفتر.
- اطلاعات موکل، پرونده و اسناد.
- مکالمات و حافظه خصوصی.
- منابع حقوقی و اسناد داخلی.
- ابزارهای ارسال پیام و تغییر داده.
- بودجه API و دسترس‌پذیری سایت.

## 2. مرزهای اعتماد

1. Browser ↔ Next.js server.
2. Public Assistant ↔ Private Assistant.
3. Application ↔ Supabase/Postgres.
4. Application ↔ AI Provider.
5. Retrieved content/document ↔ system instructions.
6. Model output ↔ tool execution.
7. Staging ↔ Production.

هر عبور از مرز باید اعتبارسنجی، مجوز و حداقل‌سازی داده داشته باشد.

## 3. مهاجم‌ها و خطاهای محتمل

- بازدیدکننده ناشناس با درخواست انبوه یا payload مخرب.
- کاربر واردشده با نقش یا مجوز ناکافی.
- کاربر مجاز اما کنجکاو برای مشاهده پرونده دیگران.
- محتوای آلوده در سند یا منبع بازیابی‌شده.
- سرقت یا افشای secret در log/repository/client bundle.
- سوءاستفاده از Tool یا prompt injection.
- اختلال یا رفتار غیرمنتظره Provider.
- خطای انسانی در انتشار، migration یا پیکربندی.

## 4. سناریوهای کلیدی

| سناریو | کنترل پیشگیرانه | آزمون |
|---|---|---|
| دسترسی عمومی به Private | route و repository جدا، authorization server-side | درخواست anon به همه مسیرهای private |
| IDOR روی مکالمه/پرونده | query محدود به مجوز actor و workspace | تغییر شناسه رکورد |
| Prompt injection | محتوای بازیابی‌شده untrusted، Tool allowlist | دستور مخرب در متن و سند |
| افشای secret | env server-only، scrub log، secret scan | جست‌وجوی bundle و log |
| XSS خروجی مدل | render متن، sanitize لینک | payload HTML/JS |
| هزینه‌تراشی | limiter اتمیک، سقف token/cost، kill switch | burst و درخواست هم‌زمان |
| Tool misuse | مجوز مستقل، approval و audit | فراخوانی بدون مجوز/approval |
| جعل citation | retrieval از source registry و citation validator | ماده/منبع ساختگی |
| cross-session leakage | context builder ایزوله | دو نشست با داده متفاوت |
| دستکاری limiter | RPC محدود، HMAC key، atomic update | درخواست موازی و replay |

## 5. فرض‌های امنیتی

- متن ورودی کاربر قابل اعتماد نیست.
- خروجی مدل قابل اعتماد نیست.
- سند بارگذاری‌شده حتی اگر از کاربر داخلی باشد ممکن است دستور مخرب داشته باشد.
- وجود session به‌معنی مجوز همه داده‌ها نیست.
- RLS بدون GRANT صحیح کافی نیست و GRANT بدون RLS نیز کافی نیست.
- service_role از RLS عبور می‌کند و فقط در server-only adapter مجاز است.
- headerهای forwarded فقط وقتی معتبرند که توسط proxy شناخته‌شده تنظیم شده باشند.

## 6. معیار پذیرش امنیت

هیچ مسیر عمومی نباید داده خصوصی را بخواند یا بنویسد. هیچ Tool نباید صرفاً با درخواست مدل اجرا شود. هیچ خروجی مدل نباید به‌عنوان HTML یا SQL اجرایی تفسیر شود. هر عملیات دارای اثر بیرونی نیازمند actor مجاز، approval معتبر، idempotency و audit است.

## 7. باقیمانده ریسک

- محدودیت دسترسی API از ایران و پایداری شبکه.
- retention و منطقه پردازش Provider.
- ریسک خطای حقوقی مدل و ناقص بودن منابع.
- خطای انسانی در اعطای مجوز.
- ریسک حملات توزیع‌شده فراتر از ظرفیت limiter MVP.

این ریسک‌ها باید قبل از production owner و راهکار کاهش مشخص داشته باشند.
