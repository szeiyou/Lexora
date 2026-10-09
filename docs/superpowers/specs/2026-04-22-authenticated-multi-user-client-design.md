# Authenticated Multi-User Client Design

Date: 2026-04-22
Status: Approved in chat
Target: Existing CoDict desktop client authentication and session flow
Tech Stack: React, TypeScript, Zustand, TanStack Query, Axios, Tauri Store, Vitest, Testing Library

## 1. Overview

The backend now exposes a multi-user authentication system based on Bearer access tokens plus refresh tokens. The current CoDict client still assumes the older single-user contract:

- every protected request is sent with HTTP Basic auth
- `settings` persists `username` and `password`
- feature pages are enabled when `baseUrl + username + password` exist
- React Query cache keys are scoped by `baseUrl + username`
- connection testing means `GET /api/v1/history` with Basic auth

That client model is now incompatible with the documented v1 API contract. All protected `/api/**` endpoints require Bearer access tokens, authentication has first-class `register/login/refresh/logout/me` endpoints, and user-owned data such as history and wordbooks are isolated per authenticated user.

This design updates the desktop client to:

- authenticate from the existing Settings page rather than adding a separate login page
- persist the refresh token and automatically restore a session on app launch
- keep the access token in memory only
- centralize Bearer token handling and `401 -> refresh -> retry` behavior in the shared HTTP layer
- scope cached user data by authenticated user identity instead of raw credentials
- adapt UI state, tests, and history-time parsing to the new API contract

## 2. Goals

- Align all protected requests with the new Bearer-token API contract.
- Support both registration and login from the existing Settings page.
- Persist login state across app restarts by storing the refresh token.
- Automatically restore a valid session on startup when possible.
- Keep access tokens out of persisted storage.
- Ensure logout, failed refresh, or server-address changes fully clear user-scoped state.
- Prevent user A from seeing cached history, wordbooks, or recent results from user B.
- Update the client to consume ISO-8601 history timestamps instead of Jackson time arrays.

## 3. Non-Goals

- No standalone login route or splash login screen in this pass.
- No multi-account switcher, account list, or remembered-account picker.
- No password reset, email verification, or profile-editing flows.
- No backend API redesign or expansion beyond the documented endpoints.
- No offline auth/session behavior beyond best-effort persisted refresh-token restore.

## 4. Current State Analysis

### 4.1 Settings and connection model

`src/modules/settings/model/settings.schema.ts` currently treats `username` and `password` as required persisted connection settings. `settings-repository.ts` obfuscates and stores the password locally. `SettingsScreen` and `SettingsForm` mix transport settings with account credentials, and `testConnection()` validates connectivity by calling `GET /api/v1/history` with Basic auth.

That model no longer matches the server contract because credentials are not meant to be attached to every request. The only long-lived session artifact should be the refresh token.

### 4.2 Shared HTTP client

`src/shared/api/http-client.ts` currently injects a Basic auth header for both browser and Tauri request paths. Every API module creates a client from `settings.baseUrl`, `settings.requestTimeoutMs`, `settings.username`, and `settings.password`.

Because auth is embedded at the call site, the client has no concept of session state, no central `401` recovery strategy, and no safe place to coordinate refresh token rotation.

### 4.3 Feature gating and cache identity

Feature screens such as `WorkspaceScreen`, `TranslationsScreen`, `HistoryScreen`, and `WordbooksScreen` currently enable queries only when `baseUrl`, `username`, and `password` are present. Several query keys also include `settings.username`.

That is insufficient for the new user model:

- username presence is not equivalent to being authenticated
- refresh-token restore needs to re-enable the app without saved passwords
- cached data must be invalidated when the authenticated user changes or the session expires

### 4.4 History timestamp parsing

`src/modules/history/model/history-types.ts` and `history-time.ts` still model `latestSearchTime` and `searchTimes` as Jackson numeric arrays. The new API document explicitly states these values are now ISO-8601 `LocalDateTime` strings on the wire. The parser and tests need to converge on that new contract.

## 5. Options Considered

### 5.1 Option A: Add a dedicated auth module and keep authentication entry points inside Settings

This separates transport configuration from session state while preserving the existing Settings-page user experience.

Pros:

