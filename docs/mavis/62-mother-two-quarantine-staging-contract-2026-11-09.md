# قرارداد مرحله‌بندی امن دارایی‌های تاریخی Mother Two

تاریخ: 2026-11-09  
وضعیت: ابزار پیاده‌سازی شده؛ اجرای واقعی روی آرشیو مالک هنوز در انتظار مرحله نهایی Termux است.

## هدف

پس از inventory و هش‌گذاری read-only، فقط فایل‌های مجاز و قابل تطبیق از آرشیو اصلی به یک workspace تازه و قرنطینه‌شده منتقل شوند. این مرحله صرفاً آماده‌سازی برای بازبینی است و به معنی ورود به corpus یا مجاز بودن استفاده از محتوا نیست.

## دو مرحله مجزا

1. inventory_mother_two.py: محاسبه SHA-256 آرشیو و فایل‌های عادی، شناسایی دسته‌ها، duplicateها، مسیرهای خطرناک و secret-like paths؛ بدون استخراج.
2. stage_mother_two.py: بررسی مجدد SHA-256 آرشیو، خواندن گزارش inventory، انتخاب فایل‌های دسته‌بندی‌شده و مجاز، تطبیق مسیر/اندازه/hash هر عضو و نوشتن در یک پوشه جدید با دسترسی محدود.

## دسته‌ها و قالب‌های قابل مرحله‌بندی

دسته‌های مجاز: کتاب‌ها، مقالات، آرای قضایی، نظریات مشورتی، قوانین و مقررات، پژوهش و dataset، اسناد SEO و مستندات پروژه.

قالب‌های فعلی: PDF، DOC/DOCX، Markdown، TXT، JSON، CSV، XLSX، HTML، RTF، ODT/ODS، PPTX، EPUB و XML. فایل‌های دیگر فقط در inventory باقی می‌مانند تا parser و سیاست دسترسی مناسب بررسی شود.

## محدودیت‌های سخت

- فایل‌های secret-like، مسیرهای ناامن، symlink و hardlink مرحله‌بندی نمی‌شوند. مسیرهای مشکوک به پرونده موکل، اطلاعات شخصی/هویتی/مالی/پزشکی و اسناد محرمانه نیز همراه hash و اندازه از inventory عمومی redacted می‌شوند و وارد مرحله‌بندی نمی‌شوند.
- پیش از کپی، محتوای فایل‌های منتخب در یک گذر جریانی جداگانه برای الگوهای رایج credential (کلید خصوصی، متغیرهای password/API key/token، JWT و کلیدهای متداول سرویس‌ها) بررسی می‌شود؛ فایل مشکوک بدون ثبت مسیر یا hash در manifest کنار گذاشته می‌شود. این اسکن heuristic است و تضمین کشف همه اسرار نیست.
- سقف هر فایل 100 MiB، کل داده 1 GiB و تعداد فایل 5000 است.
- فقط فایل‌های regular با مسیر یکتا و hash معتبر انتخاب می‌شوند.
- archive hash، member size و member SHA-256 باید با inventory منطبق باشند؛ هر اختلاف کل عملیات را متوقف و workspace نیمه‌کاره را حذف می‌کند.
- آرشیو اصلی read-only است؛ استخراج در محل انجام نمی‌شود.
- فایل‌های staged با access_class=unclassified_pending_review، rights_status=unknown_pending_review و indexing_allowed=false ثبت می‌شوند.
- هیچ فایل staged به prompt، vector store، PostgreSQL FTS، public assistant یا Lawyer Copilot وارد نمی‌شود.
- محتوای فایل‌ها برای بررسی مجوز نشر، مالکیت، محرمانگی، صحت نسخه و کیفیت OCR هنوز نیازمند بازبینی انسانی است.
- این ابزار جایگزین رمزگشایی، antivirus/sandbox یا بررسی محتوای مخرب نیست.

## فرمان‌های نهایی Termux

ابتدا مسیر دقیق آرشیو و گزارش inventory تأیید شود. آرشیو اصلی نباید جابه‌جا یا بازنویسی شود.

~~~bash
REPORT="$(python3 scripts/mavis/inventory_mother_two.py \
  --archive "$HOME/downloads/vakilsite-backups/VAKILSITE-MOTHER-TWO-UPDATED-20261106-220500-payload.tar.gz" \
  --output-dir "$HOME/downloads/vakilsite-mother-two-audit" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["report_path"])')" || exit 1
test -f "$REPORT" || { echo "Inventory report not found"; exit 1; }
~~~

پس از بررسی خروجی و checksum گزارش:

~~~bash
python3 scripts/mavis/stage_mother_two.py \
  --archive "$HOME/downloads/vakilsite-backups/VAKILSITE-MOTHER-TWO-UPDATED-20261106-220500-payload.tar.gz" \
  --inventory "$REPORT" \
  --output-parent "$HOME/downloads/vakilsite-mother-two-staging" \
  --dry-run
~~~

فقط پس از بررسی تعداد، حجم، هش آرشیو و گزارش:

~~~bash
python3 scripts/mavis/stage_mother_two.py \
  --archive "$HOME/downloads/vakilsite-backups/VAKILSITE-MOTHER-TWO-UPDATED-20261106-220500-payload.tar.gz" \
  --inventory "$REPORT" \
  --output-parent "$HOME/downloads/vakilsite-mother-two-staging"
~~~

## معیار پذیرش

- inventory و stage هر دو با آزمون‌های مصنوعی عبور کنند.
- checksum آرشیو و گزارش ثبت شود.
- تعداد فایل‌ها، حجم و دسته‌ها با خروجی واقعی تطبیق داده شوند.
- duplicateها و نسخه‌های متعارض قبل از هر ingestion حل شوند.
- برای هر منبع، provenance، مجوز/حقوق نشر، سطح دسترسی و وضعیت بازبینی ثبت شود.
- فقط پس از تأیید انسانی، L0 به L1 و سپس L2 منتقل شود. تنها L2 مجاز به retrieval است.

## وضعیت فعلی

کد و آزمون‌های مصنوعی به شاخه MAVIS افزوده شده‌اند. این نشست به فایل‌سیستم Termux و آرشیو محلی دسترسی ندارد؛ بنابراین هیچ ادعایی درباره تعداد واقعی کتاب‌ها، مقالات یا موفقیت استخراج فایل‌های Mother Two مطرح نمی‌شود. اجرای واقعی inventory و stage عمداً به آخر کار و پس از حفظ checksum آرشیو موکول شده است.
