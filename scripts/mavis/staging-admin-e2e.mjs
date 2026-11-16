import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";

const PROJECT_REF = "srbwniqhaxwaoepjfizf";
const BASE_URL = process.env.STAGING_BASE_URL;
const SUPABASE_URL = process.env.STAGING_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
const ACCESS_TOKEN = process.env.SUPABASE_STAGING_ACCESS_TOKEN;
const DB_PASSWORD = process.env.SUPABASE_STAGING_DB_PASSWORD;
const RUN_ID = String(process.env.GITHUB_RUN_ID || Date.now()).replace(/[^0-9]/g, "");

for (const [name, value] of Object.entries({
  STAGING_BASE_URL: BASE_URL,
  STAGING_SUPABASE_URL: SUPABASE_URL,
  STAGING_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
  SUPABASE_STAGING_ACCESS_TOKEN: ACCESS_TOKEN,
  SUPABASE_STAGING_DB_PASSWORD: DB_PASSWORD,
})) {
  if (!value) throw new Error(`Missing required Staging environment value: ${name}`);
}

if (new URL(SUPABASE_URL).hostname !== `${PROJECT_REF}.supabase.co`) {
  throw new Error("The E2E test is not connected to the Staging Supabase project.");
}
if (new URL(BASE_URL).hostname !== "vakilahmadmousavi-ir-staging.ahmadmousavi5908.workers.dev") {
  throw new Error("The E2E test is not connected to the isolated Staging Worker.");
}