- clear boundary between connection config and authenticated session
- enables persisted refresh-token restore without persisting passwords
- gives the HTTP layer one authoritative source of access tokens and refresh behavior
- keeps the UI change localized to Settings instead of introducing route-level auth flow

Cons:

- touches multiple modules: settings, shared HTTP, feature gating, tests

### 5.2 Option B: Extend the existing settings store to hold tokens and auth status

This appears smaller at first, but it keeps unrelated responsibilities coupled.

Pros:

- fewer new files in the short term

Cons:

- connection config and session lifecycle stay tangled
- logout and baseUrl-change invalidation become harder to reason about
- settings persistence logic becomes responsible for security-sensitive auth state

### 5.3 Option C: Let each feature API module handle login and refresh independently

Pros:

- no central auth subsystem required

Cons:

- duplicates token logic in every API file
- creates refresh races under concurrent `401` responses
- makes logout and user-cache invalidation brittle

## 6. Chosen Approach

Choose Option A.

The client will introduce a dedicated `auth` domain responsible for:

- login, registration, refresh, logout, and current-user verification
- persisted refresh-token storage
- in-memory access-token lifecycle
- startup session restore
- refresh deduplication for concurrent `401` responses
- exposing a small auth state machine to the rest of the app

The existing Settings page remains the single place where users:

- configure the server base URL and timeout
- register a new account
- log in
- inspect the current authenticated user
- verify the session
- log out

Feature pages will no longer care about saved credentials. They will only run protected queries when:

- settings have been hydrated
- a valid `baseUrl` exists
- auth state is `authenticated`

## 7. Detailed Design

### 7.1 Module boundaries

The design introduces the following responsibility split:

- `settings` module
  - persists connection-level configuration only
  - owns `baseUrl`, `requestTimeoutMs`, and `closeBehavior`
  - clears auth state when `baseUrl` changes
- new `auth` module
  - owns auth API calls and auth persistence
  - stores session state
  - exposes startup restore, login, register, verify, and logout actions
- shared HTTP client
  - injects Bearer access tokens for protected requests
  - coordinates one refresh flow for concurrent unauthorized responses
  - clears auth state on unrecoverable auth failure
- feature modules
  - remain unaware of refresh tokens
  - only consume `settings` and authenticated-session readiness

This keeps auth-specific behavior centralized while minimizing churn inside feature-specific API files.

### 7.2 Auth state model

The auth store will expose a state structure conceptually equivalent to:

- `status: "anonymous" | "restoring" | "authenticated" | "refreshing"`
- `user: { id: number; username: string } | null`
- `accessToken: string | null`
- `refreshToken: string | null`
- `expiresAt: number | null`
- `authMessage: string | null`

Persistence rules:

- persist `refreshToken`
- persist `user`
- do not persist `accessToken`
- do not persist `expiresAt`

Rationale:

- `refreshToken` is the durable session artifact chosen by the user
- `accessToken` is short-lived and should disappear on process exit
- `user` can be shown immediately in Settings once session restore succeeds and is also useful for cache scoping

### 7.3 Startup bootstrap flow

App startup will become a two-stage hydration process:

1. hydrate `settings`
2. if `baseUrl` is missing, stop with auth state `anonymous`
3. if `baseUrl` exists but `refreshToken` is missing, stop with auth state `anonymous`
4. if both exist, move auth state to `restoring` and call `/api/v1/auth/refresh`
5. on success:
   - store new `accessToken`
   - store rotated `refreshToken`
   - compute `expiresAt`
   - store returned `user`
   - move to `authenticated`
6. on failure:
   - clear auth persistence
   - clear user-scoped React Query cache
   - move to `anonymous`
   - surface a recoverable message such as `登录已过期，请重新登录`

This startup restore runs automatically and requires no saved password.

### 7.4 Auth API adapter responsibilities

The auth API layer will own all serialization details for:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Its public contract should be high-level:

- `register(username, password)`
- `login(username, password)`
- `refresh(refreshToken)`
- `logout(refreshToken)`
- `fetchCurrentUser()`

The rest of the app should never construct auth request payloads or headers directly. That prevents auth request-shape drift from leaking into feature modules.

### 7.5 Shared HTTP client behavior

The HTTP client will support both anonymous and authenticated requests.

For authenticated business requests:

