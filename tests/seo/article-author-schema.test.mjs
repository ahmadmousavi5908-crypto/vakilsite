import assert from "node:assert/strict";
import test from "node:test";

import { buildArticleAuthorSchema } from "../../src/lib/seo/article-author-schema.mjs";

test("connects the verified attorney author to the canonical profile entity", () => {
  assert.deepEqual(
    buildArticleAuthorSchema("https://vakilahmadmousavi.ir/", "سید احمد موسوی"),
    {
      "@type": "Person",
      "@id": "https://vakilahmadmousavi.ir/#attorney",
      name: "سید احمد موسوی",
      url: "https://vakilahmadmousavi.ir/about",
    },
  );
});

test("keeps other authors distinct and does not assign them the attorney profile", () => {
  assert.deepEqual(
    buildArticleAuthorSchema("https://vakilahmadmousavi.ir/", "نویسنده دیگر"),
    { "@type": "Person", name: "نویسنده دیگر" },
  );
});

test("returns null for a missing author and safely omits profile URLs for invalid site URLs", () => {
  assert.equal(buildArticleAuthorSchema("https://vakilahmadmousavi.ir/", ""), null);
  assert.deepEqual(
    buildArticleAuthorSchema("not-a-url", "سید احمد موسوی"),
    { "@type": "Person", name: "سید احمد موسوی" },
  );
});
