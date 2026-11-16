import assert from "node:assert/strict";
import test from "node:test";
import { requireAdminWithClient } from "../../src/lib/supabase/admin-core.mjs";

function createSupabase({ claimsResult, claimsError, claimsThrow, rpcResult, rpcError, rpcThrow } = {}) {
  return {
    auth: {
      async getClaims() {
        if (claimsThrow) throw claimsThrow;
        if (claimsError) return { data: null, error: claimsError };
        return claimsResult !== undefined
          ? claimsResult
          : { data: { claims: { sub: "user-123", email: "admin@example.test" } }, error: null };
      },
    },
    async rpc(name) {
      assert.equal(name, "is_site_admin");
      if (rpcThrow) throw rpcThrow;
      if (rpcError) return { data: null, error: rpcError };
      return rpcResult !== undefined ? rpcResult : { data: true, error: null };
    },
  };
}

async function runWith(clientOrFactory) {
  return requireAdminWithClient(
    typeof clientOrFactory === "function" ? clientOrFactory : async () => clientOrFactory
  );
}

test("denies access when Supabase client creation throws", async () => {
  const result = await runWith(async () => { throw new Error("missing env"); });
  assert.equal(result.configured, false);
  assert.equal(result.authenticationAvailable, false);
  assert.equal(result.adminCheckAvailable, false);
  assert.equal(result.isAdmin, false);
  assert.equal(result.supabase, null);
});

test("denies access when claims retrieval throws", async () => {
  const result = await runWith(createSupabase({ claimsThrow: new Error("auth unavailable") }));
  assert.equal(result.configured, true);
  assert.equal(result.authenticationAvailable, false);
  assert.equal(result.adminCheckAvailable, false);
  assert.equal(result.isAdmin, false);
});

test("denies access when claims retrieval returns an error", async () => {
  const result = await runWith(createSupabase({ claimsError: new Error("invalid session") }));
  assert.equal(result.authenticationAvailable, false);
  assert.equal(result.adminCheckAvailable, false);
  assert.equal(result.isAdmin, false);
});

test("treats absent claims as an unauthenticated session", async () => {
  const result = await runWith(createSupabase({
    claimsResult: { data: { claims: null }, error: null },
  }));
  assert.equal(result.authenticationAvailable, true);
  assert.equal(result.adminCheckAvailable, false);
  assert.equal(result.user, null);
  assert.equal(result.isAdmin, false);
});

test("denies access when the admin RPC throws", async () => {
  const result = await runWith(createSupabase({ rpcThrow: new Error("RPC unavailable") }));
  assert.equal(result.authenticationAvailable, true);
  assert.equal(result.adminCheckAvailable, false);
  assert.equal(result.isAdmin, false);
  assert.equal(result.user.sub, "user-123");
});

test("denies access when the admin RPC returns an error", async () => {
  const result = await runWith(createSupabase({ rpcError: new Error("permission denied") }));
  assert.equal(result.adminCheckAvailable, false);
  assert.equal(result.isAdmin, false);
});

test("denies a non-admin result", async () => {
  const result = await runWith(createSupabase({ rpcResult: { data: false, error: null } }));
  assert.equal(result.adminCheckAvailable, true);
  assert.equal(result.isAdmin, false);
});

test("denies truthy non-boolean RPC results", async () => {
  const result = await runWith(createSupabase({ rpcResult: { data: "true", error: null } }));
  assert.equal(result.adminCheckAvailable, false);
  assert.equal(result.isAdmin, false);
});

test("denies malformed RPC responses", async () => {
  const result = await runWith(createSupabase({ rpcResult: null }));
  assert.equal(result.adminCheckAvailable, false);
  assert.equal(result.isAdmin, false);
});

test("allows only a successful literal boolean true result", async () => {
  const supabase = createSupabase();
  const result = await runWith(supabase);
  assert.equal(result.configured, true);
  assert.equal(result.authenticationAvailable, true);
  assert.equal(result.adminCheckAvailable, true);
  assert.equal(result.isAdmin, true);
  assert.equal(result.supabase, supabase);
  assert.equal(result.user.sub, "user-123");
});
