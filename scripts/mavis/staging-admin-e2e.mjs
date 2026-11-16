import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { articles as staticArticles } from "../../src/data/articles.js";
import { buildMavisStaticArticleImport } from "../../src/lib/mavis/static-article-import.mjs";
import { normalizeMavisManualSourceInput } from "../../src/lib/mavis/manual-source-input.mjs";

const siteUrl = process.env.STAGING_SITE_URL;
const projectUrl = process.env.STAGING_SUPABASE_URL;
const publishableKey = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
const configuredDbUrl = process.env.SUPABASE_STAGING_DB_URL;
const dbPassword = process.env.SUPABASE_STAGING_DB_PASSWORD;
const runId = process.env.GITHUB_RUN_ID || "local";
const nonce = randomBytes(5).toString("hex");
let userId = randomUUID();
const email = `mavise2e${runId}${nonce}@example.invalid`;
const password = randomBytes(32).toString("base64url");
const slug = `mavis-staging-e2e-${runId}-${nonce}`;
const articleTitle = `MAVIS Staging E2E ${runId}`;
const fallbackDbUrl = dbPassword
  ? `postgresql://postgres.srbwniqhaxwaoepjfizf:${encodeURIComponent(dbPassword)}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require`
  : "";
let dbUrl = configuredDbUrl || fallbackDbUrl;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function runDbQuery(sql, { readOnly = false } = {}) {
  const args = ["--yes", "supabase@3.0.0", "db", "query"];
  if (!readOnly) args.push("--yes");
  args.push(`--remote=${dbUrl}`);
  if (readOnly) args.push("--read-only");
  args.push(sql);

  const result = spawnSync("npx", args, {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 8 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").slice(-5000);
    throw new Error(`Staging database command failed (exit ${result.status}):\n${detail}`);
  }

  return [result.stdout, result.stderr].filter(Boolean).join("\n");
}

function requireRpc(data, error, operation) {
  if (error) {
    throw new Error(`${operation} failed: ${error.code || "unknown"} ${error.message}`);
  }
  assert(data !== null && data !== undefined, `${operation} returned no result`);
  return data;
}

async function main() {
  assert(projectUrl, "Missing STAGING_SUPABASE_URL.");
  assert(publishableKey, "Missing STAGING_SUPABASE_PUBLISHABLE_KEY.");
  assert(dbUrl, "Missing SUPABASE_STAGING_DB_URL and SUPABASE_STAGING_DB_PASSWORD.");

  const parsedUrl = new URL(projectUrl);
  assert(
    parsedUrl.hostname === "srbwniqhaxwaoepjfizf.supabase.co" &&
      parsedUrl.protocol === "https:",
    "Refusing to run against a non-Staging Supabase project."
  );

  const dbCandidates = [...new Set([configuredDbUrl, fallbackDbUrl].filter(Boolean))];
  const isApprovedStagingDatabaseUrl = (value) => {
    try {
      const candidate = new URL(value);
      const username = decodeURIComponent(candidate.username);
      return (
        ["postgres:", "postgresql:"].includes(candidate.protocol) &&
        candidate.hostname === "aws-1-eu-central-1.pooler.supabase.com" &&
        candidate.port === "5432" &&
        username.endsWith(".srbwniqhaxwaoepjfizf") &&
        !username.includes("jroflcmiczfwtmiaxmpd") &&
        candidate.pathname === "/postgres"
      );
    } catch {
      return false;
    }
  };

  let databaseConnectionVerified = false;
  let lastDatabaseConnectionError;
  for (const candidate of dbCandidates) {
    assert(
      isApprovedStagingDatabaseUrl(candidate),
      "Refusing to connect to a database URI outside the approved Staging pooler."
    );
    dbUrl = candidate;
    try {
      runDbQuery("SELECT 1;", { readOnly: true });
      databaseConnectionVerified = true;
      console.log("Staging database connection verified.");
      break;
    } catch (error) {
      lastDatabaseConnectionError = error;
      if (candidate !== dbCandidates.at(-1)) {
        console.warn("Configured Staging database URI failed authentication; trying the password-based Staging fallback.");
      }
    }
  }
  assert(
    databaseConnectionVerified,
    `Unable to authenticate to the isolated Staging database: ${lastDatabaseConnectionError?.message || "unknown connection error"}`
  );

  let userSeedAttempted = false;
  let client;
  let executionError;
  let staticImportArticleId = null;
  let staticImportSourceId = null;

  const payload = {
    slug,
    title: articleTitle,
    author_name: "MAVIS Staging E2E",
    excerpt: "A temporary Staging article used to verify the complete editorial lifecycle.",
    category: "Staging verification",
    tags: ["staging", "e2e"],
    content_schema_version: 1,
    content: {
      intro: "This temporary article verifies authenticated editorial workflows in isolated Staging.",
      sections: [
        {
          heading: "Lifecycle verification",
          body: "The test creates a draft, submits it for review, approves the exact version, publishes it, checks public visibility, unpublishes, archives, restores, and removes all test records.",
        },
      ],
    },
  };

  try {
    console.log("Creating an isolated temporary Staging administrator identity.");
    userSeedAttempted = true;
    client = createClient(projectUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    console.log("Creating the isolated Staging Auth identity directly in the protected database.");
    runDbQuery(`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmation_token, recovery_token,
        email_change, email_change_token_current, email_change_token_new,
        email_change_confirm_status, phone_change, phone_change_token,
        reauthentication_token, raw_app_meta_data, raw_user_meta_data,
        is_sso_user, is_anonymous, created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        ${sqlString(userId)}::uuid,
        'authenticated',
        'authenticated',
        ${sqlString(email)},
        extensions.crypt(${sqlString(password)}, extensions.gen_salt('bf')),
        now(),
        '', '', '', '', '', 0, '', '', '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'sub', ${sqlString(userId)},
          'email', ${sqlString(email)},
          'email_verified', true,
          'phone_verified', false,
          'full_name', 'MAVIS Staging E2E'
        ),
        false,
        false,
        now(),
        now()
      );
    `);

    runDbQuery(`
      INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${sqlString(userId)},
        ${sqlString(userId)}::uuid,
        jsonb_build_object(
          'sub', ${sqlString(userId)},
          'email', ${sqlString(email)},
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        now(),
        now()
      );
    `);

    runDbQuery(`
      INSERT INTO public.profiles (id, role)
      VALUES (${sqlString(userId)}::uuid, 'admin')
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
    `);

    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      throw new Error(`Temporary Staging administrator sign-in failed: ${authError.message}`);
    }
    assert(authData.user?.id === userId, "Supabase Auth returned an unexpected test identity.");
    assert(authData.session?.access_token, "Supabase Auth did not issue an access token.");

    console.log("Authenticated Staging administrator successfully.");

    assert(siteUrl, "Missing STAGING_SITE_URL.");
    const stagingOrigin = new URL(siteUrl);
    assert(
      stagingOrigin.protocol === "https:" &&
        (stagingOrigin.hostname.startsWith("vakilahmadmousavi-ir-staging.") && stagingOrigin.hostname.endsWith(".workers.dev")
          || stagingOrigin.hostname.startsWith("staging.")),
      "Refusing to run runtime checks against a non-Staging site origin."
    );

    const sessionCookies = new Map();
    const ssrClient = createServerClient(projectUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return [...sessionCookies].map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) sessionCookies.set(name, value);
        },
      },
    });
    const { error: cookieSessionError } = await ssrClient.auth.setSession(authData.session);
    if (cookieSessionError) throw new Error("Unable to prepare an isolated SSR session for Staging runtime checks.");
    const cookieHeader = [...sessionCookies].map(([name, value]) => name + "=" + value).join("; ");
    assert([...sessionCookies.keys()].some((name) => name.startsWith("sb-srbwniqhaxwaoepjfizf-auth-token")),
      "Supabase SSR session cookie was not created.");

    const runtimeHeaders = {
      origin: stagingOrigin.origin,
      cookie: cookieHeader,
      "content-type": "application/json",
    };
    const aiSmokeResponse = await fetch(new URL("/api/admin/mavis/runtime-smoke", stagingOrigin), {
      method: "POST",
      headers: runtimeHeaders,
      body: "{}",
      redirect: "error",
    });
    const aiSmokePayload = await aiSmokeResponse.json();
    assert(
      aiSmokeResponse.status === 200 &&
        aiSmokePayload.ok === true &&
        aiSmokePayload.provider === "cloudflare_workers_ai" &&
        aiSmokePayload.outputValidated === true,
      "Live Staging Workers AI inference or structured-output validation failed: " +
        String(aiSmokePayload.error?.validationReason || aiSmokePayload.error?.code || aiSmokeResponse.status)
    );
    assert(
      aiSmokePayload.sourceSearch?.browserBindingAvailable === true &&
        aiSmokePayload.sourceSearch.officialPortalFallbackAvailable === true,
      "Staging Browser Run binding or official portal fallback is unavailable."
    );
    assert(
      !aiSmokePayload.sourceSearch.providerWarnings.includes("BROWSER_BINDING_UNAVAILABLE"),
      "Staging Browser Run binding is not exposed to the Worker."
    );
    console.log(
      "PASS: live Staging official-source fallback is available; provider=" +
      aiSmokePayload.sourceSearch.provider +
      "; parsedResults=" + String(aiSmokePayload.sourceSearch.parsedResults) +
      "; warnings=" + aiSmokePayload.sourceSearch.providerWarnings.join(",") + "."
    );
    console.log(
      "PASS: live Staging Workers AI inference and structured JSON validation succeeded (" +
      aiSmokePayload.model + ")."
    );

    const iranianSearchResponse = await fetch(new URL("/api/admin/mavis/source-search", stagingOrigin), {
      method: "POST",
      headers: runtimeHeaders,
      body: JSON.stringify({ query: "رأی وحدت رویه", group: "news", limit: 10 }),
      redirect: "error",
    });
    const iranianSearchPayload = await iranianSearchResponse.json();
    assert(
      iranianSearchResponse.status === 200 &&
        iranianSearchPayload.ok === true &&
        iranianSearchPayload.group === "news" &&
        Array.isArray(iranianSearchPayload.searchLinks) &&
        iranianSearchPayload.searchLinks.length === 2 &&
        iranianSearchPayload.searchLinks.some((item) => item.url.includes("site%3Amizanonline.ir")) &&
        iranianSearchPayload.searchLinks.some((item) => item.url.includes("site%3Aekhtebar.ir")),
      "Authenticated Iranian source search did not return Google-restricted links for the two configured legal news sources."
    );
    console.log("PASS: authenticated Iranian source search returns Google site-restricted links for Mizan and Ekhtebar.");

    const { data: articleId, error: draftError } = await client.rpc(
      "save_mavis_article_draft",
      {
        p_payload: payload,
        p_article_id: null,
        p_expected_version: null,
        p_change_note: "Automated Staging E2E draft creation",
      }
    );
    requireRpc(articleId, draftError, "Create draft");
    assert(typeof articleId === "string", "Draft RPC did not return an article UUID.");

    const { data: adminRead, error: adminReadError } = await client
      .from("mavis_editorial_articles")
      .select("id, slug, status, current_version")
      .eq("id", articleId)
      .single();
    if (adminReadError) throw new Error(`Canonical admin read failed: ${adminReadError.message}`);
    assert(adminRead.slug === slug && adminRead.status === "draft", "Admin read did not return the created draft.");

    const anonymous = createClient(projectUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const staticArticle = staticArticles.find((item) => item.slug === "civil-claim-checklist") || staticArticles[0];
    const { data: existingStaticArticle, error: existingStaticArticleError } = await client
      .from("mavis_editorial_articles")
      .select("id, status")
      .eq("slug", staticArticle.slug)
      .maybeSingle();
    if (existingStaticArticleError) {
      throw new Error(`Static article import preflight failed: ${existingStaticArticleError.message}`);
    }
    if (existingStaticArticle) {
      console.log("SKIP: a Staging CMS record already uses the selected static article slug; preserving administrator data.");
    } else {
      const staticImport = buildMavisStaticArticleImport(staticArticle);
      const { data: importedStaticId, error: staticImportError } = await client.rpc(
        "save_mavis_article_draft",
        {
          p_payload: staticImport.payload,
          p_article_id: null,
          p_expected_version: null,
          p_change_note: "E2E: import an existing static article as an unpublished versioned draft.",
        }
      );
      if (staticImportError?.code === "23505") {
        console.log("SKIP: the static article was imported concurrently; no existing record was modified.");
      } else {
        requireRpc(importedStaticId, staticImportError, "Import static article as draft");
        assert(typeof importedStaticId === "string", "Static article import did not return an article UUID.");
        staticImportArticleId = importedStaticId;
        const normalizedStaticSource = normalizeMavisManualSourceInput({
          title: "MAVIS Staging E2E source fixture",
          sourceUrl: `https://example.com/mavis-staging-e2e-${runId}-${nonce}`,
          sourceType: "manual",
          relationType: "research_background",
        });
        const { data: staticSourceResult, error: staticSourceError } = await client.rpc(
          "add_mavis_manual_article_source",
          {
            p_article_id: importedStaticId,
            p_expected_version: 1,
            p_source: normalizedStaticSource.source,
            p_relation_type: normalizedStaticSource.relationType,
          }
        );
        requireRpc(staticSourceResult, staticSourceError, "Attach a manual HTTPS research source to imported static draft");
        assert(staticSourceResult.ok === true && staticSourceResult.source?.id,
          "Static draft source attachment did not return a source record.");
        staticImportSourceId = staticSourceResult.source.id;
        assert(staticSourceResult.current_version === 2,
          "Attaching a manual source did not advance the static draft version.");
        console.log("PASS: static draft accepts an HTTPS manual research source with a version bump and no authority claim.");

        const { data: anonymousStaticDraft, error: anonymousStaticDraftError } = await anonymous
          .from("mavis_articles")
          .select("id")
          .eq("id", importedStaticId)
          .maybeSingle();
        if (anonymousStaticDraftError) throw new Error(`Static draft visibility check failed: ${anonymousStaticDraftError.message}`);
        assert(!anonymousStaticDraft, "Imported static article draft became public before approval.");
        console.log("PASS: a current static article imports as a versioned draft and remains hidden from anonymous database readers.");
      }
    }

    const { data: hiddenDraft, error: hiddenDraftError } = await anonymous
      .from("mavis_articles")
      .select("id")
      .eq("id", articleId)
      .maybeSingle();
    if (hiddenDraftError) throw new Error(`Anonymous draft visibility check failed: ${hiddenDraftError.message}`);
    assert(!hiddenDraft, "Unpublished draft was visible to anonymous readers.");

    const { data: submitResult, error: submitError } = await client.rpc(
      "submit_mavis_article_for_review",
      { p_article_id: articleId, p_expected_version: 1 }
    );
    requireRpc(submitResult, submitError, "Submit for review");
    assert(submitResult.status === "in_review", "Article did not enter in_review.");

    const { data: decisionResult, error: decisionError } = await client.rpc(
      "decide_mavis_article_review",
      {
        p_article_id: articleId,
        p_article_version: 1,
        p_decision: "approved",
        p_decision_note: "Approved by the isolated Staging E2E reviewer.",
      }
    );
    requireRpc(decisionResult, decisionError, "Approve exact version");
    assert(decisionResult.status === "approved", "Article was not approved.");

    const { data: publishResult, error: publishError } = await client.rpc(
      "publish_mavis_article",
      { p_article_id: articleId, p_expected_version: 1 }
    );
    requireRpc(publishResult, publishError, "Publish exact version");
    assert(publishResult.status === "published", "Article was not published.");

    const { data: publicArticle, error: publicReadError } = await anonymous
      .from("mavis_articles")
      .select("id, slug, status, published_at")
      .eq("id", articleId)
      .maybeSingle();
    if (publicReadError) throw new Error(`Anonymous public-view read failed: ${publicReadError.message}`);
    assert(publicArticle?.slug === slug && publicArticle.status === "published", "Published article is not publicly visible.");

    const { data: publicFeed, error: publicFeedError } = await anonymous.rpc(
      "get_mavis_published_articles"
    );
    if (publicFeedError) throw new Error(`Public published-articles RPC failed: ${publicFeedError.message}`);
    assert(
      Array.isArray(publicFeed) && publicFeed.some((item) => item.slug === slug),
      "Published article is missing from the public feed."
    );

    const { data: publicCanonicalRead, error: publicCanonicalReadError } = await anonymous
      .from("mavis_editorial_articles")
      .select("id, slug, status")
      .eq("id", articleId)
      .maybeSingle();
    if (publicCanonicalReadError) throw new Error(`Anonymous public-column read failed: ${publicCanonicalReadError.message}`);
    assert(
      publicCanonicalRead?.slug === slug && publicCanonicalRead.status === "published",
      "Anonymous access did not receive the published public-column projection."
    );

    const { error: privateColumnError } = await anonymous
      .from("mavis_editorial_articles")
      .select("draft_content")
      .eq("id", articleId)
      .maybeSingle();
    assert(
      Boolean(privateColumnError),
      "Anonymous access unexpectedly read the private draft_content column."
    );

    const { data: unpublishResult, error: unpublishError } = await client.rpc(
      "unpublish_mavis_article",
      { p_article_id: articleId, p_expected_version: 1 }
    );
    requireRpc(unpublishResult, unpublishError, "Unpublish article");
    assert(unpublishResult.status === "approved", "Unpublish did not return the article to approved.");

    const { data: hiddenAfterUnpublish, error: hiddenAfterUnpublishError } = await anonymous
      .from("mavis_articles")
      .select("id")
      .eq("id", articleId)
      .maybeSingle();
    if (hiddenAfterUnpublishError) throw new Error(hiddenAfterUnpublishError.message);
    assert(!hiddenAfterUnpublish, "Unpublished article remained publicly visible.");

    const { data: hiddenCanonicalAfterUnpublish, error: hiddenCanonicalAfterUnpublishError } = await anonymous
      .from("mavis_editorial_articles")
      .select("id")
      .eq("id", articleId)
      .maybeSingle();
    if (hiddenCanonicalAfterUnpublishError) throw new Error(hiddenCanonicalAfterUnpublishError.message);
    assert(!hiddenCanonicalAfterUnpublish, "Unpublished canonical record remained visible to anonymous readers.");

    const { data: archiveResult, error: archiveError } = await client.rpc(
      "archive_mavis_article",
      {
        p_article_id: articleId,
        p_expected_version: 1,
        p_note: "Automated Staging E2E archive verification",
      }
    );
    requireRpc(archiveResult, archiveError, "Archive article");
    assert(archiveResult.status === "archived", "Article was not archived.");

    const { data: restoreResult, error: restoreError } = await client.rpc(
      "restore_mavis_article",
      { p_article_id: articleId, p_expected_version: 1 }
    );
    requireRpc(restoreResult, restoreError, "Restore article");
    assert(restoreResult.status === "approved", "Restored article did not return to approved.");

    const { data: republishResult, error: republishError } = await client.rpc(
      "publish_mavis_article",
      { p_article_id: articleId, p_expected_version: 1 }
    );
    requireRpc(republishResult, republishError, "Republish restored article");
    assert(republishResult.status === "published", "Restored article could not be republished.");

    const { data: finalUnpublishResult, error: finalUnpublishError } = await client.rpc(
      "unpublish_mavis_article",
      { p_article_id: articleId, p_expected_version: 1 }
    );
    requireRpc(finalUnpublishResult, finalUnpublishError, "Final unpublish");
    assert(finalUnpublishResult.status === "approved", "Final unpublish did not complete.");

    const { data: finalPublicRead, error: finalPublicReadError } = await anonymous
      .from("mavis_articles")
      .select("id")
      .eq("id", articleId)
      .maybeSingle();
    if (finalPublicReadError) throw new Error(finalPublicReadError.message);
    assert(!finalPublicRead, "Article remained public after the final unpublish.");

    console.log("PASS: draft → review → approval → publish → public read → unpublish → archive → restore → republish → unpublish.");
    console.log("PASS: anonymous readers see only published rows and approved public columns; private draft fields remain denied.");
  } catch (error) {
    executionError = error;
  } finally {
    if (client) {
      await client.auth.signOut().catch(() => {});
    }

    console.log("Cleaning temporary Staging E2E records.");
    try {
      const cleanupStatements = [
        `DELETE FROM public.mavis_article_sources WHERE article_id IN (SELECT id FROM public.mavis_editorial_articles WHERE slug = ${sqlString(slug)});`,
        `DELETE FROM public.mavis_article_approvals WHERE article_id IN (SELECT id FROM public.mavis_editorial_articles WHERE slug = ${sqlString(slug)});`,
        `DELETE FROM public.mavis_article_versions WHERE article_id IN (SELECT id FROM public.mavis_editorial_articles WHERE slug = ${sqlString(slug)});`,
        `DELETE FROM public.mavis_article_audit_events WHERE article_id IN (SELECT id FROM public.mavis_editorial_articles WHERE slug = ${sqlString(slug)});`,
        `DELETE FROM public.mavis_editorial_articles WHERE slug = ${sqlString(slug)};`,
        `DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = ${sqlString(email)});`,
        `DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = ${sqlString(email)});`,
        `DELETE FROM auth.users WHERE email = ${sqlString(email)};`,
      ];

      if (staticImportArticleId) {
        cleanupStatements.unshift(
          `DELETE FROM public.mavis_article_sources WHERE article_id = ${sqlString(staticImportArticleId)}::uuid;`,
          ...(staticImportSourceId
            ? [`DELETE FROM public.mavis_sources WHERE id = ${sqlString(staticImportSourceId)}::uuid;`]
            : []),
          `DELETE FROM public.mavis_article_approvals WHERE article_id = ${sqlString(staticImportArticleId)}::uuid;`,
          `DELETE FROM public.mavis_article_versions WHERE article_id = ${sqlString(staticImportArticleId)}::uuid;`,
          `DELETE FROM public.mavis_article_audit_events WHERE article_id = ${sqlString(staticImportArticleId)}::uuid;`,
          `DELETE FROM public.mavis_editorial_articles WHERE id = ${sqlString(staticImportArticleId)}::uuid;`
        );
      }

      if (userSeedAttempted) {
        for (const statement of cleanupStatements) runDbQuery(statement);
      }

      const staticImportCleanupCheck = staticImportArticleId
        ? `AND NOT EXISTS (SELECT 1 FROM public.mavis_editorial_articles WHERE id = ${sqlString(staticImportArticleId)}::uuid)
          ${staticImportSourceId ? `AND NOT EXISTS (SELECT 1 FROM public.mavis_sources WHERE id = ${sqlString(staticImportSourceId)}::uuid)` : ""}`
        : "";
      const cleanupCheck = runDbQuery(
        `SELECT CASE WHEN
          NOT EXISTS (SELECT 1 FROM public.mavis_editorial_articles WHERE slug = ${sqlString(slug)})
          AND NOT EXISTS (SELECT 1 FROM auth.users WHERE email = ${sqlString(email)})
          ${staticImportCleanupCheck}
          THEN 'MAVIS_STAGING_E2E_CLEANUP_OK'
          ELSE 'MAVIS_STAGING_E2E_CLEANUP_FAILED'
        END AS status;`,
        { readOnly: true }
      );
      assert(
        cleanupCheck.includes("MAVIS_STAGING_E2E_CLEANUP_OK"),
        "Temporary Staging E2E records were not fully cleaned up."
      );
      console.log("PASS: all temporary Staging E2E records and identity were removed.");
    } catch (cleanupError) {
      if (executionError) {
        console.error("Temporary E2E cleanup also failed:", cleanupError?.stack || cleanupError);
      } else {
        executionError = cleanupError;
      }
    }
  }

  if (executionError) throw executionError;
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
