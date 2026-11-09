#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

readonly REPOSITORY="ahmadmousavi5908-crypto/vakilsite"
readonly RELEASE_TAG="mavis-termux-v1.0.0"
readonly ARCHIVE_NAME="mavis-termux-arm64.tar.gz"
readonly CHECKSUM_NAME="${ARCHIVE_NAME}.sha256"
readonly NODE_VERSION="24.22.2"
readonly DOWNLOAD_DIR="$HOME/downloads/mavis-termux-v1.0.0"

log() { printf '\n[MAVIS] %s\n' "$1"; }
fail() { printf '\n[MAVIS] ERROR: %s\n' "$1" >&2; exit 1; }

case "${PREFIX:-}" in
  */com.termux/files/usr) ;;
  *) fail "این نصب‌کننده فقط برای Termux طراحی شده است." ;;
esac

case "$(uname -m)" in
  aarch64|arm64) ;;
  *) fail "بسته فعلی فقط برای Android/ARM64 ساخته می‌شود." ;;
esac

available_kb="$(df -Pk "$HOME" | awk 'NR == 2 { print $4 }')"
[[ "$available_kb" =~ ^[0-9]+$ ]] || fail "فضای خالی حافظه قابل بررسی نیست."
(( available_kb >= 2500000 )) || fail "حداقل 2.5 گیگابایت فضای خالی لازم است."

for command_name in pkg curl sha256sum tar proot-distro gh; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    log "نصب ابزار پایه $command_name"
    pkg install -y proot-distro curl coreutils tar gh
    break
  fi
done

for command_name in curl sha256sum tar proot-distro gh; do
  command -v "$command_name" >/dev/null 2>&1 || fail "ابزار لازم نصب نشد: $command_name"
done

mkdir -p "$DOWNLOAD_DIR"
chmod 700 "$DOWNLOAD_DIR"

log "دریافت بسته نسخه $RELEASE_TAG"
if [[ ! -f "$DOWNLOAD_DIR/$ARCHIVE_NAME" || ! -f "$DOWNLOAD_DIR/$CHECKSUM_NAME" ]] || ! (cd "$DOWNLOAD_DIR" && sha256sum --check "$CHECKSUM_NAME" >/dev/null 2>&1); then
  rm -f "$DOWNLOAD_DIR/$ARCHIVE_NAME" "$DOWNLOAD_DIR/$CHECKSUM_NAME"
  if gh auth status >/dev/null 2>&1; then
    gh release download "$RELEASE_TAG" \
      --repo "$REPOSITORY" \
      --pattern "$ARCHIVE_NAME" \
      --pattern "$CHECKSUM_NAME" \
      --dir "$DOWNLOAD_DIR"
  else
    BASE_URL="https://github.com/$REPOSITORY/releases/download/$RELEASE_TAG"
    curl --fail --location --retry 3 "$BASE_URL/$ARCHIVE_NAME" -o "$DOWNLOAD_DIR/$ARCHIVE_NAME" || fail "دریافت بسته ناموفق بود؛ اگر مخزن خصوصی است gh auth login را یک‌بار اجرا کنید."
    curl --fail --location --retry 3 "$BASE_URL/$CHECKSUM_NAME" -o "$DOWNLOAD_DIR/$CHECKSUM_NAME" || fail "دریافت checksum ناموفق بود."
  fi
fi

cd "$DOWNLOAD_DIR"
sha256sum --check "$CHECKSUM_NAME" || fail "هش بسته با manifest رسمی یکسان نیست."

if proot-distro login mavis-debian -- /bin/true >/dev/null 2>&1; then
  proot-distro login mavis-debian -- bash -lc 'grep -q "^VERSION_CODENAME=trixie$" /etc/os-release' || fail "محیط mavis-debian موجود است اما Debian Trixie نیست؛ برای جلوگیری از حذف داده‌ها متوقف شد."
