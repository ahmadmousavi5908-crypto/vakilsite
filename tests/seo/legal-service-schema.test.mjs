import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildLegalServiceSchema, buildPracticeAreaServiceSchema, normalizePublicOfficeName } from "../../src/lib/seo/structured-content-schema.mjs";

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

  assert.deepEqual(schema["@type"], ["LegalService", "LocalBusiness"]);
  assert.deepEqual(schema.sameAs, ["https://www.instagram.com/vakilahmadmousavi/"]);
  assert.equal(schema["@id"], siteUrl + "/#legal-service-office");
  assert.equal(schema.name, "دفتر خدمات حقوقی سید احمد موسوی");
  assert.deepEqual(schema.address, {
    "@type": "PostalAddress",
    streetAddress: "کیانپارس، خیابان نمونه",
    addressLocality: "اهواز",
    addressRegion: "خوزستان",
    addressCountry: "IR",
  });
  assert.equal(schema.telephone, "+98 916 916 5902");
  assert.deepEqual(
    schema.areaServed.filter((area) => area["@type"] === "City").map((area) => area.name),
    ["اهواز", "آبادان", "خرمشهر", "دزفول", "شوشتر", "اندیمشک", "ماهشهر", "بندر امام خمینی", "بهبهان", "رامهرمز", "ایذه", "مسجدسلیمان", "شوش", "هویزه"],
  );
  assert.deepEqual(schema.areaServed.at(-1), {
    "@type": "AdministrativeArea",
    name: "استان خوزستان",
  });
  assert.equal(schema.areaServed.some((area) => area["@type"] === "Country"), false);
  assert.deepEqual(schema.geo, {
    "@type": "GeoCoordinates",
    latitude: 31.3184,
    longitude: 48.6706,
  });
  assert.equal(schema.hasMap, "https://maps.google.com/?q=31.3184,48.6706");
});

test("formats already-international Iranian office phones exactly like the visible contact label", () => {
  const schema = buildLegalServiceSchema(siteUrl, {
    is_location_public: true,
    office_name: "وکیل سید احمد موسوی",
    address: "خوزستان اهواز",
    city: "اهواز",
    province: "خوزستان",
    phone: "+989169165902",
  });

  assert.equal(schema.telephone, "+98 916 916 5902");
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

  assert.deepEqual(schema["@type"], ["LegalService", "LocalBusiness"]);
  assert.deepEqual(schema.sameAs, ["https://www.instagram.com/vakilahmadmousavi/"]);
  assert.equal("streetAddress" in schema.address, false);
  assert.equal("geo" in schema, false);
  assert.equal("hasMap" in schema, false);
  assert.equal("telephone" in schema, false);
});


test("keeps the homepage visible brand, WebSite, Service and root metadata on the canonical attorney name", () => {
  const homepage = readFileSync(new URL("../../src/app/page.js", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../../src/app/layout.js", import.meta.url), "utf8");

  assert.equal(homepage.split('<strong>وکیل سید احمد موسوی</strong>').length - 1, 2);
  assert.equal(homepage.split('name: "وکیل سید احمد موسوی"').length - 1, 2);
  assert.ok(homepage.includes("sameAs: [ATTORNEY_OFFICIAL_SOCIAL_PROFILE_URL]"));
  assert.ok(homepage.includes("[normalizedOfficeLocation?.phone, ...PUBLIC_OFFICE_PHONE_FALLBACKS]"));
  assert.ok(homepage.includes("telephone: officePhoneLabels,"));
  assert.ok(homepage.includes('className="contact-assurance contact-phone-links"'));
  assert.ok(homepage.includes("officePhoneLinks.map"));
  assert.ok(homepage.includes("PUBLIC_OFFICE_PHONE_FALLBACKS"));
  const deploymentWorkflow = readFileSync(
    new URL("../../.github/workflows/deploy-cloudflare.yml", import.meta.url),
    "utf8",
  );
  assert.ok(deploymentWorkflow.includes('Array.isArray(legalService["@type"])'));
  assert.ok(deploymentWorkflow.includes('legalServiceTypes.includes("LegalService")'));
  assert.ok(deploymentWorkflow.includes('legalServiceTypes.includes("LocalBusiness")'));
  assert.ok(deploymentWorkflow.includes("LegalService hasMap must be derived from the verified public coordinates."));
  assert.ok(deploymentWorkflow.includes("Visible public phone numbers:"));
  assert.ok(layout.includes('default: "وکیل سید احمد موسوی | وکیل پایه یک در اهواز و خوزستان"'));
  assert.ok(layout.includes('applicationName: "وکیل سید احمد موسوی"'));
  assert.ok(layout.includes('title: "وکیل سید احمد موسوی | اهواز و خوزستان"'));
  assert.ok(layout.includes('siteName: "وکیل سید احمد موسوی"'));
});

test("derives a public map link from verified coordinates when no map URL is configured", () => {
  const schema = buildLegalServiceSchema(siteUrl, {
    is_location_public: true,
    office_name: "وکیل سید احمد موسوی",
    address: "خوزستان اهواز",
    city: "اهواز",
    province: "خوزستان",
    latitude: 31.3193376,
    longitude: 48.6832329,
    map_url: "",
    phone: "09169165902",
  });

  assert.deepEqual(schema.geo, {
    "@type": "GeoCoordinates",
    latitude: 31.3193376,
    longitude: 48.6832329,
  });
  assert.equal(
    schema.hasMap,
    "https://www.google.com/maps?q=31.3193376,48.6832329",
  );
});

test("uses the same verified Khuzestan service area for practice-area pages", () => {
  const schema = buildPracticeAreaServiceSchema(siteUrl, {
    slug: "property-law",
    title: "دعاوی ملکی",
    description: "بررسی حقوقی اختلافات ملکی در اهواز و خوزستان",
  });

  assert.deepEqual(
    schema.areaServed.filter((area) => area["@type"] === "City").map((area) => area.name),
    ["اهواز", "آبادان", "خرمشهر", "دزفول", "شوشتر", "اندیمشک", "ماهشهر", "بندر امام خمینی", "بهبهان", "رامهرمز", "ایذه", "مسجدسلیمان", "شوش", "هویزه"],
  );
  assert.deepEqual(schema.areaServed.at(-1), {
    "@type": "AdministrativeArea",
    name: "استان خوزستان",
  });
});
