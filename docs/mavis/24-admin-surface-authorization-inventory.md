# MAVIS Admin Surface — Source-Level Authorization Inventory

**Date:** 2026-11-14
**Branch under review:** `feature/mavis-cms-inventory-preview-20261114`
**Baseline:** Current `main` plus the read-only article catalog branch.
**Method:** Read-only inspection of tracked source files. No runtime requests, database calls, or production changes were made.

## 1. Admin UI routes

### `/admin/mavis/articles` (new preview route)

- Calls `requireAdmin()` inside the Server Component.
- Redirects on thrown authorization errors, missing configuration, unavailable authentication/admin check, signed-out state, and non-admin result.
- Supplies the static article dataset to a read-only client catalog.
- No database write or external-source ingestion action is present in the inspected page.
- This is the correct direction for the preview. The route still needs CI/build validation on its latest commit.

### `/admin/mavis`

- Calls `requireAdmin()` before rendering the knowledge workspace.
- Current main destructures `authenticationAvailable` and `adminCheckAvailable`, but the main-branch helper inspected in this audit does not return those properties. The conditions therefore do not distinguish those failure states on main.
- The CMS preview branch carries the separate helper fix that returns these states and fails closed on thrown Auth/RPC errors.
- This discrepancy is one reason the helper change must be reviewed and tested as part of the same integration, not cherry-picked casually.

### `/admin/layout.js`

- Sets noindex metadata but does not enforce authorization itself.
- This is acceptable only if every protected page and every mutation/API entry point performs its own server-side authorization. Layout hiding is not an access-control boundary.

## 2. Server Actions

### `src/app/admin/actions.js`

- `saveOfficeLocation` calls `requireAdmin()` and redirects unless `isAdmin` is true.
- `saveSocialLinks` calls `requireAdmin()` and redirects unless `isAdmin` is true.
- `signOut` calls `requireAdmin()` but does not require `isAdmin`; it only signs out the current session. This is not an elevation path, though the helper should handle an unavailable client cleanly.
- The data mutations also rely on database RLS policies. That second layer must remain in place.
- `saveSocialLinks` accepts serialized client data, validates broad shape and fields, then upserts/deletes rows. Malformed individual entries may still throw before a friendly redirect; this is a robustness issue, not evidence of privilege escalation in the inspected code.

### `src/app/admin/login/actions.js`

- Uses the server Supabase client, password sign-in, then calls `is_site_admin()`.
- Non-admin users are signed out and redirected.
- The RPC is not wrapped in a try/catch. A thrown RPC error should fail closed at the application level but may produce an unhandled server error. Harden this for consistent behavior and observability.
- Rate limiting should be confirmed at the Auth/provider configuration layer; no custom login throttling was identified in this action.

### `src/app/admin/logout/route.js`

- POST route signs out the current session and redirects to login.
- It does not grant data access or modify privileged records. A cross-site logout request is a nuisance/availability concern, not an admin privilege escalation. Consider an origin check for consistency with other state-changing endpoints.

## 3. API routes

### `/api/admin/mavis/search-console`

- Uses `createSearchConsoleHandler` with `requireAdmin`, JSON content-type validation, origin validation, and rate-limit parsing.
- The actual handler implementation must continue to enforce authorization before calling the external Search Console client.

### `/api/mavis/knowledge-search`

- Uses `createKnowledgeSearchHandler` with `requireAdmin`, JSON content-type validation, origin validation, and rate-limit parsing.
- A database-backed atomic rate limiter is present in the checked-in migration 005 and must be verified with its pgTAP suite against the deployed database.

### Public data APIs

- `/api/social-links` and `/api/office-location` are intentionally public-read endpoints. Their backing table RLS and response shaping must be reviewed separately before changing their policies.
- Do not broaden these routes or reuse them for private CMS data.

## 4. Prioritized follow-up

| Priority | Work | Why |
|---|---|---|
| P0 | Verify deployed `profiles` ACL, RLS, `is_site_admin()` owner and EXECUTE ACL | Source migrations cannot prove live database state |
| P0 | Add direct tests for `requireAdmin()` returned errors and thrown errors | This helper gates every protected admin surface |
| P0 | Verify every CMS transition through server and database authorization | Prevent direct status/approval spoofing |
| P1 | Catch thrown `is_site_admin()` RPC errors in login action | Consistent fail-closed behavior and clearer operational errors |
| P1 | Audit `createSearchConsoleHandler` and `createKnowledgeSearchHandler` negative paths | Ensure auth precedes external/data work |
| P1 | Validate malformed social-link entries without uncaught exceptions | Robustness under hostile input |
| P2 | Consider origin protection on logout POST | Consistency; logout is not a privileged data mutation |

## 5. Test requirements for the helper

Use a dependency-injected unit test or a narrow mock around the Supabase client factory. Cover:

1. Client factory throws.
2. `getClaims()` throws.
3. `getClaims()` returns an error.
4. Claims are absent.
5. Admin RPC throws.
6. Admin RPC returns an error.
7. Admin RPC returns false.
8. Admin RPC returns a non-boolean truthy value.
9. Admin RPC returns exactly true.
10. Returned state flags are internally consistent for every case.

The only successful administrator state is: configured client, valid claims with a subject, successful admin RPC, and the literal boolean `true`.

## 6. Conclusion

The source review shows multiple server-side authorization checks, but it does not establish production database safety. The immediate blocker is live verification of the deployed role table/function grants and direct tests for the helper's fail-closed contract. Keep the CMS preview read-only until those gates are met.
