import { MavisError } from "./errors.mjs";

const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_ITEM_LENGTH = 1000;
const MAX_TOTAL_HISTORY_LENGTH = 5000;

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function parsePublicChatInput(value) {
  if (!isPlainObject(value)) {
    throw new MavisError("INVALID_REQUEST", "ساختار درخواست معتبر نیست.", 400);
  }

  const message = typeof value.message === "string" ? value.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    throw new MavisError("INVALID_REQUEST", "متن پیام خالی یا بیش از حد مجاز است.", 400);
  }

  const history = value.history ?? [];
  if (!Array.isArray(history) || history.length > MAX_HISTORY_ITEMS) {
    throw new MavisError("INVALID_REQUEST", "تاریخچه مکالمه معتبر نیست.", 400);
  }

  let totalHistoryLength = 0;
  const normalizedHistory = history.map((item) => {
    if (!isPlainObject(item) || item.role !== "user") {
      throw new MavisError("INVALID_REQUEST", "در تاریخچه عمومی فقط پیام‌های کاربر پذیرفته می‌شوند.", 400);
    }

    const content = typeof item.content === "string" ? item.content.trim() : "";
    if (!content || content.length > MAX_HISTORY_ITEM_LENGTH) {
      throw new MavisError("INVALID_REQUEST", "یکی از پیام‌های قبلی معتبر نیست.", 400);
    }

    totalHistoryLength += content.length;
    return { role: item.role, content };
  });

  if (totalHistoryLength > MAX_TOTAL_HISTORY_LENGTH) {
    throw new MavisError("REQUEST_TOO_LARGE", "حجم تاریخچه مکالمه بیش از حد مجاز است.", 413);
  }

  return Object.freeze({
    message,
    history: Object.freeze(normalizedHistory),
  });
}

export const publicChatLimits = Object.freeze({
  maxMessageLength: MAX_MESSAGE_LENGTH,
  maxHistoryItems: MAX_HISTORY_ITEMS,
  maxHistoryItemLength: MAX_HISTORY_ITEM_LENGTH,
  maxTotalHistoryLength: MAX_TOTAL_HISTORY_LENGTH,
});
