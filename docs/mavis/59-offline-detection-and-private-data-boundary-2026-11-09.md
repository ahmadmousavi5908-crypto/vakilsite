# MAVIS Offline Detection and Local-First State Contract — 2026-11-09

**Status:** Implementation contract for the public offline knowledge assistant. Private client records remain online-only in the first release.

## 1. The important distinction

MAVIS must track three independent states. A single `navigator.onLine` boolean is not enough: a device can be connected to Wi-Fi while DNS, the internet, or the MAVIS server is unavailable.

| State | Detection | User-facing meaning |
|---|---|---|
| Device network | browser `online` / `offline` event and `navigator.onLine` | the browser believes a network interface exists |
| MAVIS service reachability | uncached same-origin `GET /api/mavis/connectivity`, 1.8-second timeout | the deployed MAVIS origin responds |
| Offline knowledge readiness | current service-worker activation after its atomic precache succeeds | the offline app shell and public corpus are cached |

Do not conflate "server unavailable" with "device offline". Both may use local public search, but the explanation should be accurate.

## 2. Fast state machine

1. On page boot, inspect `navigator.onLine`. If false, immediately show local/offline status; do not wait for a network timeout.
2. If true, show a brief checking state and call the no-store same-origin connectivity endpoint.
3. If the endpoint returns the expected `{status: "ok"}` response, show "MAVIS service reachable".
4. If the endpoint fails, times out, or returns an unexpected payload, show "MAVIS service unavailable; local search remains available". Do not claim the device itself is offline.
5. On `offline`, immediately update state and invalidate any older in-flight probe.
6. On `online`, run a fresh probe. Ignore stale responses from earlier probes.
7. Show the offline-search-ready state only after the service worker for the current page has completed installation/activation. The worker's `cache.addAll` must succeed before activation.
8. Keep network state and offline-cache state in separate UI labels. An online service does not mean private case data is cached; a cached public bundle does not mean the server is reachable.

## 3. Privacy and security boundaries

- The connectivity endpoint is a no-auth, no-store, constant-shape health response. It returns no user, IP, project, database, provider, or secret details.
- Probe requests use same-origin and omit credentials; the response must not be cached by browser, CDN, or service worker.
- The public offline service worker scope stays limited to `/mavis-offline/`. It must not intercept or cache `/api/`, authenticated routes, admin pages, uploads, cookies, or private client records.
- Only explicitly enumerated static public assets and the public legal knowledge bundle may be precached.
- Never persist query text, intake data, credentials, tokens, client names, case references, or private documents in Cache API, IndexedDB, localStorage, or sessionStorage.
- Do not infer a secure login from an offline indicator, local PIN, tracking code, or cached page.

## 4. Client portal while offline

First release behavior:
- Public offline legal knowledge remains searchable.
- Client portal displays a clear offline state and disables new login, case updates, message sending, uploads, payment actions, and any action that changes server state.
- No private case data is cached. Previously authenticated client status is not proof of a current valid session when offline.
- A local offline page may display public contact instructions and cached public resources only.
- Once connectivity returns, the client must revalidate the server session before private data is displayed.

Possible later phase, only after a separate threat model and explicit client opt-in:
- encrypt a narrowly scoped offline document package with a per-device key;
- require OS-backed device authentication to unlock;
- use an expiry/lease and revalidate revocation on reconnection;
- display the last-sync timestamp and stale-data warning;
- provide remote device revocation and local cache wipe on next successful sync.
This is not a first-release feature because a disconnected device cannot learn that a session or case permission was revoked.

## 5. Acceptance matrix

| Scenario | Expected |
|---|---|
| Device reports offline | immediate offline status; local search works |
| Wi-Fi connected, internet blocked | probe fails quickly; say service unavailable, not definitely device offline |
| Internet works, MAVIS origin down | same local-search fallback; server unavailable status |
| Server responds | service reachable; local search remains local |
| Connectivity probe timeout | fail closed for online operations; do not block local search |
| Older probe returns after a newer one | stale response ignored |
| Offline bundle not fully cached | never claim offline-ready |
| Service worker update fails | keep previous working cache if available; report update/cache failure |
| Client portal opened offline | no private data, no authenticated action, clear reconnect prompt |
| Reconnection | fresh server session validation before private matter data |

## 6. Current implementation note

The public offline app now separates browser network hints from actual MAVIS-origin reachability by calling an uncached health endpoint with a short timeout. Local search remains independent of the probe. Automated source-contract tests cover this behavior; a real airplane-mode/device test is still required.

## 7. Research references

- MDN Service Worker API and offline caching: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN Using Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- MDN client-side storage: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Client-side_storage
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Supabase security checklist: https://supabase.com/docs/guides/security/product-security
