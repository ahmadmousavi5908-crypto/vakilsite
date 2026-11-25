import assert from "node:assert/strict";
import test from "node:test";

import { buildAttorneyProfileSchema } from "../../src/lib/seo/attorney-profile-schema.mjs";

test("builds a ProfilePage linked to the canonical attorney entity and portrait", () => {
  const schema = buildAttorneyProfileSchema("https://vakilahmadmousavi.ir/");

  assert.equal(schema["@context"], "https://schema.org");
  assert.equal(schema["@type"], "ProfilePage");
  assert.equal(schema.url, "https://vakilahmadmousavi.ir/about");
  assert.equal(schema.primaryImageOfPage["@type"], "ImageObject");
  assert.equal(schema.primaryImageOfPage.url, "https://vakilahmadmousavi.ir/images/lawyer.jpg");
  assert.equal(schema.mainEntity["@type"], "Person");
  assert.equal(schema.mainEntity["@id"], "https://vakilahmadmousavi.ir/#attorney");
  assert.equal(schema.mainEntity.name, "سید احمد موسوی");
  assert.equal(schema.mainEntity.url, "https://vakilahmadmousavi.ir/about");
  assert.deepEqual(schema.mainEntity.sameAs, ["https://www.instagram.com/vakilahmadmousavi/"]);
  assert.equal(schema.mainEntity.identifier, "74516");
  assert.equal(
    schema.mainEntity.description,
    "وکیل پایه یک دادگستری و عضو مرکز وکلای قوه قضائیه؛ دارای کارشناسی ارشد حقوق. محل فعالیت دفتر در اهواز، استان خوزستان.",
  );
  assert.equal(schema.mainEntity.image, "https://vakilahmadmousavi.ir/images/lawyer.jpg");
});

test("returns null when the site URL is missing or invalid", () => {
  assert.equal(buildAttorneyProfileSchema(""), null);
  assert.equal(buildAttorneyProfileSchema(null), null);
  assert.equal(buildAttorneyProfileSchema("not-a-url"), null);
});
