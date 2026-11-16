import test from "node:test";
import assert from "node:assert/strict";
import { submitIndexNowUrls } from "../src/lib/indexnow-client.mjs";

const env = {
  INDEXNOW_KEY: "valid-key-123",
  NEXT_PUBLIC_SITE_URL: "https://vakilahmadmousavi.ir",
};

test("skips notifications when the IndexNow key is not configured", async () => {
  const result = await submitIndexNowUrls(["/articles/example"], {
    env: { NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL },
    fetchImpl: async () => { throw new Error("Must not call fetch"); },
  });
  assert.deepEqual(result, { state: "skipped", reason: "not_configured" });
});

test("submits unique same-origin public URLs with the verified key location", async () => {
  let request;
  const result = await submitIndexNowUrls(
    ["/articles/example", "https://vakilahmadmousavi.ir/articles/example"],
    {
      env,
      fetchImpl: async (url, options) => {
        request = { url, options, body: JSON.parse(options.body) };
        return { status: 200 };
      },
    },
  );
  assert.deepEqual(result, { state: "accepted", status: 200, submitted: 1 });
  assert.equal(request.url, "https://api.indexnow.org/indexnow");
  assert.equal(request.body.host, "vakilahmadmousavi.ir");
  assert.equal(request.body.key, env.INDEXNOW_KEY);
  assert.equal(request.body.keyLocation, "https://vakilahmadmousavi.ir/indexnow-key.txt");
  assert.deepEqual(request.body.urlList, ["https://vakilahmadmousavi.ir/articles/example"]);
});

test("treats HTTP 202 as accepted while key verification may be pending", async () => {
  const result = await submitIndexNowUrls(["/articles/example"], {
    env,
    fetchImpl: async () => ({ status: 202 }),
  });
  assert.deepEqual(result, { state: "accepted", status: 202, submitted: 1 });
});

test("rejects external, private, query, and malformed URLs before network access", async () => {
  for (const url of [
    "https://evil.example/articles/example",
    "/admin",
    "/api/private",
    "/articles/example?draft=1",
    "http://[::1",
  ]) {
    const result = await submitIndexNowUrls([url], {
      env,
      fetchImpl: async () => { throw new Error("Must not call fetch"); },
    });
    assert.deepEqual(result, { state: "rejected", reason: "invalid_url" }, url);
  }
});

test("returns a safe rejection for upstream non-success responses", async () => {
  const result = await submitIndexNowUrls(["/articles/example"], {
    env,
    fetchImpl: async () => ({ status: 429 }),
  });
  assert.deepEqual(result, { state: "rejected", status: 429 });
});

test("contains network and timeout failures without breaking publication", async () => {
  const result = await submitIndexNowUrls(["/articles/example"], {
    env,
    fetchImpl: async () => { throw new Error("network failure"); },
  });
  assert.deepEqual(result, { state: "unavailable" });
});
