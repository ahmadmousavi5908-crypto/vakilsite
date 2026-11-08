# 04 — مدل داده و RLS

## 1. اصول طراحی داده

- داده Public و Private در جداول، policyها و repositoryهای مجزا نگهداری می‌شود.
- هر رکورد خصوصی به workspace و در صورت لزوم case متصل است.
- مالکیت رکورد از claim یا شناسه ارسالی مرورگر پذیرفته نمی‌شود؛ سمت سرور استخراج و کنترل می‌شود.
- RLS همراه با SQL GRANT/REVOKE طراحی می‌شود.
- هیچ جدول جدیدی قبل از تصویب schema، retention و migration plan به دیتابیس عملیاتی اضافه نمی‌شود.
- داده حساس در log و analytics قرار نمی‌گیرد.

## 2. مدل مفهومی پیشنهادی

### هویت و دسترسی
- mavis_workspaces
- mavis_workspace_members
- mavis_roles
- mavis_permissions
- mavis_role_permissions

### مکالمات
- mavis_public_sessions (در صورت نیاز آینده؛ نه برای MVP اولیه)
- mavis_private_conversations
- mavis_private_messages

### دانش و حقوق
- mavis_knowledge_documents
- mavis_legal_sources
- mavis_legal_versions
- mavis_legal_relationships
- mavis_citations

### عملیات و کنترل
- mavis_usage_events
- mavis_audit_events
- mavis_approvals
- mavis_rate_limit_buckets
- mavis_provider_configs (بدون نگهداری secret در این جدول)

این‌ها نام‌های مفهومی‌اند؛ schema نهایی، نوع داده، کلیدها، indexها و retention باید در طراحی تفصیلی تعیین شود.

## 3. قواعد RLS

برای هر جدول:
1. RLS فعال باشد.
2. نقش anon فقط به داده‌ای دسترسی داشته باشد که صریحاً Public شده است.
3. authenticated به معنی مجاز بودن برای همه رکوردها نیست.
4. عضویت workspace و مجوز پرونده در policy یا Data Access Layer بررسی شود.
5. UPDATE و DELETE با WITH CHECK و شرط مالکیت مناسب محدود شوند.
6. service role فقط در کد server-only و برای عملیات مشخص استفاده شود.
7. policyها با نقش anon، authenticated، عضو غیرمجاز و عضو مجاز تست شوند.

## 4. جداسازی عمومی و خصوصی

MVP عمومی در سرور مکالمه را persist نمی‌کند. اگر بعداً ذخیره عمومی تصویب شد، جدول و retention مستقل، حداقل داده و امکان حذف لازم است.

داده خصوصی:
- به workspace و actor متصل است.
- برای پرونده، case-level authorization لازم دارد.
- جست‌وجو و retrieval باید قبل از ارسال به مدل permission-filter شوند.
- حذف عضو یا لغو مجوز باید دسترسی آینده را فوراً قطع کند.

## 5. Migration strategy

- Migrationها شماره‌گذاری و immutable هستند.
- تغییر migration اعمال‌شده با migration جدید انجام می‌شود.
- هر migration دارای rollback یا روش جبران مستند است.
- ابتدا روی محیط توسعه و داده آزمایشی اجرا می‌شود.
- قبل از production، backup و restore test لازم است.
- Migrationهای فعلی سایت بازنویسی نمی‌شوند.

## 6. Retention و حذف

Retention برای هر نوع داده جداگانه تعیین می‌شود: پیام، سند، usage، audit و backup. Audit نباید محتوای حساس غیرضروری ذخیره کند. مدت دقیق retention تا بررسی نیازهای حرفه‌ای، حقوقی و قراردادی باز است.

## 7. موارد باز

- آیا workspace در MVP خصوصی یک دفتر است یا چند workspace؟
- ماتریس دقیق نقش‌ها و مجوزها.
- کلیدگذاری و رمزنگاری فایل‌ها.
- retention و حذف backup.
- نیاز به pgvector یا موتور جست‌وجوی جدا؛ انتخاب فقط پس از benchmark و تحلیل retrieval.


## 8. مرز اجرایی پذیرش عمومی (Migration 006)

- داده پذیرش عمومی در schema مستقل `mavis_intake_private` قرار می‌گیرد؛ این schema نباید در Supabase Data API Exposed schemas قرار گیرد.
- جدول‌های درخواست، audit و rate-limit همگی RLS فعال دارند؛ نقش‌های `anon` و `authenticated` هیچ مجوز مستقیم ندارند.
- فقط `service_role` سمت سرور مجاز به خواندن/ثبت/به‌روزرسانی درخواست است؛ دسترسی آن به حذف مستقیم و TRUNCATE بسته است. استفاده از secret key فقط در کد server-only و پس از کنترل Origin، اعتبارسنجی ورودی و محدودسازی نرخ مجاز است.
- rate limit با HMAC-SHA256 از شناسه شبکه‌ای مورد اعتماد reverse proxy ساخته می‌شود؛ مقدار خام IP نباید ذخیره یا log شود. کلید HMAC باید secret مستقل سرور باشد و reverse proxy باید هدرهای IP را پاک‌سازی و بازنویسی کند.
- محدودیت اولیه: ۵ درخواست در هر ۱۵ دقیقه برای هر bucket؛ hash پس از ۲۴ ساعت انقضا دارد. این مقادیر باید پیش از بهره‌برداری با نرخ واقعی و کنترل سوءاستفاده بازبینی شوند.
- `retention_expires_at` برای هر درخواست اجباری است؛ هیچ دوره نگهداری پیش‌فرض حقوقی اختراع نشده. تا تصویب دوره نگهداری و ممیزی حذف، endpoint عمومی نباید فعال شود.
- تابع purge فقط از سمت server role قابل فراخوانی است؛ رکوردهای دارای `retention_hold` حذف نمی‌شوند. مدت نگهداری audit باید جداگانه تصویب و به تابع purge داده شود.
- جدول audit فقط کد رویداد، actor و شناسه رکورد را نگه می‌دارد؛ متن شرح پرونده، نام، تلفن، مدارک و اسرار در audit قرار نمی‌گیرند.
- این migration به‌تنهایی فرم یا endpoint را فعال نمی‌کند؛ اتصال اپلیکیشن، کلید secret، سیاست retention، reverse-proxy trust، CI دیتابیس و آزمون واقعی باید جداگانه تکمیل شوند.

- مسیر درج داده و rate limit از wrapperهای `SECURITY INVOKER` در schema عمومی عبور می‌کند؛ اجرای wrapper فقط به `service_role` داده شده و تابع داخلی `SECURITY DEFINER` با `search_path` خالی و نام‌گذاری کامل اشیا اجرا می‌شود. schema خصوصی در Data API expose نمی‌شود.
- تابع درج در خود PostgreSQL نیز allowlist فیلدها، رضایت اجباری، قالب تلفن، دسته موضوع، فوریت، اولویت غربالگری و تاریخ انقضای نگهداری را کنترل می‌کند؛ اعتبارسنجی مرورگر/سرور تنها لایه دفاعی نیست.
