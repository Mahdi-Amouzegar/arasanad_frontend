# Account Kit — portable authentication & account library

`@/lib/account` is the **single public entry point** for everything related
to signing in, sessions, capabilities, roles, authorization and account data.
Every screen, component and helper in this project imports from here and from
nowhere else. No duplicate `if (!user)` checks, no second token store, no
scattered capability flags.

The folder is deliberately self-contained. `core/` is pure ESM with **zero
imports**, so the whole directory can be copied into another project.

---

## 1. Layout

| Path | Responsibility | Framework dependency |
| --- | --- | --- |
| `core/capabilities.mjs` | capability table, `checkAccess`, named-section rules | none |
| `core/providers.mjs` | extensible login-provider registry | none |
| `core/session.mjs` | observable token store + cross-tab sync | none (browser globals injected) |
| `core/otp-format.mjs` | one-time-code normalization/validation | none |
| `core/otp-qr.mjs` | QR login URL build/read, fragment cleanup, countdown | none |
| `core/index.mjs` | framework-free ESM barrel | none |
| `api/config.ts` | the ONE configuration point, injected transport | none |
| `api/client.ts` | typed account endpoints + stable free functions | none |
| `react/AuthProvider.tsx` | React context, `useAuth()`, session state | React only |
| `react/guards.tsx` | `useAccess`, `RequireAuth`, `RequireCapability`, `RequireRole`, `RequireSection` | React only |
| `index.ts` | public API surface, re-exports every section | — |

`src/components/system/AccountProvider.tsx` is **outside** the kit on
purpose: it is the only file that knows this project's API client, error
class, avatar pipeline and device-id helpers. It injects them once via
`configureAccountKit()` and renders `<AccountAuthProvider>`.

---

## 2. Using it in this project

```tsx
import { useAuth, useAccess, RequireCapability } from '@/lib/account';

function Toolbar() {
  const { user, loading, signOut } = useAuth();
  const { isSignedIn, can, canAccessSection } = useAccess();

  if (loading) return <span>...</span>;
  if (!isSignedIn) return <a href="/login/">Sign in</a>;

  return (
    <>
      <span>{user?.displayName}</span>
      {can('editProfile') ? <button>Edit profile</button> : null}
      {canAccessSection('admin') ? <a href="/admin/projects/">Admin</a> : null}
      <RequireCapability capability="issueOtpCode" fallback={<p>Guest session</p>}>
        <button>Create one-time code</button>
      </RequireCapability>
      <button onClick={() => void signOut()}>Sign out</button>
    </>
  );
}
```

Authenticated API calls use the token-bound helper; the kit reads the token
from its own store, so no component ever touches `localStorage`:

```ts
const { authedRequest } = useAuth();
const projects = await authedRequest<{ projects: Project[] }>('/projects');
```

Login flows use the stable free functions:

```ts
import {
  startBotLogin, checkBotStatus, loginWithOtpCode,
  createOtpCode, listOtpCodes, revokeOtpCode,
  buildOtpLoginUrl, readOtpCodeFromHash, stripHash,
} from '@/lib/account';
```

---

## 3. Porting to another project

1. Copy the whole `src/lib/account/` folder.
2. At startup, call `configureAccountKit()` once:

```ts
import { configureAccountKit } from './account';

configureAccountKit({
  // Any function with this signature; wire it to your own fetch wrapper.
  request: async (path, options) => myApiClient(path, options),
  device: () => ({ deviceId: myDeviceId(), deviceName: myDeviceName() }),
  // Optional: normalize the user shape returned by your server.
  normalizeUser: (user) => user,
  // Optional: your own error class for a missing token.
  createUnauthorizedError: () => new MyApiError('UNAUTHORIZED', 401),
  // Optional: override any endpoint path.
  endpoints: { me: '/v2/account/me' },
});
```

3. Wrap the app: `<AccountAuthProvider>{children}</AccountAuthProvider>`.
   When the singleton is configured, the `config` prop can be omitted.
4. Nothing else changes. `core/` also runs directly under `node:test`, with
   no bundler, no jsdom and no additional packages.

`configureAccountKit` accepts partial overrides; all omitted fields have
safe defaults (`DEFAULT_ENDPOINTS`, identity user normalization, structural
HTTP-401 detection, `localStorage` with an in-memory fallback).

---

## 4. Adding a future login provider (Google, Apple, magic link, ...)

The registry is declarative. Nothing in the existing login screens has to
change; adding a provider is one registration plus one server endpoint.

```ts
import { registerAuthProvider, PROVIDER_KIND, listAuthProviders } from '@/lib/account';

registerAuthProvider({
  id: 'google',
  kind: PROVIDER_KIND.OAUTH,
  label: 'Sign in with Google',
  description: 'OAuth 2.0 / OIDC',
  authMethod: 'google',
  trusted: true,
  priority: 50,
  enabled: true,
});

// The login chooser can render providers generically:
const providers = listAuthProviders(); // sorted by priority, enabled only
```

`GOOGLE_PROVIDER_TEMPLATE` is exported as a **disabled** reference template.
It does not pretend to work: a real integration also needs a server route,
ID-token verification, an `auth_identities` row and a session row. The
server must always decide capabilities from the real session, never from
the client-side `trusted` flag.

---

## 5. Authorization model

One rule engine, `checkAccess(state, rule)`, powers hooks, guards and section
checks. Rules are AND-combined:

| Field | Meaning |
| --- | --- |
| `signedIn` | require a signed-in account (default when omitted) |
| `capabilities` | require **all** listed capabilities |
| `anyCapabilities` | require **at least one** |
| `roles` | require one of these roles |
| `profileComplete` | require a completed profile |

`SECTION_RULES` assigns rules to named sections (`panel`, `admin`,
`account.otp.issue`, `panel.projects.create`, ...). `defineSectionRules()`
returns an extended rule map for apps with extra sections. Unknown section
names are **denied** by default.

Capability defaults are **fail closed**: `GUEST_CAPABILITIES` grants nothing.
The React provider keeps guest capabilities until `/auth/me` answers, so a
sensitive button can never appear early.

> **Security boundary:** all client-side checks only improve the UI. The
> server re-checks authentication, capability, role and ownership on every
> request. A one-time-code (`otp`) session is a guest session: it cannot
> issue new codes, edit the profile or revoke sessions.

---

## 6. One-time codes and QR

- Codes are 12 characters from an unambiguous alphabet; normalization lives
  in `core/otp-format.mjs`.
- `buildOtpLoginUrl()` places the code in the URL **fragment** (`#code=...`),
  never in the query string, so it never reaches server logs or Referer.
- `readOtpCodeFromHash()` / `stripHash()` let the login page consume the code
  and immediately remove it from browser history.
- Raw codes are returned exactly once by the server and are never stored by
  the kit. The list endpoint only returns a hint and a status.
- Server-side hashing and atomic consumption remain the real protection.

---

## 7. Testing

Pure modules are importable directly:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  capabilitiesFor, checkAccess, canAccessSection, createTokenStore,
  createMemoryStorage, formatOtpInput, buildOtpLoginUrl,
} from '../src/lib/account/core/index.mjs';
```

`resetAccountKitForTests()` and `resetAuthProvidersForTests()` reset the
module-level singletons. `createTokenStore({ storage: createMemoryStorage(),
windowImpl: null })` gives a deterministic, browser-free session store.