- attach `Authorization: Bearer <accessToken>`
- if there is no access token, reject before sending the request unless the endpoint explicitly allows anonymous access

For `401` handling:

- if the request is an auth endpoint that should not auto-refresh, do not recurse
- if no `refreshToken` exists, clear auth state and reject
- if a refresh is already in progress, wait for that single shared promise
- otherwise start one refresh call, rotate tokens, then replay the failed request once
- if refresh fails, clear auth state, clear user-scoped cache, and reject with an auth-expired error

This avoids N parallel requests triggering N refresh calls.

### 7.6 Access-token expiry handling

The server returns `expiresIn` seconds. The auth store will compute `expiresAt = Date.now() + expiresIn * 1000`.

The client will not build a background timer-based renewer in this pass. Instead it will:

- use the current access token until a protected request receives `401`
- treat `401 -> refresh -> retry once` as the single recovery path for token expiry

This keeps the first implementation simpler and still robust because the server remains the source of truth. The mandatory recovery path is the `401 -> refresh -> retry` flow.

### 7.7 Settings persistence changes

`settings` persistence will remove `username` and `password` from the schema and stored shape. It will continue to persist:

- `baseUrl`
- `requestTimeoutMs`
- `closeBehavior`

Compatibility behavior for previously saved settings:

- if older storage still contains `username` and `password`, ignore those fields when loading
- preserve existing timeout-upgrade behavior
- keep password obfuscation helpers out of the active settings path once migration is complete

No complex migration script is required because the new loader can safely drop obsolete fields.

### 7.8 Base URL change semantics

Changing `baseUrl` is equivalent to changing servers. Because refresh tokens are server-specific, the client must not keep the old session alive across a base URL change.

Rules:

- saving a new `baseUrl` clears auth state immediately
- saving a new `baseUrl` clears user-scoped React Query cache immediately
- the Settings page shows `服务地址已变更，请重新登录`
- changing only `requestTimeoutMs` or `closeBehavior` does not log the user out

### 7.9 Settings page UI

The Settings page will render two independent sections.

#### Connection Settings

Fields:

- `服务地址`
- `请求超时 (ms)`
- `关闭行为`

Actions:

- `保存设置`

This section no longer contains username or password fields.

#### Account Session

When `baseUrl` is missing:

- disable auth inputs and actions
- show `请先保存服务地址`

When `baseUrl` exists and auth state is `anonymous`:

- show `用户名`
- show `密码`
- show mode toggle `登录 / 注册`
- in register mode, show `确认密码`
- primary action label matches the selected mode

When auth state is `restoring` or `refreshing`:

- disable auth controls
- show a progress-style status message

When auth state is `authenticated`:

- show `当前用户：{username}`
- show `验证当前会话`
- show `退出登录`
- hide password-entry controls by default

Registration behavior:

- successful registration immediately stores the returned tokens and user
- the client transitions directly to `authenticated`
- no follow-up login step is required

### 7.10 Connection test replacement

The old `测试连接` action should be removed.

Replacement semantics:

- unauthenticated users prove connectivity by completing `登录` or `注册`
- authenticated users can use `验证当前会话`, which calls `/api/v1/auth/me`

This matches the new API model more honestly than issuing a protected history request as a pseudo-connection test.

### 7.11 Feature-page gating

Protected pages will switch from credential presence checks to session-state checks.

Current pattern:

- `Boolean(settings.baseUrl && settings.username && settings.password)`

New pattern:

- `Boolean(settings.baseUrl && auth.status === "authenticated" && auth.user)`

User-facing empty states should also become more explicit:

- if settings are not ready: `正在加载设置`
- if no `baseUrl`: `请先完成设置`
- if `baseUrl` exists but user is not authenticated: `请先完成设置并登录`

This affects:

- query workspace
- translations page
- history page
- wordbooks page
- recent-search helpers
- audio fetching

### 7.12 Query-cache identity and invalidation

React Query keys that currently include `settings.username` will instead include stable authenticated identity:

- `settings.baseUrl`
- `auth.user.id`

Preferred pattern:

- `["history", settings.baseUrl, auth.user.id, page]`
- `["wordbooks", settings.baseUrl, auth.user.id]`
- `["recent-searches", settings.baseUrl, auth.user.id]`

