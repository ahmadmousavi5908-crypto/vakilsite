import assert from "node:assert/strict";
import test from "node:test";
import { buildLegalServiceSchema, normalizePublicOfficeName } from "../../src/lib/seo/structured-content-schema.mjs";

const siteUrl = "https://vakilahmadmousavi.ir";

test("normalizes the owner-configured compact office name without changing unrelated names", () => {
  assert.equal(normalizePublicOfficeName("وکیل سیداحمدموسوی"), "وکیل سید احمد موسوی");
  assert.equal(normalizePublicOfficeName("  دفتر خدمات حقوقی سید احمد موسوی  "), "دفتر خدمات حقوقی سید احمد موسوی");
});

test("does not publish legal service location when the office is not explicitly public", () => {
  assert.equal(buildLegalServiceSchema(siteUrl, null), null);
  assert.equal(buildLegalServiceSchema(siteUrl, {
    is_location_public: false,
    address: "نشانی خصوصی",
    city: "اهواز",
    province: "خوزستان",
  }), null);
});

test("builds LegalService schema from complete public office details", () => {
  const schema = buildLegalServiceSchema(siteUrl, {
    is_location_public: true,
    office_name: "دفتر خدمات حقوقی سید احمد موسوی",
    address: "کیانپارس، خیابان نمونه",
    city: "اهواز",
    province: "خوزستان",
    latitude: 31.3184,
    longitude: 48.6706,
    map_url: "https://maps.google.com/?q=31.3184,48.6706",
    phone: "09169165902",
  });

  assert.equal(schema["@type"], "LegalService");
  assert.equal(schema["@id"], siteUrl + "/#legal-service-office");
  assert.equal(schema.name, "دفتر خدمات حقوقی سید احمد موسوی");
  assert.deepEqual(schema.address, {
    "@type": "PostalAddress",
    streetAddress: "کیانپارس، خیابان نمونه",
    addressLocality: "اهواز",
    addressRegion: "خوزستان",
    addressCountry: "IR",
  });
  assert.equal(schema.telephone, "+989169165902");
  assert.deepEqual(schema.geo, {
    "@type": "GeoCoordinates",
    latitude: 31.3184,
    longitude: 48.6706,
  });
  assert.equal(schema.hasMap, "https://maps.google.com/?q=31.3184,48.6706");
});

test("publishes city and region without mislabeling them as a street address", () => {
  const schema = buildLegalServiceSchema(siteUrl, {
    is_location_public: true,
    office_name: "وکیل سیداحمدموسوی",
    address: "خوزستان اهواز",
    city: "اهواز",
    province: "خوزستان",
  });

  assert.deepEqual(schema.address, {
    "@type": "PostalAddress",
    addressLocality: "اهواز",
    addressRegion: "خوزستان",
    addressCountry: "IR",
  });
  assert.equal("streetAddress" in schema.address, false);
  assert.equal("telephone" in schema, false);
  assert.equal(schema.name, "وکیل سید احمد موسوی");
});

test("omits incomplete or invalid optional office fields", () => {
  const schema = buildLegalServiceSchema(siteUrl, {
    is_location_public: true,
    address: "اهواز",
    city: "اهواز",
    province: "خوزستان",
    latitude: "",
    longitude: "",
    map_url: "javascript:alert(1)",
    phone: "not-a-phone",
  });

  assert.equal(schema["@type"], "LegalService");
  assert.equal("streetAddress" in schema.address, false);
  assert.equal("geo" in schema, false);
  assert.equal("hasMap" in schema, false);
  assert.equal("telephone" in schema, false);
});
