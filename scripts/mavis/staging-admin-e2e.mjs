import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const projectUrl = process.env.STAGING_SUPABASE_URL;
const publishableKey = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
const dbPassword = process.env.SUPABASE_STAGING_DB_PASSWORD;
const runId = process.env.GITHUB_RUN_ID || "local";
const nonce = randomBytes(5).toString("hex");
let userId = randomUUID();
const email = `mavise2e${runId}${nonce}@example.invalid`;
const password = randomBytes(32).toString("base64url");
const slug = `mavis-staging-e2e-${runId}-${nonce}`;
const articleTitle = `MAVIS Staging E2E ${runId}`;
const dbUrl = `postgresql://postgres.srbwniqhaxwaoepjfizf:${encodeURIComponent(dbPassword || "")}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require`;

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
  assert(dbPassword, "Missing SUPABASE_STAGING_DB_PASSWORD.");

  const parsedUrl = new URL(projectUrl);
  assert(
    parsedUrl.hostname === "srbwniqhaxwaoepjfizf.supabase.co" &&
      parsedUrl.protocol === "https:",
    "Refusing to run against a non-Staging Supabase project."
  );

  let userSeedAttempted = false;
  let client;
  let executionError;

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

      if (userSeedAttempted) {
        for (const statement of cleanupStatements) runDbQuery(statement);
      }

      const cleanupCheck = runDbQuery(
        `SELECT CASE WHEN
          NOT EXISTS (SELECT 1 FROM public.mavis_editorial_articles WHERE slug = ${sqlString(slug)})
          AND NOT EXISTS (SELECT 1 FROM auth.users WHERE email = ${sqlString(email)})
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
