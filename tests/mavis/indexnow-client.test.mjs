import test from "node:test";
import assert from "node:assert/strict";
import { submitIndexNowUrls } from "../../src/lib/indexnow-client.mjs";

const config = {
  key: "valid-indexnow-key-123",
  siteUrl: "https://vakilahmadmousavi.ir"
};

test("submits deduplicated public URLs to IndexNow", async () => {
  let request;
  const result = await submitIndexNowUrls(["/articles/example", "/articles/example"], {
    ...config,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { status: 200 };
    }
  });
  assert.equal(result.accepted, true);
  assert.equal(result.submitted, 1);
  assert.equal(request.url, "https://api.indexnow.org/indexnow");
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.host, "vakilahmadmousavi.ir");
  assert.deepEqual(payload.urlList, ["https://vakilahmadmousavi.ir/articles/example"]);
  assert.equal(payload.keyLocation, "https://vakilahmadmousavi.ir/valid-indexnow-key-123.txt");
});

test("never submits admin or API paths", async () => {
  let called = false;
  const result = await submitIndexNowUrls(["/admin/users"], {
    ...config,
    fetchImpl: async () => { called = true; return { status: 200 }; }
  });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "unsafe_or_private_url");
  assert.equal(called, false);
});

test("rejects cross-origin URLs and query strings", async () => {
  for (const path of ["https://evil.example/article", "/articles/example?preview=1"]) {
    const result = await submitIndexNowUrls([path], { ...config, fetchImpl: async () => ({ status: 200 }) });
    assert.equal(result.accepted, false);
  }
});

test("returns a safe optional state when the key is not configured", async () => {
  let called = false;
  const result = await submitIndexNowUrls(["/articles/example"], {
    key: "",
    siteUrl: config.siteUrl,
    fetchImpl: async () => { called = true; }
  });
  assert.equal(result.state, "not_configured");
  assert.equal(called, false);
});

test("maps accepted and rejected upstream statuses without exposing response bodies", async () => {
  const accepted = await submitIndexNowUrls(["/articles/example"], {
    ...config,
    fetchImpl: async () => ({ status: 202 })
  });
  const rejected = await submitIndexNowUrls(["/articles/example"], {
    ...config,
    fetchImpl: async () => ({ status: 503, text: async () => "private upstream detail" })
  });
  assert.equal(accepted.state, "accepted_pending_verification");
  assert.equal(rejected.status, 503);
  assert.equal(JSON.stringify(rejected).includes("private upstream detail"), false);
});
