import assert from "node:assert/strict";
import test from "node:test";

import { buildBreadcrumbSchema } from "../../src/lib/seo/breadcrumb-schema.mjs";

test("builds an ordered breadcrumb trail using same-origin page URLs", () => {
  const schema = buildBreadcrumbSchema("https://vakilahmadmousavi.ir/", [
    { name: "صفحه اصلی", path: "/" },
    { name: "مقالات حقوقی", path: "/articles" },
    { name: "مطالبه وجه چک و سفته" },
  ]);

  assert.equal(schema["@context"], "https://schema.org");
  assert.equal(schema["@type"], "BreadcrumbList");
  assert.deepEqual(schema.itemListElement, [
    { "@type": "ListItem", position: 1, name: "صفحه اصلی", item: "https://vakilahmadmousavi.ir/" },
    { "@type": "ListItem", position: 2, name: "مقالات حقوقی", item: "https://vakilahmadmousavi.ir/articles" },
    { "@type": "ListItem", position: 3, name: "مطالبه وجه چک و سفته" },
  ]);
});

test("returns null for invalid site URLs or incomplete trails", () => {
  assert.equal(buildBreadcrumbSchema("", [{ name: "خانه", path: "/" }, { name: "صفحه" }]), null);
  assert.equal(buildBreadcrumbSchema("not-a-url", [{ name: "خانه", path: "/" }, { name: "صفحه" }]), null);
  assert.equal(buildBreadcrumbSchema("https://example.com", [{ name: "تنها یک مورد" }]), null);
  assert.equal(buildBreadcrumbSchema("https://example.com", [{ name: "", path: "/" }, { name: "صفحه" }]), null);
});

test("rejects breadcrumb paths that escape or alter the canonical origin", () => {
  assert.equal(
    buildBreadcrumbSchema("https://example.com", [
      { name: "خانه", path: "//outside.example/path" },
      { name: "صفحه" },
    ]),
    null,
  );
  assert.equal(
    buildBreadcrumbSchema("https://example.com", [
      { name: "خانه", path: "/articles?draft=true" },
      { name: "صفحه" },
    ]),
    null,
  );
});