else
  log "نصب محیط مستقل Debian Trixie برای اجرای سازگار ARM64/glibc"
  proot-distro install debian:trixie --name mavis-debian
fi

log "آماده‌سازی runtime لینوکسی و نصب نسخه تأییدشده Node.js"
proot-distro login --shared-home mavis-debian -- bash -lc '
set -Eeuo pipefail
NODE_VERSION="'"$NODE_VERSION"'"
ARCHIVE="/root/downloads/mavis-termux-v1.0.0/'"$ARCHIVE_NAME"'"
NODE_ROOT="/opt/node-v${NODE_VERSION}-linux-arm64"
APP_ROOT="/opt/mavis/'"$RELEASE_TAG"'"

if [[ ! -x "$NODE_ROOT/bin/node" ]]; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates curl xz-utils tar
  cd /tmp
  NODE_FILE="node-v${NODE_VERSION}-linux-arm64.tar.xz"
  curl --fail --location --retry 3 "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" -o SHASUMS256.txt
  curl --fail --location --retry 3 "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_FILE}" -o "$NODE_FILE"
  grep -E "  ${NODE_FILE}$" SHASUMS256.txt | sha256sum --check -
  mkdir -p "$NODE_ROOT"
  tar -xJf "$NODE_FILE" --strip-components=1 -C "$NODE_ROOT"
fi

"$NODE_ROOT/bin/node" -e "const [a,b]=process.versions.node.split(\".\").map(Number); if(a<20 || (a===20 && b<9)) process.exit(1)"
mkdir -p "$(dirname "$APP_ROOT")"
if [[ -d "$APP_ROOT" ]]; then
  [[ -f "$APP_ROOT/runtime-manifest.json" && -d "$APP_ROOT/.next" && -d "$APP_ROOT/node_modules/next" && -d "$APP_ROOT/public" ]] || { echo "An incomplete runtime directory exists; refusing to overwrite it." >&2; exit 1; }
else
  STAGING_DIR="$(mktemp -d "/opt/mavis/.${RELEASE_TAG}.XXXXXX")"
  tar -xzf "$ARCHIVE" -C "$STAGING_DIR"
  [[ -f "$STAGING_DIR/runtime-manifest.json" && -d "$STAGING_DIR/.next" && -d "$STAGING_DIR/node_modules/next" && -d "$STAGING_DIR/public" ]] || { echo "Extracted runtime package is incomplete." >&2; exit 1; }
  mv "$STAGING_DIR" "$APP_ROOT"
fi
' || fail "آماده‌سازی محیط Debian یا دریافت Node.js ناموفق بود."

log "آزمون سلامت بسته پیش از اجرا"
proot-distro login --shared-home mavis-debian -- bash -lc '
set -Eeuo pipefail
NODE_ROOT="/opt/node-v'"$NODE_VERSION"'-linux-arm64"
APP_ROOT="/opt/mavis/'"$RELEASE_TAG"'"
"$NODE_ROOT/bin/node" -e "const p=require(\"$APP_ROOT/package.json\"); if(p.dependencies.next!==\"16.4.3\") process.exit(1)"
[[ -d "$APP_ROOT/.next" && -d "$APP_ROOT/node_modules/next" && -d "$APP_ROOT/public" ]]
' || fail "ساختار بسته نهایی کامل نیست."

log "اجرای MAVIS روی پورت 3002"
proot-distro login --shared-home mavis-debian -- bash -lc '
set -Eeuo pipefail
export PATH="/opt/node-v'"$NODE_VERSION"'-linux-arm64/bin:$PATH"
export MAVIS_TERMUX_BUILD=true
export MAVIS_PUBLIC_ENABLED=false
export MAVIS_INTAKE_ENABLED=false
export MAVIS_PROVIDER=mock
export NEXT_PUBLIC_SITE_URL=https://vakilahmadmousavi.ir
cd "/opt/mavis/'"$RELEASE_TAG"'"
exec node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3002
'
