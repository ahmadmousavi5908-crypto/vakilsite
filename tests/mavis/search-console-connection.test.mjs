import test from "node:test";
import assert from "node:assert/strict";
import {
  createSearchConsoleClientFromStoredConnection,
  readStoredSearchConsoleConnection,
} from "../../src/lib/mavis/search-console-connection.mjs";
import { encryptSearchConsoleRefreshToken } from "../../src/lib/mavis/search-console-oauth.mjs";

const env = {
  MAVIS_GSC_CLIENT_ID: "client-id",
  MAVIS_GSC_CLIENT_SECRET: "client-secret",
  MAVIS_GSC_SITE_URL: "https://vakilahmadmousavi.ir/",
  MAVIS_GSC_TOKEN_ENCRYPTION_KEY: "a".repeat(64),
};

function createSupabase(data, error = null) {
  const calls = [];
  return {
    calls,
    async rpc(name) {
      calls.push(name);
      return { data, error };
    },
  };
}

test("reads only the admin RPC connection record and returns null when disconnected", async () => {
  const disconnected = createSupabase(null);
  assert.equal(await readStoredSearchConsoleConnection(disconnected), null);
  assert.deepEqual(disconnected.calls, ["get_mavis_search_console_connection"]);
});

test("builds an API client from encrypted stored credentials without exposing the token", async () => {
  const encryptedRefreshToken = encryptSearchConsoleRefreshToken("google-refresh-token-secret", env);
  const supabase = createSupabase({
    connected: true,
    encryptedRefreshToken,
    siteUrl: "https://vakilahmadmousavi.ir/",
    connectedAt: "2026-11-14T12:00:00.000Z",
  });
  const client = await createSearchConsoleClientFromStoredConnection({ supabase, env });
  assert.equal(client.source, "google_search_console");
  assert.equal(client.scope, "https://www.googleapis.com/auth/webmasters.readonly");
  const reusedClient = await createSearchConsoleClientFromStoredConnection({ supabase, env });
  assert.equal(reusedClient, client);
  assert.equal(supabase.calls.length, 2);
});

test("fails closed when stored property or server credentials do not match", async () => {
  const supabase = createSupabase({
    connected: true,
    encryptedRefreshToken: encryptSearchConsoleRefreshToken("google-refresh-token-secret", env),
    siteUrl: "https://other.example/",
    connectedAt: "2026-11-14T12:00:00.000Z",
  });
  await assert.rejects(createSearchConsoleClientFromStoredConnection({ supabase, env }));
});

test("does not expose database errors or accept malformed connection records", async () => {
  await assert.rejects(readStoredSearchConsoleConnection(createSupabase(null, new Error("private database details"))), /could not be read/);
  await assert.rejects(readStoredSearchConsoleConnection(createSupabase({ connected: true })), /invalid/);
});