const DB_URL =
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require`;

const temporaryUsers = [];
let articleSlug = "";
let articleId = "";
let serviceKey = "";
let serviceKeyType = "";

function runSql(sql) {
  execFileSync(
    "npx",
    ["--yes", "supabase@3.0.0", "db", "query", `--remote=${DB_URL}`, sql],
    {
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 4 * 1024 * 1024,
    },
  );
}

async function readJson(response, label) {
  const body = await response.text();
  let parsed;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = body;
  }
  if (!response.ok) {
    const detail = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new Error(`${label} failed with HTTP ${response.status}: ${String(detail).slice(0, 600)}`);
  }
  return parsed;
}

async function getServiceKey() {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
  );
  const keys = await readJson(response, "Supabase Staging API-key inspection");
  if (!Array.isArray(keys)) throw new Error("Supabase API-key response was not a list.");

  const selected =
    keys.find((item) => item.type === "secret" && typeof item.api_key === "string") ||
    keys.find((item) => item.name === "service_role" && typeof item.api_key === "string");

  if (!selected?.api_key) {
    throw new Error(
      "The Staging access token cannot reveal an existing elevated API key. Grant API Keys Secrets Read to the Staging token.",
    );
  }

  serviceKey = selected.api_key;
  serviceKeyType = selected.type || "legacy";
  console.log(`Staging elevated key retrieved in-memory (type: ${serviceKeyType}); value was not logged.`);
}

function serviceHeaders() {
  const headers = {
    apikey: serviceKey,
    "Content-Type": "application/json",
  };
  if (serviceKeyType === "legacy" && serviceKey.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }
  return headers;
}

async function createTemporaryAdmin(label) {
  const email = `mavis-staging-e2e-${RUN_ID}-${label}@example.com`;
  const password = `${randomBytes(32).toString("base64url")}Aa1!`;

  const created = await readJson(
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `MAVIS Staging E2E ${label}` },
      }),
    }),
    "Temporary Staging user creation",
  );

  const user = created?.user || created;
  if (!user?.id) throw new Error("Supabase did not return the temporary user ID.");

  const temporaryUser = { id: user.id, email, password, accessToken: "", refreshToken: "" };
  temporaryUsers.push(temporaryUser);

  runSql(
    `INSERT INTO public.profiles (id, role)
     VALUES ('${user.id}', 'admin')
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;`,
  );

  const session = await readJson(
    await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }),
    "Temporary Staging admin sign-in",
  );

  if (!session?.access_token || !session?.refresh_token) {
    throw new Error("Supabase sign-in did not return a complete session.");
  }

  temporaryUser.accessToken = session.access_token;
  temporaryUser.refreshToken = session.refresh_token;
  console.log(`Temporary Staging admin authenticated: ${label}.`);
  return temporaryUser;
}

async function createSessionCookie(user) {
  const cookieJar = new Map();
  const client = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return [...cookieJar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) cookieJar.set(cookie.name, cookie.value);
      },
    },
  });

  const { error } = await client.auth.setSession({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });
  if (error) throw new Error(`Could not create the authenticated SSR cookie: ${error.message}`);

  const { data, error: claimsError } = await client.auth.getClaims();
  if (claimsError || !data?.claims?.sub || data.claims.role !== "authenticated") {
    throw new Error("The temporary session did not produce authenticated JWT claims.");
  }

  const cookieHeader = [...cookieJar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  if (!cookieHeader) throw new Error("Supabase SSR did not create an authentication cookie.");
  return cookieHeader;
}

async function callRpc(name, args, accessToken) {
  return readJson(
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    }),
    `MAVIS RPC ${name}`,
  );
}

async function readArticleAsAdmin(slug, accessToken) {
  return readJson(
    await fetch(
      `${SUPABASE_URL}/rest/v1/mavis_articles?select=id,slug,status,current_version&slug=eq.${encodeURIComponent(slug)}`,
      {
        headers: {
          apikey: PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    ),
    "Admin article read",
  );
}

async function readArticleAsPublic(slug) {
  return readJson(
    await fetch(
      `${SUPABASE_URL}/rest/v1/mavis_articles?select=id,slug,status,current_version&slug=eq.${encodeURIComponent(slug)}`,
      { headers: { apikey: PUBLISHABLE_KEY } },
    ),
    "Public article read",
  );
}

async function cleanup() {
  let failed = false;

  if (articleSlug) {
    try {
      runSql(`DELETE FROM public.mavis_articles WHERE slug = '${articleSlug}';`);
      console.log("Temporary MAVIS article and its dependent audit/version records were deleted.");
    } catch {
      console.error("Could not delete the temporary MAVIS article from Staging.");
      failed = true;
    }
  }

  if (temporaryUsers.length) {
    const ids = temporaryUsers.map((user) => `'${user.id}'`).join(", ");
    try {
      runSql(`DELETE FROM public.profiles WHERE id IN (${ids});`);
    } catch {
      console.error("Could not remove temporary Staging profile rows.");
      failed = true;
    }

    for (const user of temporaryUsers) {
      try {
        await readJson(
          await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
            method: "DELETE",
            headers: serviceHeaders(),
          }),
          "Temporary Staging user cleanup",
        );
      } catch {
        console.error(`Could not delete temporary Staging user ${user.id}.`);
        failed = true;
      }
    }
  }

  if (failed) process.exitCode = 1;
}

try {
  await getServiceKey();

  const author = await createTemporaryAdmin("author");
  const reviewer = await createTemporaryAdmin("reviewer");

  const authorCookie = await createSessionCookie(author);
  const adminPage = await fetch(`${BASE_URL}/admin/mavis/articles`, {
    headers: { cookie: authorCookie },
  });
  const adminHtml = await adminPage.text();
  if (adminPage.status !== 200 || !adminHtml.includes("MAVIS · CONTENT WORKSPACE")) {
    throw new Error(`Authenticated MAVIS admin page failed with HTTP ${adminPage.status}.`);
  }
  if (!adminHtml.includes("دسترسی مدیر تأیید شده")) {
    throw new Error("Authenticated admin page did not confirm the administrator session.");
  }
  console.log("Authenticated MAVIS admin page loaded successfully.");

  const statusResponse = await fetch(`${BASE_URL}/api/admin/mavis/search-console/status`, {
    headers: { cookie: authorCookie },
  });
  await readJson(statusResponse, "Authenticated Search Console status endpoint");
  console.log("Authenticated admin API access verified.");

  articleSlug = `mavis-staging-e2e-${RUN_ID}`;
  const firstPayload = {
    slug: articleSlug,
    title: "مقاله آزمایشی موقت MAVIS",
    author_name: "MAVIS Staging E2E",
    excerpt: "این مقاله فقط برای آزمون موقت چرخه تحریریه در محیط Staging ساخته شده است.",
    category: "آزمون فنی",
    tags: ["staging", "e2e"],
    content_schema_version: 1,
    content: {
      intro: "این مقدمه آزمایشی است و برای سنجش مسیر ثبت و انتشار مقاله استفاده می‌شود.",
      sections: [
        {
          heading: "بخش آزمایشی",
          body: "این متن صرفاً برای آزمون نسخه‌بندی، بازبینی و انتشار کنترل‌شده در Staging نوشته شده است.",
        },
      ],
      checklist: ["ثبت پیش‌نویس", "بازبینی نسخه دقیق", "انتشار کنترل‌شده"],
      warning: "این مقاله آزمایشی است و نباید در Production منتشر شود.",
    },
    seo_title: "مقاله آزمایشی MAVIS در Staging",
    seo_description: "آزمون موقت چرخه انتشار MAVIS در محیط Staging.",
  };

  const created = await callRpc(
    "save_mavis_article_draft",
    {
      p_payload: firstPayload,
      p_article_id: null,
      p_expected_version: null,
      p_change_note: "Temporary Staging E2E draft creation",
    },
    author.accessToken,
  );
  articleId = typeof created === "string" ? created : created?.id;
  if (!articleId) throw new Error("Draft creation did not return an article ID.");
  console.log("Draft version 1 created.");

  const secondPayload = {
    ...firstPayload,
    title: "مقاله آزمایشی MAVIS، نسخه دوم",
    excerpt: "نسخه دوم مقاله آزمایشی برای آزمون ویرایش و کنترل نسخه در محیط Staging ثبت شده است.",
    content: {
      ...firstPayload.content,
      sections: [
        {
          heading: "بخش بازبینی‌شده",
          body: "این نسخه دوم برای آزمون ثبت تغییرات، بازبینی نسخه دقیق و انتشار کنترل‌شده در Staging نوشته شده است.",
        },
      ],
    },
    seo_title: "نسخه دوم مقاله آزمایشی MAVIS",
  };

  await callRpc(
    "save_mavis_article_draft",
    {
      p_payload: secondPayload,
      p_article_id: articleId,
      p_expected_version: 1,
      p_change_note: "Temporary Staging E2E version 2",
    },
    author.accessToken,
  );

  const draftRows = await readArticleAsAdmin(articleSlug, author.accessToken);
  if (
    draftRows.length !== 1 ||
    draftRows[0].status !== "draft" ||
    draftRows[0].current_version !== 2
  ) {
    throw new Error("The edited draft was not stored as version 2.");
  }
  console.log("Draft edit and immutable version 2 verified.");

  const submission = await callRpc(
    "submit_mavis_article_for_review",
    { p_article_id: articleId, p_expected_version: 2 },
    author.accessToken,
  );
  if (submission?.status !== "in_review") {
    throw new Error("The exact draft version was not submitted for review.");
  }
  console.log("Version 2 submitted for review.");

  const decision = await callRpc(
    "decide_mavis_article_review",
    {
      p_article_id: articleId,
      p_article_version: 2,
      p_decision: "approved",
      p_decision_note: "Approved by the separate temporary Staging reviewer.",
    },
    reviewer.accessToken,
  );
  if (decision?.status !== "approved") {
    throw new Error("The reviewer did not approve the exact article version.");
  }
  console.log("Independent reviewer approval verified.");

  const publication = await callRpc(
    "publish_mavis_article",
    { p_article_id: articleId, p_expected_version: 2 },
    reviewer.accessToken,
  );
  if (publication?.status !== "published") {
    throw new Error("The explicit publication action did not publish version 2.");
  }

  const publicRows = await readArticleAsPublic(articleSlug);
  if (
    publicRows.length !== 1 ||
    publicRows[0].status !== "published" ||
    publicRows[0].current_version !== 2
  ) {
    throw new Error("The exact approved version was not visible to anonymous readers.");
  }

  const publicPage = await fetch(`${BASE_URL}/articles/${articleSlug}`);
  const publicHtml = await publicPage.text();
  if (publicPage.status !== 200 || !publicHtml.includes(secondPayload.title)) {
    throw new Error(`Public article page failed with HTTP ${publicPage.status}.`);
  }

  const libraryPage = await fetch(`${BASE_URL}/articles/library`);
  const libraryHtml = await libraryPage.text();
  if (libraryPage.status !== 200 || !libraryHtml.includes(articleSlug)) {
    throw new Error("The published article was not listed in the public article library.");
  }
  console.log("Published article is visible in the public library and detail page.");

  const unpublished = await callRpc(
    "unpublish_mavis_article",
    { p_article_id: articleId, p_expected_version: 2 },
    reviewer.accessToken,
  );
  if (unpublished?.status !== "approved") {
    throw new Error("The explicit unpublish action did not return the article to approved status.");
  }

  const hiddenRows = await readArticleAsPublic(articleSlug);
  if (hiddenRows.length !== 0) {
    throw new Error("Unpublished article remained visible to anonymous readers.");
  }

  const hiddenPage = await fetch(`${BASE_URL}/articles/${articleSlug}`);
  if (hiddenPage.status !== 404) {
    throw new Error(`Unpublished article detail route returned HTTP ${hiddenPage.status}, expected 404.`);
  }
  console.log("Unpublish and public visibility removal verified.");
} finally {
  await cleanup();
}
