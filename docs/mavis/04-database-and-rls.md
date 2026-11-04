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
