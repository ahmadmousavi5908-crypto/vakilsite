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

ابتدا مسیر دقیق آرشیو واقعی را از فهرست فایل‌های محلی تأیید کنید. نام فایل را حدس نزنید و آرشیو اصلی را جابه‌جا یا بازنویسی نکنید. مسیر پیش‌فرض، آرشیو کامل ثبت‌شده در برنامه پروژه است؛ اگر وجود نداشت، فقط پس از بررسی نام فایل، متغیر `MOTHER_TWO_ARCHIVE` را override کنید. از جایگزینی خودکار با آرشیو `payload` خودداری کنید. این اسکریپت عمداً مسیر گزارش را در stdout چاپ نمی‌کند؛ بنابراین گزارش باید از پوشه خروجی پیدا و checksum آن جداگانه کنترل شود.

~~~bash
ARCHIVE="${MOTHER_TWO_ARCHIVE:-$HOME/downloads/vakilsite-backups/VAKILSITE-MOTHER-TWO-UPDATED-20261106-full.tar.gz}"
OUTPUT_DIR="$HOME/downloads/vakilsite-mother-two-audit"

test -f "$ARCHIVE" || { echo "Approved archive not found"; exit 1; }

python3 scripts/mavis/inventory_mother_two.py \
  --archive "$ARCHIVE" \
  --output-dir "$OUTPUT_DIR" || exit 1

REPORT="$(python3 - "$OUTPUT_DIR" <<'PY'
from pathlib import Path
import sys

directory = Path(sys.argv[1])
reports = sorted(
    directory.glob("mother-two-inventory-*.json"),
    key=lambda item: item.stat().st_mtime_ns,
    reverse=True,
)
if not reports:
    raise SystemExit("No inventory report was created.")
print(reports[0])
PY
)" || exit 1

test -f "$REPORT" || { echo "Inventory report not found"; exit 1; }

python3 - "$REPORT" <<'PY'
import hashlib
from pathlib import Path
import sys

report = Path(sys.argv[1])
checksum_file = report.with_suffix(report.suffix + ".sha256")
expected = checksum_file.read_text(encoding="ascii").split()[0]
actual = hashlib.sha256(report.read_bytes()).hexdigest()
if actual != expected:
    raise SystemExit("Inventory checksum verification failed.")
print("Inventory checksum verified.")
PY
~~~ 

پس از بررسی گزارش خصوصی و checksum آن، ابتدا فقط dry-run اجرا شود:

~~~bash
python3 scripts/mavis/stage_mother_two.py \
  --archive "$ARCHIVE" \
  --inventory "$REPORT" \
  --output-parent "$HOME/downloads/vakilsite-mother-two-staging" \
  --dry-run
~~~

فقط پس از بررسی تعداد، حجم، هش آرشیو، فایل‌های منتخب و موارد مشکوک، مرحله‌بندی واقعی اجرا شود:

~~~bash
python3 scripts/mavis/stage_mother_two.py \
  --archive "$ARCHIVE" \
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
