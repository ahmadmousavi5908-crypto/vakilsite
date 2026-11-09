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

function normalizeText(value, maxLength, code = "INVALID_REQUEST") {
  if (typeof value !== "string") {
    throw new MavisError(code, "متن پیام معتبر نیست.", 400);
  }
  const normalized = value.normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || normalized.length > maxLength) {
    throw new MavisError(code, "متن پیام خالی یا بیش از حد مجاز است.", 400);
  }
  return normalized;
}

/** Accepts only the current client message; role, policy, prompt and history are server-controlled. */
export function parsePublicChatInput(value) {
  if (!isPlainObject(value) || Object.keys(value).some((key) => key !== "message")) {
    throw new MavisError("INVALID_REQUEST", "ساختار درخواست معتبر نیست.", 400);
  }
  return Object.freeze({
    message: normalizeText(value.message, MAX_MESSAGE_LENGTH),
  });
}

/** History must come from a server-side conversation store, never directly from the browser. */
export function normalizeTrustedConversationHistory(history) {
  if (history === undefined || history === null) return Object.freeze([]);
  if (!Array.isArray(history) || history.length > MAX_HISTORY_ITEMS) {
    throw new MavisError("INVALID_HISTORY", "تاریخچه مکالمه معتبر نیست.", 400);
  }

  let totalLength = 0;
  const normalized = history.map((item) => {
    if (!isPlainObject(item) ||
        Object.keys(item).some((key) => key !== "role" && key !== "content") ||
        !["user", "assistant"].includes(item.role)) {
      throw new MavisError("INVALID_HISTORY", "ساختار تاریخچه مکالمه معتبر نیست.", 400);
    }
    const content = normalizeText(item.content, MAX_HISTORY_ITEM_LENGTH, "INVALID_HISTORY");
    totalLength += content.length;
    return Object.freeze({ role: item.role, content });
  });

  if (totalLength > MAX_TOTAL_HISTORY_LENGTH) {
    throw new MavisError("HISTORY_TOO_LARGE", "حجم تاریخچه مکالمه بیش از حد مجاز است.", 413);
  }
  return Object.freeze(normalized);
}

export const publicChatLimits = Object.freeze({
  maxMessageLength: MAX_MESSAGE_LENGTH,
  maxHistoryItems: MAX_HISTORY_ITEMS,
  maxHistoryItemLength: MAX_HISTORY_ITEM_LENGTH,
  maxTotalHistoryLength: MAX_TOTAL_HISTORY_LENGTH,
});
