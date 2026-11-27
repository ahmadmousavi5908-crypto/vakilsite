import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getStaticPageSearchSignals } from "../../src/lib/seo/static-page-search-signals.mjs";

const origin = "https://vakilahmadmousavi.ir";
const portrait = origin + "/images/lawyer.jpg";

test("publishes the homepage update date without associating the attorney portrait with it", () => {
  assert.deepEqual(getStaticPageSearchSignals("/", origin), {
    lastModified: "2026-11-26",
  });
  assert.deepEqual(getStaticPageSearchSignals("/about", origin), {
    lastModified: "2026-11-27",
    images: [portrait],
  });
  assert.deepEqual(getStaticPageSearchSignals("/locations/khuzestan", origin), {
    lastModified: "2026-11-27",
  });
  assert.deepEqual(getStaticPageSearchSignals("/services", origin), { lastModified: "2026-11-27" });
});

test("publishes accurate last-modified dates for service pages by their latest content change", () => {
  const pathsUpdatedOnNovember27 = [
    "/services",
    "/services/family-law",
    "/services/criminal-law",
    "/services/contracts-and-obligations",
    "/services/claims-and-enforcement",
    "/services/legal-consultation",
  ];
  for (const path of pathsUpdatedOnNovember27) {
    assert.equal(getStaticPageSearchSignals(path, origin).lastModified, "2026-11-27");
  }
  assert.equal(getStaticPageSearchSignals("/services/property-law", origin).lastModified, "2026-11-27");
});

test("does not invent image or update metadata for unrelated pages", () => {
  assert.deepEqual(getStaticPageSearchSignals("/articles", origin), {});
  assert.deepEqual(getStaticPageSearchSignals("/privacy", origin), {});
});

test("requires a safe HTTPS origin", () => {
  assert.throws(() => getStaticPageSearchSignals("/", "http://vakilahmadmousavi.ir"), /HTTPS/);
});

test("wires the regional page last-modified signal into the public sitemap", () => {
  const sitemapSource = readFileSync(new URL("../../src/app/sitemap.js", import.meta.url), "utf8");
  assert.match(
    sitemapSource,
    /path: "\/locations\/khuzestan",\s*\.\.\.getStaticPageSearchSignals\("\/locations\/khuzestan", siteUrl\)/,
  );
});


test("keeps the attorney profile title absolute and the social titles explicit", () => {
  const aboutSource = readFileSync(new URL("../../src/app/about/page.js", import.meta.url), "utf8");
  assert.match(
    aboutSource,
    /title:\s*\{\s*absolute:\s*"سید احمد موسوی، وکیل پایه یک در اهواز \| پروانه ۷۴۵۱۶"\s*\}/u,
  );
  assert.match(aboutSource, /openGraph:\s*\{[\s\S]*?title:\s*"سید احمد موسوی، وکیل پایه یک در اهواز \| پروانه ۷۴۵۱۶"/u);
  assert.match(aboutSource, /twitter:\s*\{[\s\S]*?title:\s*"سید احمد موسوی، وکیل پایه یک در اهواز \| پروانه ۷۴۵۱۶"/u);
});


test("keeps the homepage meta description within the search snippet budget", () => {
  const layoutSource = readFileSync(new URL("../../src/app/layout.js", import.meta.url), "utf8");
  const description = layoutSource.match(/description:\s*"([^"]+)"/u)?.[1];
  assert.ok(description, "Homepage meta description must be present");
  assert.ok(description.length <= 160, `Homepage meta description is too long: ${description.length}`);
  assert.match(description, /سید احمد موسوی/u);
  assert.match(description, /اهواز/u);
});


test("publishes machine-readable attorney identity disambiguation", () => {
  const llms = readFileSync(new URL("../../public/llms.txt", import.meta.url), "utf8");
  assert.match(llms, /شماره پروانه وکالت درج‌شده در وب‌سایت: ۷۴۵۱۶/u);
  assert.match(llms, /مرجع عضویت حرفه‌ای: مرکز وکلای قوه قضائیه/u);
  assert.match(llms, /این مرجع عضویت با «کانون وکلای دادگستری» متفاوت است/u);
  assert.match(llms, /مرجع را دقیقاً «مرکز وکلای قوه قضائیه» ذکر کنید/u);
  assert.match(llms, /کارشناسی ارشد حقوق جزا/u);
  assert.match(llms, /تشابه نام به‌تنهایی/u);
  assert.match(llms, /محل فعالیت دفتر: اهواز، محدوده امانیه، استان خوزستان/u);
  assert.match(llms, /نشانی خیابانی دفتر عمداً در این فایل درج نشده است/u);
  assert.doesNotMatch(llms, /خیابان سقراط شرقی|ساختمان آراد/u);
  assert.match(llms, /09169165902/u);
  assert.match(llms, /09388322230/u);
  assert.match(llms, /https:\/\/hub\.23055\.ir\/search-lawyer/u);
});