Invalidation rules:

- after login/register/restore success, protected queries may run normally
- after logout or refresh failure, clear the full query cache for protected resources
- after baseUrl change, clear the full query cache for protected resources

This guarantees user B never sees user A's cached data.

### 7.13 Logout behavior

Logout will:

1. call the auth API adapter to revoke the currently persisted refresh token
2. clear auth store regardless of whether revocation succeeds
3. clear user-scoped query cache
4. return the UI to the anonymous state

This is intentionally tolerant of partial server-side session expiry. Local logout must still succeed even if the server already considers the token invalid.

### 7.14 Error handling

Settings/auth feedback will use these semantics:

- `401` or `403` from login: `认证失败，请检查用户名和密码`
- `400` from registration: prefer the backend `message`
- `404`: `连接失败，请确认服务地址是否正确（通常需要包含 :8080）`
- timeout: `请求超时，请稍后重试`
- refresh or startup restore failure: `登录已过期，请重新登录`
- failed `/auth/me`: `当前会话验证失败`

Business pages should not expose raw `401` failures when the session is gone. Once refresh is exhausted, the app should drop back to the unauthenticated UI state and ask the user to log in again.

### 7.15 History timestamp contract update

History models will change from Jackson arrays to ISO strings.

Required updates:

- `HistorySummaryItem.latestSearchTime?: string`
- `HistorySummaryItem.searchTimes?: string[]`
- any formatter accepts a string input and renders a user-friendly display
- existing restore logic keeps using `historyKey` as the stable identity

The client no longer needs Jackson-array compatibility in active code paths for this API version.

## 8. Testing Strategy

### 8.1 New auth-focused tests

Add focused tests for:

- login success stores access token, rotated refresh token, and user
- register success immediately authenticates the user
- startup restore uses persisted refresh token and authenticates without a password
- logout clears auth state and query cache
- multiple concurrent `401` responses trigger exactly one refresh call
- refresh failure clears auth state and prevents repeated retry loops

### 8.2 Updated settings tests

Update Settings-screen tests to cover:

- rendering separate `连接设置` and `账号会话` sections
- unauthenticated login flow
- register flow with password confirmation
- authenticated display of the current user
- session verification via `/auth/me`
- baseUrl change clearing the session and prompting re-login

### 8.3 Updated feature tests

Update screen tests for:

- feature enablement based on authenticated session rather than saved credentials
- query keys including `user.id` instead of `username`
- cached data disappearing after logout or auth-expiry reset

### 8.4 Updated history tests

Convert history-model and history-restore tests to ISO-string timestamps and remove Jackson-array assumptions from active expectations.

### 8.5 Manual verification

Manual development verification against the local backend at `http://127.0.0.1:8080` should cover:

- register a new user
- log out and log back in
- restart the app and confirm automatic restore
- query entries
- run a text translation
- open history detail
- create, rename, and delete a wordbook
- trigger logout and confirm protected pages fall back to the unauthenticated state

## 9. Implementation Boundaries

This design intentionally includes:

- new auth domain files
- shared HTTP-client auth refactor
- Settings-page auth UI
- feature gating updates
- history timestamp contract updates
- test updates required to keep the contract honest

This design intentionally excludes:

- route guards or modal auth flows
- multiple remembered accounts
- broader visual redesign beyond what is needed for the new Settings-page sections

## 10. Risks and Mitigations

### 10.1 Concurrent refresh races

Risk:

- multiple requests can fail at once and stampede `/auth/refresh`

Mitigation:

- shared in-flight refresh promise owned by the auth-aware HTTP layer

### 10.2 Cross-user cached data leakage

Risk:

- switching users on the same machine can leave old query data visible

Mitigation:

- scope keys by `user.id`
- clear protected caches on logout, refresh failure, and baseUrl change

### 10.3 Persisted-storage drift

Risk:

- older settings storage still includes obsolete username/password fields

Mitigation:

- loader ignores unknown legacy fields and only hydrates the new schema

### 10.4 Partial auth failures creating confusing UI

Risk:

- user sees feature-specific failures instead of a clear login requirement

Mitigation:

- central auth-expired handling drops the app back to unauthenticated state
- protected pages show explicit `请先完成设置并登录`
