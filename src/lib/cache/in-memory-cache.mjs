const entries = new Map();
const MAX_ENTRIES = 64;

function remember(key, entry) {
  if (entries.has(key)) entries.delete(key);
  entries.set(key, entry);
  while (entries.size > MAX_ENTRIES) {
    entries.delete(entries.keys().next().value);
  }
}

export async function getInMemoryCachedValue(
  key,
  loader,
  { ttlMs = 60_000, staleIfErrorMs = 30_000 } = {},
) {
  if (typeof key !== "string" || !key.trim()) {
    throw new TypeError("A non-empty cache key is required.");
  }
  if (typeof loader !== "function") {
    throw new TypeError("A cache loader function is required.");
  }

  const now = Date.now();
  const current = entries.get(key);
  if (current && current.expiresAt > now && Object.prototype.hasOwnProperty.call(current, "value")) {
    remember(key, current);
    return current.value;
  }
  if (current?.pending) return current.pending;

  const staleValue = current && Object.prototype.hasOwnProperty.call(current, "value")
    ? current.value
    : undefined;

  const pending = Promise.resolve()
    .then(loader)
    .then((value) => {
      remember(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
      return value;
    })
    .catch((error) => {
      if (current && Object.prototype.hasOwnProperty.call(current, "value")) {
        remember(key, { value: staleValue, expiresAt: Date.now() + Math.max(0, staleIfErrorMs) });
        return staleValue;
      }
      entries.delete(key);
      throw error;
    });

  remember(key, {
    ...(current && Object.prototype.hasOwnProperty.call(current, "value") ? { value: staleValue } : {}),
    expiresAt: current?.expiresAt ?? 0,
    pending,
  });
  return pending;
}

export function clearInMemoryCacheForTests() {
  entries.clear();
}

export function getInMemoryCacheSizeForTests() {
  return entries.size;
}