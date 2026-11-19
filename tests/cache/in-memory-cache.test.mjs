import test from "node:test";
import assert from "node:assert/strict";
import {
  clearInMemoryCacheForTests,
  getInMemoryCachedValue,
} from "../../src/lib/cache/in-memory-cache.mjs";

test.beforeEach(() => {
  clearInMemoryCacheForTests();
});

test("reuses a resolved value until its TTL expires", async () => {
  let calls = 0;
  const loader = async () => {
    calls += 1;
    return { count: calls };
  };

  const first = await getInMemoryCachedValue("sample", loader, { ttlMs: 60_000 });
  const second = await getInMemoryCachedValue("sample", loader, { ttlMs: 60_000 });

  assert.deepEqual(first, { count: 1 });
  assert.deepEqual(second, { count: 1 });
  assert.equal(calls, 1);
});

test("deduplicates concurrent loads for the same key", async () => {
  let calls = 0;
  let resolveLoad;
  const loader = () => {
    calls += 1;
    return new Promise((resolve) => { resolveLoad = resolve; });
  };

  const first = getInMemoryCachedValue("concurrent", loader);
  const second = getInMemoryCachedValue("concurrent", loader);
  await Promise.resolve();
  resolveLoad("shared");

  assert.deepEqual(await Promise.all([first, second]), ["shared", "shared"]);
  assert.equal(calls, 1);
});

test("serves the last good value when a refresh fails", async () => {
  let calls = 0;
  const initial = await getInMemoryCachedValue("resilient", async () => {
    calls += 1;
    return ["published"];
  }, { ttlMs: 0 });

  const fallback = await getInMemoryCachedValue("resilient", async () => {
    calls += 1;
    throw new Error("temporary upstream failure");
  }, { ttlMs: 60_000, staleIfErrorMs: 30_000 });

  assert.deepEqual(initial, ["published"]);
  assert.deepEqual(fallback, ["published"]);
  assert.equal(calls, 2);
});

test("does not cache a first-load failure", async () => {
  await assert.rejects(
    getInMemoryCachedValue("failure", async () => { throw new Error("offline"); }),
    /offline/,
  );
  const recovered = await getInMemoryCachedValue("failure", async () => "recovered");
  assert.equal(recovered, "recovered");
});