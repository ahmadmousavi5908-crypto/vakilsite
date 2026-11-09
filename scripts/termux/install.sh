#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

readonly REPOSITORY="https://github.com/ahmadmousavi5908-crypto/vakilsite.git"
readonly SOURCE_REF="feature/mavis-final-verification-20261109"
readonly APP_DIR="${MAVIS_DIR:-$HOME/downloads/vakilsite-mavis-termux}"
readonly APP_URL="http://127.0.0.1:3002"

log() { printf '\n[MAVIS] %s\n' "$1"; }
fail() { printf '\n[MAVIS] ERROR: %s\n' "$1" >&2; exit 1; }

case "${PREFIX:-}" in
  */com.termux/files/usr) ;;
  *) fail "این اسکریپت فقط برای محیط رسمی Termux طراحی شده است." ;;
esac

for command_name in git curl node npm; do
  command -v "$command_name" >/dev/null 2>&1 || fail "ابزار $command_name نصب نیست. یک‌بار اجرا کنید: pkg install -y git nodejs-lts npm curl"
done

node --input-type=commonjs -e '
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error("Next.js 16 requires Node.js >= 20.9.0. Detected: " + process.version);
  process.exit(1);
}
' || fail "نسخه Node.js با Next.js 16 سازگار نیست. در Termux نسخه LTS را نصب و دوباره اجرا کنید."

available_kb="$(df -Pk "$HOME" | awk 'NR == 2 { print $4 }')"
[[ "$available_kb" =~ ^[0-9]+$ ]] || fail "فضای خالی حافظه قابل بررسی نیست."
(( available_kb >= 1500000 )) || fail "حداقل 1.5 گیگابایت فضای خالی لازم است؛ فضای فعلی کمتر است."

mkdir -p "$(dirname "$APP_DIR")"

if [[ -e "$APP_DIR" ]]; then
  [[ -d "$APP_DIR/.git" ]] || fail "مسیر مقصد از قبل وجود دارد و مخزن MAVIS نیست: $APP_DIR"
  existing_remote="$(git -C "$APP_DIR" remote get-url origin 2>/dev/null || true)"
  [[ "$existing_remote" == "$REPOSITORY" ]] || fail "مخزن موجود در مسیر مقصد متعلق به این پروژه نیست: $APP_DIR"
  [[ -z "$(git -C "$APP_DIR" status --porcelain)" ]] || fail "در پوشه پروژه تغییر محلی وجود دارد؛ برای جلوگیری از حذف آن، نصب متوقف شد."
  log "به‌روزرسانی نسخه دریافت‌شده بدون دست‌کاری تغییرات محلی"
  git -C "$APP_DIR" fetch --depth=1 origin "$SOURCE_REF"
  git -C "$APP_DIR" checkout -B "$SOURCE_REF" FETCH_HEAD
else
  log "دریافت نسخه تأییدشده پروژه از GitHub"
  git clone --depth=1 --single-branch --branch "$SOURCE_REF" "$REPOSITORY" "$APP_DIR"
fi

cd "$APP_DIR"

if [[ ! -f .env.local ]]; then
  umask 077
  cat > .env.local <<'ENV'
NEXT_PUBLIC_SITE_URL=https://vakilahmadmousavi.ir
NEXT_PUBLIC_WHATSAPP_NUMBER=989169165902
MAVIS_PUBLIC_ENABLED=false
MAVIS_INTAKE_ENABLED=false
MAVIS_PROVIDER=mock
ENV
  chmod 600 .env.local
fi

export NEXT_TELEMETRY_DISABLED=1
export npm_config_fetch_retries=3
export npm_config_fetch_timeout=300000

log "نصب دقیق وابستگی‌های قفل‌شده"
npm ci --no-audit --no-fund

log "ساخت نسخه تولیدی با Webpack"
npm run build

if curl --silent --fail --max-time 2 "$APP_URL" >/dev/null 2>&1; then
  fail "پورت 3002 از قبل پاسخ می‌دهد. برای جلوگیری از تداخل، سرور جدید اجرا نشد."
fi

log "اجرای سرور و بررسی پاسخ HTTP"
npm run start -- --hostname 127.0.0.1 --port 3002 > .termux-start.log 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

ready=0
for attempt in $(seq 1 30); do
  if curl --silent --fail --max-time 4 "$APP_URL" >/dev/null 2>&1; then
    ready=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  log "راه‌اندازی کامل نشد؛ آخرین گزارش سرور:"
  tail -n 60 .termux-start.log 2>/dev/null || true
  fail "آزمون سلامت HTTP ناموفق بود. فایل گزارش در $APP_DIR/.termux-start.log ذخیره شد."
fi

log "سرور با موفقیت پاسخ داد: $APP_URL"
log "برای توقف سرور، در همین نشست Ctrl+C را بزنید."
wait "$SERVER_PID"
