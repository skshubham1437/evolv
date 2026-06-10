# ADR-0008: Cookie-Based Authentication

**Date**: 2026-06-10  
**Status**: Accepted  
**Deciders**: Engineering

---

## Context

The original implementation stored the JWT in `localStorage` and sent it as a `Bearer` token in the `Authorization` header. This has a critical security flaw: any JavaScript running on the page (including XSS payloads) can read `localStorage` and steal the token, enabling full account takeover.

The premortem (June 2026) classified this as a **Critical** vulnerability.

## Decision

Switch to **httpOnly session cookies** for all authentication.

### How it works

1. On successful login or register, the server calls `setSessionCookie()` which sets:
   ```
   Set-Cookie: evolv_session=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; MaxAge=259200
   ```
2. The browser sends this cookie automatically on every same-origin request.
3. The JWT middleware reads the cookie first, falls back to `Authorization: Bearer` header for API clients during migration.
4. The client uses `credentials: 'include'` on every `fetch()` call.
5. `POST /api/auth/logout` clears the cookie server-side (sets MaxAge=-1).
6. The `token` field is never exposed in the JavaScript context.

### Security properties

| Concern | localStorage (old) | httpOnly Cookie (new) |
|---------|-------------------|----------------------|
| XSS token theft | ✅ Vulnerable | ❌ Immune |
| CSRF | ❌ Immune (header-based) | ✅ Mitigated by SameSite=Lax |
| Token exposure in JS | Readable | Not readable |
| Token in server logs | Possible (URL params) | No |
| Logout clears server state | No (client-only) | Yes |

### SameSite=Lax vs Strict

We chose `Lax` (not `Strict`) to allow top-level navigation from external links (e.g. email links) to land on the app without requiring re-login. `Strict` would require re-auth after clicking any external link to Evolv.

### Secure flag

`Secure` is set only when `APP_ENV=production`. In local development over HTTP, the flag is omitted so the browser accepts the cookie on `localhost`.

## Consequences

- **Positive**: XSS attacks can no longer steal authentication credentials.
- **Positive**: Logout properly invalidates the session across browser tabs.
- **Positive**: No token in JavaScript memory, response bodies, or browser dev tools storage tab.
- **Negative**: CSRF attacks become theoretically possible. Mitigated by `SameSite=Lax`. Full CSRF token implementation deferred to a future ADR.
- **Negative**: Mobile apps (React Native) cannot use httpOnly cookies natively. They must use the `Authorization: Bearer` header fallback, which will remain supported.
- **Migration**: Existing localStorage tokens are automatically cleared on the next `GET /api/me` call (line 35 in AuthContext.tsx).
