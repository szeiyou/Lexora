# Authenticated Multi-User Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old Basic-auth credential flow with a persisted refresh-token session model that supports register/login/logout/restore from Settings, scopes cached data by authenticated user identity, and updates history parsing to the new ISO timestamp contract.

**Architecture:** Add a dedicated `auth` module for persistence, auth API calls, and session state; refactor the shared HTTP client to inject Bearer tokens and coordinate one `401 -> refresh -> retry once` flow; then update settings, protected screens, and wordbook/history helpers to key off `baseUrl + user.id` rather than saved credentials. Keep the existing Settings route as the only entry point for connection config and account session actions.

**Tech Stack:** React 19, TypeScript, Zustand, TanStack Query, Axios, Tauri Store, Vitest, Testing Library, MSW

---

## File Structure

### Files to create
- `src/modules/auth/model/auth.types.ts` — shared auth types for user identity, token envelope, and store status
- `src/modules/auth/api/auth-session-repository.ts` — persisted refresh-token and user storage for web + Tauri
- `src/modules/auth/api/auth-session-repository.test.ts` — unit coverage for auth persistence
- `src/modules/auth/api/auth-client.ts` — register/login/refresh/logout/me request adapter
- `src/modules/auth/api/auth-client.test.ts` — request/response contract tests for auth API helpers
- `src/modules/auth/model/auth.store.ts` — Zustand auth session state machine
- `src/modules/auth/model/auth.store.test.ts` — auth store restore/login/logout/verify tests
- `src/modules/auth/api/authenticated-http-client.ts` — helper that wires the shared HTTP client to auth-store callbacks
- `src/modules/auth/ui/auth-session-card.tsx` — account-session card rendered on the Settings screen

### Files to modify
- `src/shared/api/http-client.ts` — remove Basic auth, add optional Bearer auth controller and single refresh retry
- `src/shared/api/http-client.test.ts` — update transport tests and add refresh-dedup coverage
- `src/shared/api/query-client.ts` — export a singleton app query client and cache-reset helper
- `src/app/providers/app-providers.tsx` — use the shared singleton query client
- `src/app/app.tsx` — bootstrap settings hydration + session restore once at app start
- `src/modules/settings/model/settings.schema.ts` — remove username/password from persisted settings
- `src/modules/settings/api/settings-repository.ts` — load/save only connection config, ignore legacy username/password fields
- `src/modules/settings/api/settings-repository.test.ts` — keep timeout migration coverage and add legacy-field ignore coverage
- `src/modules/settings/model/settings.store.ts` — keep only connection config state
- `src/modules/settings/ui/settings-form.tsx` — render connection settings only
- `src/modules/settings/screens/settings-screen.tsx` — render connection card plus auth-session card, clear session on baseUrl change
- `src/modules/settings/ui/settings-screen.test.tsx` — integration tests for login/register/verify/logout/baseUrl-change flows
- `src/modules/query/api/fetch-entry.ts` — switch to authenticated HTTP helper
- `src/modules/query/api/refresh-entry.ts` — switch to authenticated HTTP helper
- `src/modules/translations/api/fetch-text-translation.ts` — switch to authenticated HTTP helper
- `src/modules/history/api/fetch-history-page.ts` — switch to authenticated HTTP helper
- `src/modules/history/api/fetch-history-detail.ts` — switch to authenticated HTTP helper
- `src/modules/audio/api/fetch-audio.ts` — switch to authenticated HTTP helper
- `src/modules/wordbooks/api/fetch-wordbooks.ts` — switch to authenticated HTTP helper
- `src/modules/wordbooks/api/fetch-wordbook-words.ts` — switch to authenticated HTTP helper
- `src/modules/wordbooks/api/find-containing-wordbooks.ts` — switch to authenticated HTTP helper
- `src/modules/wordbooks/api/mutate-wordbooks.ts` — switch to authenticated HTTP helper
- `src/modules/wordbooks/api/mutate-wordbook-words.ts` — switch to authenticated HTTP helper
- `src/modules/recent-searches/api/fetch-recent-searches.ts` — key recent searches by `user.id`
- `src/modules/translations/api/fetch-recent-translation-history.ts` — key translation history by `user.id`
- `src/modules/query/screens/workspace-screen.tsx` — gate queries on authenticated session and new query keys
- `src/modules/translations/screens/translations-screen.tsx` — gate queries on authenticated session and new query keys
- `src/modules/history/screens/history-screen.tsx` — gate queries on authenticated session and new query keys
- `src/modules/wordbooks/ui/wordbooks-screen.tsx` — gate queries on authenticated session and new query keys
- `src/modules/wordbooks/ui/add-to-wordbook-dialog.tsx` — gate wordbook lookups on authenticated session and new query keys
- `src/modules/query/ui/workspace-screen.test.tsx` — auth-aware query gating and refreshed Bearer behavior
- `src/modules/translations/ui/translations-screen.test.tsx` — auth-aware translation gating and ISO history payloads
- `src/modules/history/ui/history-screen.test.tsx` — auth-aware history open flow and ISO history payloads
- `src/modules/wordbooks/ui/wordbooks-screen.test.tsx` — auth-aware wordbook loading and mutation flows
- `src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx` — auth-aware wordbook dialog flows
- `src/modules/history/model/history-types.ts` — replace Jackson array timestamps with ISO strings
- `src/modules/history/model/history-time.ts` — format ISO local-date-time strings without timezone drift
- `src/modules/history/model/history-restore.test.ts` — ISO timestamp fixtures
- `src/modules/history/ui/history-list.test.tsx` — ISO timestamp fixture update
- `src/modules/settings/ui/settings-screen.test.tsx` — remove Basic auth assumptions
- `README.md` — document Settings-page auth flow and session restore behavior

### Files to delete
- `src/modules/settings/api/test-connection.ts` — obsolete after auth-session card replaces connection testing
- `src/modules/settings/model/settings.obfuscation.ts` — obsolete when passwords are no longer persisted
- `src/modules/settings/model/settings.obfuscation.test.ts` — obsolete with password obfuscation removal

## Task 1: Create auth types and persisted session storage

**Files:**
- Create: `src/modules/auth/model/auth.types.ts`
- Create: `src/modules/auth/api/auth-session-repository.ts`
- Test: `src/modules/auth/api/auth-session-repository.test.ts`

- [ ] **Step 1: Write the failing persistence test**

```ts
import { beforeEach, expect, it } from "vitest";
import {
  clearPersistedAuthSession,
  loadPersistedAuthSession,
  savePersistedAuthSession,
} from "./auth-session-repository";

const WEB_STORAGE_KEY = "codict.auth";

beforeEach(() => {
  localStorage.clear();
});

it("round-trips the persisted refresh token and user", async () => {
  await savePersistedAuthSession({
    refreshToken: "refresh-token-1",
    user: {
      id: 7,
      username: "alice",
    },
  });

  await expect(loadPersistedAuthSession()).resolves.toEqual({
    refreshToken: "refresh-token-1",
    user: {
      id: 7,
      username: "alice",
    },
  });
});

it("clears the persisted auth session", async () => {
  localStorage.setItem(
    WEB_STORAGE_KEY,
    JSON.stringify({
      refreshToken: "refresh-token-2",
      user: { id: 8, username: "bob" },
    }),
  );

  await clearPersistedAuthSession();

  expect(localStorage.getItem(WEB_STORAGE_KEY)).toBeNull();
  await expect(loadPersistedAuthSession()).resolves.toBeNull();
});

it("ignores malformed auth payloads", async () => {
  localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify({ refreshToken: 123 }));

  await expect(loadPersistedAuthSession()).resolves.toBeNull();
});
```

- [ ] **Step 2: Run the persistence test to verify it fails**

Run: `npm run test -- src/modules/auth/api/auth-session-repository.test.ts`

Expected: FAIL with `Failed to load url ./auth-session-repository` or missing export errors because the new auth persistence module does not exist yet.

- [ ] **Step 3: Implement the auth types and persistence module**

```ts
// src/modules/auth/model/auth.types.ts
export type AuthUser = {
  id: number;
  username: string;
};

export type PersistedAuthSession = {
  refreshToken: string;
  user: AuthUser;
};

export type AuthTokenEnvelope = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
};

export type AuthStatus = "anonymous" | "restoring" | "authenticated" | "refreshing";
```

```ts
// src/modules/auth/api/auth-session-repository.ts
import { z } from "zod";
import type { PersistedAuthSession } from "@/modules/auth/model/auth.types";

const STORE_FILE = "codict.auth.json";
const STORE_KEY = "auth";
const WEB_STORAGE_KEY = "codict.auth";

const persistedAuthSessionSchema = z.object({
  refreshToken: z.string().min(1),
  user: z.object({
    id: z.number().int(),
    username: z.string().min(1),
  }),
});

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function readFromTauriStore(): Promise<unknown> {
  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(STORE_FILE);
  return (await store.get(STORE_KEY)) ?? null;
}

async function writeToTauriStore(value: PersistedAuthSession | null) {
  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(STORE_FILE);
  if (value) {
    await store.set(STORE_KEY, value);
  } else {
    await store.delete(STORE_KEY);
  }
  await store.save();
}

function readFromWebStorage(): unknown {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(WEB_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function writeToWebStorage(value: PersistedAuthSession | null) {
  if (typeof localStorage === "undefined") {
    return;
  }

  if (value) {
    localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(value));
    return;
  }

  localStorage.removeItem(WEB_STORAGE_KEY);
}

export async function loadPersistedAuthSession(): Promise<PersistedAuthSession | null> {
  try {
    const raw = isTauriRuntime() ? await readFromTauriStore() : readFromWebStorage();
    const parsed = persistedAuthSessionSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function savePersistedAuthSession(value: PersistedAuthSession): Promise<void> {
  if (isTauriRuntime()) {
    await writeToTauriStore(value);
    return;
  }

  writeToWebStorage(value);
}

export async function clearPersistedAuthSession(): Promise<void> {
  if (isTauriRuntime()) {
    await writeToTauriStore(null);
    return;
  }

  writeToWebStorage(null);
}
```

- [ ] **Step 4: Run the persistence test to verify it passes**

Run: `npm run test -- src/modules/auth/api/auth-session-repository.test.ts`

Expected: PASS with 3 passing tests covering round-trip, clear, and malformed payload behavior.

- [ ] **Step 5: Commit the auth persistence foundation**

```bash
git add src/modules/auth/model/auth.types.ts src/modules/auth/api/auth-session-repository.ts src/modules/auth/api/auth-session-repository.test.ts
git commit -m "feat: add auth session persistence"
```

## Task 2: Refactor the shared query client and HTTP client for Bearer auth

**Files:**
- Modify: `src/shared/api/query-client.ts`
- Modify: `src/shared/api/http-client.ts`
- Test: `src/shared/api/http-client.test.ts`

- [ ] **Step 1: Write failing HTTP client tests for Bearer auth and single refresh**

```ts
import { afterEach, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { server } from "@/test/msw/server";
import { createHttpClient } from "@/shared/api/http-client";

afterEach(() => {
  vi.restoreAllMocks();
});

it("adds a Bearer token for authenticated browser requests", async () => {
  server.use(
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      expect(request.headers.get("authorization")).toBe("Bearer access-token-1");
      return HttpResponse.json({ content: [] });
    }),
  );

  const client = createHttpClient(
    { baseUrl: "http://localhost:8080", requestTimeoutMs: 5000 },
    {
      auth: {
        requiresAuth: true,
        retryOnAuthFailure: true,
        getAccessToken: () => "access-token-1",
        refreshAccessToken: vi.fn(),
        clearSession: vi.fn(),
      },
    },
  );

  await expect(client.get("/api/v1/history")).resolves.toMatchObject({ status: 200 });
});

it("refreshes once and retries concurrent 401 requests with the new Bearer token", async () => {
  let currentToken = "stale-token";
  const refreshAccessToken = vi.fn(async () => {
    currentToken = "fresh-token";
    return currentToken;
  });

  server.use(
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      if (request.headers.get("authorization") === "Bearer stale-token") {
        return HttpResponse.json({ message: "expired" }, { status: 401 });
      }

      expect(request.headers.get("authorization")).toBe("Bearer fresh-token");
      return HttpResponse.json({ content: [] });
    }),
  );

  const client = createHttpClient(
    { baseUrl: "http://localhost:8080", requestTimeoutMs: 5000 },
    {
      auth: {
        requiresAuth: true,
        retryOnAuthFailure: true,
        getAccessToken: () => currentToken,
        refreshAccessToken,
        clearSession: vi.fn(),
      },
    },
  );

  await Promise.all([client.get("/api/v1/history"), client.get("/api/v1/history")]);
  expect(refreshAccessToken).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the HTTP client test to verify it fails**

Run: `npm run test -- src/shared/api/http-client.test.ts`

Expected: FAIL because `createHttpClient` still requires Basic-auth credentials and has no `auth.requiresAuth`, `getAccessToken`, or `refreshAccessToken` behavior.

- [ ] **Step 3: Implement the auth-aware query client and HTTP client**

```ts
// src/shared/api/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function clearProtectedQueryCache() {
  appQueryClient.clear();
}
```

```ts
// src/shared/api/http-client.ts
export type HttpClientConfig = {
  baseUrl: string;
  requestTimeoutMs: number;
};

export type HttpAuthController = {
  requiresAuth: boolean;
  retryOnAuthFailure: boolean;
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  clearSession: (message?: string) => void | Promise<void>;
};

export type CreateHttpClientOptions = {
  runtimeOptions?: ResolveApiBaseUrlOptions;
  tauriFetch?: TauriFetch;
  auth?: HttpAuthController;
};

let inFlightRefreshPromise: Promise<string | null> | null = null;

async function resolveAuthorizationHeader(auth?: HttpAuthController) {
  if (!auth?.requiresAuth) {
    return undefined;
  }

  const accessToken = auth.getAccessToken();
  if (!accessToken) {
    throw new ApiError("Missing access token", { status: 401 });
  }

  return `Bearer ${accessToken}`;
}

async function refreshAndReplay<T>(
  send: () => Promise<HttpResponse<T>>,
  auth?: HttpAuthController,
) {
  if (!auth?.requiresAuth || !auth.retryOnAuthFailure) {
    return send();
  }

  try {
    return await send();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    if (!inFlightRefreshPromise) {
      inFlightRefreshPromise = auth.refreshAccessToken().finally(() => {
        inFlightRefreshPromise = null;
      });
    }

    const refreshedToken = await inFlightRefreshPromise;
    if (!refreshedToken) {
      await auth.clearSession("登录已过期，请重新登录");
      throw error;
    }

    return send();
  }
}
```

- [ ] **Step 4: Run the HTTP client test to verify it passes**

Run: `npm run test -- src/shared/api/http-client.test.ts`

Expected: PASS with both the existing transport tests and the new Bearer-auth refresh tests.

- [ ] **Step 5: Commit the shared transport refactor**

```bash
git add src/shared/api/query-client.ts src/shared/api/http-client.ts src/shared/api/http-client.test.ts
git commit -m "refactor: add bearer auth support to http client"
```

## Task 3: Implement the auth API adapter and auth store

**Files:**
- Create: `src/modules/auth/api/auth-client.ts`
- Create: `src/modules/auth/api/auth-client.test.ts`
- Create: `src/modules/auth/model/auth.store.ts`
- Test: `src/modules/auth/model/auth.store.test.ts`

- [ ] **Step 1: Write failing auth client and auth store tests**

```ts
// src/modules/auth/api/auth-client.test.ts
import { expect, it, vi } from "vitest";
import { createHttpClient } from "@/shared/api/http-client";
import { loginWithPassword, refreshSessionToken } from "./auth-client";

vi.mock("@/shared/api/http-client", () => ({
  createHttpClient: vi.fn(),
}));

it("posts username and password to /api/v1/auth/login", async () => {
  const post = vi.fn().mockResolvedValue({
    data: {
      accessToken: "access-1",
      refreshToken: "refresh-1",
      tokenType: "Bearer",
      expiresIn: 900,
      user: { id: 1, username: "alice" },
    },
  });

  vi.mocked(createHttpClient).mockReturnValue({ get: vi.fn(), post, put: vi.fn(), delete: vi.fn() });

  await loginWithPassword(
    { username: "alice", password: "Password123" },
    { baseUrl: "http://localhost:8080", requestTimeoutMs: 60000 },
  );

  expect(post).toHaveBeenCalledWith("/api/v1/auth/login", {
    username: "alice",
    password: "Password123",
  });
});

it("posts the refresh token to /api/v1/auth/refresh", async () => {
  const post = vi.fn().mockResolvedValue({
    data: {
      accessToken: "access-2",
      refreshToken: "refresh-2",
      tokenType: "Bearer",
      expiresIn: 900,
      user: { id: 2, username: "bob" },
    },
  });

  vi.mocked(createHttpClient).mockReturnValue({ get: vi.fn(), post, put: vi.fn(), delete: vi.fn() });

  await refreshSessionToken("refresh-1", {
    baseUrl: "http://localhost:8080",
    requestTimeoutMs: 60000,
  });

  expect(post).toHaveBeenCalledWith("/api/v1/auth/refresh", {
    refreshToken: "refresh-1",
  });
});
```

```ts
// src/modules/auth/model/auth.store.test.ts
import { beforeEach, expect, it, vi } from "vitest";
import { clearProtectedQueryCache } from "@/shared/api/query-client";
import { useAuthStore } from "./auth.store";

vi.mock("@/modules/auth/api/auth-client", () => ({
  loginWithPassword: vi.fn(),
  registerWithPassword: vi.fn(),
  refreshSessionToken: vi.fn(),
  logoutCurrentSession: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

vi.mock("@/modules/auth/api/auth-session-repository", () => ({
  loadPersistedAuthSession: vi.fn(),
  savePersistedAuthSession: vi.fn(),
  clearPersistedAuthSession: vi.fn(),
}));

vi.mock("@/shared/api/query-client", () => ({
  clearProtectedQueryCache: vi.fn(),
}));

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState());
});

it("restores a persisted refresh token into an authenticated session", async () => {
  const { loadPersistedAuthSession } = await import("@/modules/auth/api/auth-session-repository");
  const { refreshSessionToken } = await import("@/modules/auth/api/auth-client");

  vi.mocked(loadPersistedAuthSession).mockResolvedValue({
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
  });
  vi.mocked(refreshSessionToken).mockResolvedValue({
    accessToken: "access-1",
    refreshToken: "refresh-2",
    tokenType: "Bearer",
    expiresIn: 900,
    user: { id: 1, username: "alice" },
  });

  await useAuthStore.getState().restoreSession({
    baseUrl: "http://localhost:8080",
    requestTimeoutMs: 60000,
  });

  expect(useAuthStore.getState()).toMatchObject({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-2",
    user: { id: 1, username: "alice" },
  });
});

it("clears auth state and protected query cache when logout completes", async () => {
  useAuthStore.setState({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    expiresAt: Date.now() + 10_000,
    authMessage: null,
  });

  await useAuthStore.getState().clearSession("登录已过期，请重新登录");

  expect(clearProtectedQueryCache).toHaveBeenCalled();
  expect(useAuthStore.getState()).toMatchObject({
    status: "anonymous",
    accessToken: null,
    refreshToken: null,
    user: null,
    authMessage: "登录已过期，请重新登录",
  });
});
```

- [ ] **Step 2: Run the auth tests to verify they fail**

Run: `npm run test -- src/modules/auth/api/auth-client.test.ts src/modules/auth/model/auth.store.test.ts`

Expected: FAIL because `auth-client.ts` and `auth.store.ts` do not exist yet.

- [ ] **Step 3: Implement the auth API adapter and store**

```ts
// src/modules/auth/api/auth-client.ts
import type { AuthTokenEnvelope, AuthUser } from "@/modules/auth/model/auth.types";
import { createHttpClient } from "@/shared/api/http-client";

type ConnectionConfig = {
  baseUrl: string;
  requestTimeoutMs: number;
};

type Credentials = {
  username: string;
  password: string;
};

export async function registerWithPassword(credentials: Credentials, connection: ConnectionConfig) {
  const client = createHttpClient(connection);
  const { data } = await client.post<AuthTokenEnvelope>("/api/v1/auth/register", credentials);
  return data;
}

export async function loginWithPassword(credentials: Credentials, connection: ConnectionConfig) {
  const client = createHttpClient(connection);
  const { data } = await client.post<AuthTokenEnvelope>("/api/v1/auth/login", credentials);
  return data;
}

export async function refreshSessionToken(refreshToken: string, connection: ConnectionConfig) {
  const client = createHttpClient(connection);
  const { data } = await client.post<AuthTokenEnvelope>("/api/v1/auth/refresh", { refreshToken });
  return data;
}

export async function fetchCurrentUser(
  connection: ConnectionConfig,
  client = createAuthenticatedHttpClient(connection),
) {
  const { data } = await client.get<AuthUser>("/api/v1/auth/me");
  return data;
}

export async function logoutCurrentSession(
  refreshToken: string,
  connection: ConnectionConfig,
  client = createAuthenticatedHttpClient(connection),
) {
  await client.post("/api/v1/auth/logout", { refreshToken });
}
```

```ts
// src/modules/auth/model/auth.store.ts
export const useAuthStore = create<AuthStore>((set, get) => ({
  status: "anonymous",
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  authMessage: null,
  async restoreSession(connection) {
    const persisted = await loadPersistedAuthSession();
    if (!persisted) {
      set({ status: "anonymous" });
      return;
    }

    set({ status: "restoring", refreshToken: persisted.refreshToken, user: persisted.user, authMessage: null });
    try {
      const envelope = await refreshSessionToken(persisted.refreshToken, connection);
      await savePersistedAuthSession({
        refreshToken: envelope.refreshToken,
        user: envelope.user,
      });
      set({
        status: "authenticated",
        accessToken: envelope.accessToken,
        refreshToken: envelope.refreshToken,
        expiresAt: Date.now() + envelope.expiresIn * 1000,
        user: envelope.user,
        authMessage: null,
      });
    } catch {
      await get().clearSession("登录已过期，请重新登录");
    }
  },
  async clearSession(authMessage = null) {
    await clearPersistedAuthSession();
    clearProtectedQueryCache();
    set({
      status: "anonymous",
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      authMessage,
    });
  },
}));
```

- [ ] **Step 4: Run the auth tests to verify they pass**

Run: `npm run test -- src/modules/auth/api/auth-client.test.ts src/modules/auth/model/auth.store.test.ts`

Expected: PASS with login/refresh request-shape coverage and restore/clear-session store coverage.

- [ ] **Step 5: Commit the auth module**

```bash
git add src/modules/auth/api/auth-client.ts src/modules/auth/api/auth-client.test.ts src/modules/auth/model/auth.store.ts src/modules/auth/model/auth.store.test.ts
git commit -m "feat: add auth session store"
```

## Task 4: Remove persisted credentials from settings and wire startup bootstrap

**Files:**
- Modify: `src/modules/settings/model/settings.schema.ts`
- Modify: `src/modules/settings/api/settings-repository.ts`
- Modify: `src/modules/settings/api/settings-repository.test.ts`
- Modify: `src/modules/settings/model/settings.store.ts`
- Modify: `src/app/providers/app-providers.tsx`
- Modify: `src/app/app.tsx`
- Delete: `src/modules/settings/model/settings.obfuscation.ts`
- Delete: `src/modules/settings/model/settings.obfuscation.test.ts`
- Delete: `src/modules/settings/api/test-connection.ts`

- [ ] **Step 1: Write the failing settings-repository and bootstrap expectations**

```ts
import { expect, it } from "vitest";
import { loadSettings } from "@/modules/settings/api/settings-repository";

const WEB_STORAGE_KEY = "codict.settings";

it("drops legacy username and password fields while keeping connection settings", async () => {
  localStorage.setItem(
    WEB_STORAGE_KEY,
    JSON.stringify({
      baseUrl: "http://localhost:8080",
      username: "tester",
      password: "secret",
      requestTimeoutMs: 30000,
      closeBehavior: "ask",
    }),
  );

  await expect(loadSettings()).resolves.toEqual({
    baseUrl: "http://localhost:8080",
    requestTimeoutMs: 60000,
    closeBehavior: "ask",
  });
});
```

```ts
// add to src/app/app.test.tsx
it("hydrates settings and then attempts auth restore on app startup", async () => {
  const restoreSession = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(useAuthStore, "getState").mockReturnValue({
    ...useAuthStore.getInitialState(),
    restoreSession,
  } as ReturnType<typeof useAuthStore.getState>);

  render(<App />);

  await waitFor(() => {
    expect(restoreSession).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm run test -- src/modules/settings/api/settings-repository.test.ts src/app/app.test.tsx`

Expected: FAIL because settings still require username/password and `App` does not restore auth on startup.

- [ ] **Step 3: Implement settings cleanup and app bootstrap**

```ts
// src/modules/settings/model/settings.schema.ts
export const settingsSchema = z.object({
  baseUrl: z.string().url(),
  requestTimeoutMs: z.number().int().min(1000).max(60000).default(60000),
  closeBehavior: z.enum(["ask", "tray", "exit"]).default("ask"),
});

export const defaultSettingsValues = {
  baseUrl: "",
  requestTimeoutMs: 60000,
  closeBehavior: "ask",
};
```

```ts
// src/app/providers/app-providers.tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, type RouterProviderProps } from "react-router-dom";
import { appQueryClient } from "@/shared/api/query-client";

export function AppProviders({ children, router }: AppProvidersProps) {
  return (
    <QueryClientProvider client={appQueryClient}>
      {router ? <RouterProvider router={router} /> : children}
    </QueryClientProvider>
  );
}
```

```ts
// src/app/app.tsx
function SessionBootstrapController() {
  const isSettingsHydrated = useSettingsStore((state) => state.isHydrated);
  const settings = useSettingsStore((state) => state.values);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const authStatus = useAuthStore((state) => state.status);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    if (!isSettingsHydrated) {
      void hydrateSettings();
    }
  }, [hydrateSettings, isSettingsHydrated]);

  useEffect(() => {
    if (!isSettingsHydrated || !settings.baseUrl || authStatus !== "anonymous") {
      return;
    }

    void restoreSession({
      baseUrl: settings.baseUrl,
      requestTimeoutMs: settings.requestTimeoutMs,
    });
  }, [authStatus, isSettingsHydrated, restoreSession, settings.baseUrl, settings.requestTimeoutMs]);

  return null;
}
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm run test -- src/modules/settings/api/settings-repository.test.ts src/app/app.test.tsx`

Expected: PASS with legacy-field drop coverage and startup restore coverage.

- [ ] **Step 5: Commit the settings cleanup**

```bash
git add src/modules/settings/model/settings.schema.ts src/modules/settings/api/settings-repository.ts src/modules/settings/api/settings-repository.test.ts src/modules/settings/model/settings.store.ts src/app/providers/app-providers.tsx src/app/app.tsx
git rm src/modules/settings/model/settings.obfuscation.ts src/modules/settings/model/settings.obfuscation.test.ts src/modules/settings/api/test-connection.ts
git commit -m "refactor: remove persisted credentials from settings"
```

## Task 5: Build the Settings-page account session UI

**Files:**
- Create: `src/modules/auth/ui/auth-session-card.tsx`
- Modify: `src/modules/settings/ui/settings-form.tsx`
- Modify: `src/modules/settings/screens/settings-screen.tsx`
- Test: `src/modules/settings/ui/settings-screen.test.tsx`

- [ ] **Step 1: Write the failing Settings-screen integration tests**

```ts
it("logs in from the account session card and shows the authenticated user", async () => {
  server.use(
    http.post("http://localhost:8080/api/v1/auth/login", () =>
      HttpResponse.json({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        tokenType: "Bearer",
        expiresIn: 900,
        user: { id: 1, username: "测试者" },
      }),
    ),
  );

  render(<SettingsScreen />);

  await screen.findByLabelText("服务地址");
  await userEvent.type(screen.getByLabelText("服务地址"), "http://localhost:8080");
  await userEvent.click(screen.getByRole("button", { name: "保存设置" }));
  await userEvent.type(screen.getByLabelText("用户名"), "测试者");
  await userEvent.type(screen.getByLabelText("密码"), "密码-🔒");
  await userEvent.click(screen.getByRole("button", { name: "登录" }));

  expect(await screen.findByText("当前用户：测试者")).toBeInTheDocument();
});

it("switches to register mode and requires matching confirmation password", async () => {
  render(<SettingsScreen />);

  await screen.findByLabelText("服务地址");
  await userEvent.type(screen.getByLabelText("服务地址"), "http://localhost:8080");
  await userEvent.click(screen.getByRole("button", { name: "保存设置" }));
  await userEvent.click(screen.getByRole("tab", { name: "注册" }));
  await userEvent.type(screen.getByLabelText("用户名"), "alice");
  await userEvent.type(screen.getByLabelText("密码"), "Password123");
  await userEvent.type(screen.getByLabelText("确认密码"), "Password999");
  await userEvent.click(screen.getByRole("button", { name: "注册" }));

  expect(await screen.findByText("两次输入的密码不一致")).toBeInTheDocument();
});

it("clears the session when the saved baseUrl changes", async () => {
  useAuthStore.setState({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    expiresAt: Date.now() + 10_000,
    authMessage: null,
  });

  render(<SettingsScreen />);

  const baseUrl = await screen.findByLabelText("服务地址");
  await userEvent.clear(baseUrl);
  await userEvent.type(baseUrl, "http://127.0.0.1:8080");
  await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

  expect(await screen.findByText("服务地址已变更，请重新登录")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the Settings-screen test to verify it fails**

Run: `npm run test -- src/modules/settings/ui/settings-screen.test.tsx`

Expected: FAIL because Settings still renders a single connection form with `测试连接`, no login/register card, and no baseUrl-change logout behavior.

- [ ] **Step 3: Implement the account session card and screen integration**

```tsx
// src/modules/auth/ui/auth-session-card.tsx
export function AuthSessionCard({
  connection,
}: {
  connection: Pick<SettingsValues, "baseUrl" | "requestTimeoutMs">;
}) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const authMessage = useAuthStore((state) => state.authMessage);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const verifySession = useAuthStore((state) => state.verifySession);
  const logout = useAuthStore((state) => state.logout);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (mode === "register" && password !== confirmPassword) {
      setFeedback("两次输入的密码不一致");
      return;
    }

    const action = mode === "login" ? login : register;
    await action({ username, password }, connection);
    setFeedback(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>账号会话</CardTitle>
        <CardDescription>登录、注册、验证当前会话或退出登录。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connection.baseUrl ? <StatusView title="请先保存服务地址" /> : null}
        {status === "authenticated" && user ? (
          <>
            <p>当前用户：{user.username}</p>
            <div className="flex gap-3">
              <Button onClick={() => void verifySession(connection)}>验证当前会话</Button>
              <Button variant="outline" onClick={() => void logout(connection)}>退出登录</Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/modules/settings/screens/settings-screen.tsx
const previousBaseUrlRef = useRef(values.baseUrl);

const handleSave = async (nextValues: SettingsValues) => {
  setIsBusy(true);
  try {
    const previousBaseUrl = previousBaseUrlRef.current;
    await persist(nextValues);
    previousBaseUrlRef.current = nextValues.baseUrl;

    if (previousBaseUrl && previousBaseUrl !== nextValues.baseUrl) {
      await useAuthStore.getState().clearSession("服务地址已变更，请重新登录");
    }
  } finally {
    setIsBusy(false);
  }
};

return (
  <section className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">设置</CardTitle>
        <CardDescription>连接词典服务并调整使用偏好</CardDescription>
      </CardHeader>
      <CardContent>
        {!isHydrated ? <p className="text-sm text-[hsl(var(--muted-foreground))]">正在加载设置</p> : null}
        {isHydrated ? (
          <SettingsForm
            initialValues={values}
            onSave={handleSave}
            isBusy={isBusy}
          />
        ) : null}
      </CardContent>
    </Card>
    {isHydrated ? (
      <AuthSessionCard
        connection={{
          baseUrl: values.baseUrl,
          requestTimeoutMs: values.requestTimeoutMs,
        }}
      />
    ) : null}
  </section>
);
```

- [ ] **Step 4: Run the Settings-screen test to verify it passes**

Run: `npm run test -- src/modules/settings/ui/settings-screen.test.tsx`

Expected: PASS with login/register/baseUrl-change coverage and no remaining `测试连接` assertions.

- [ ] **Step 5: Commit the Settings-page auth UI**

```bash
git add src/modules/auth/ui/auth-session-card.tsx src/modules/settings/ui/settings-form.tsx src/modules/settings/screens/settings-screen.tsx src/modules/settings/ui/settings-screen.test.tsx
git commit -m "feat: add settings auth session controls"
```

## Task 6: Switch protected APIs and screens to authenticated-session gating

**Files:**
- Create: `src/modules/auth/api/authenticated-http-client.ts`
- Modify: `src/modules/query/api/fetch-entry.ts`
- Modify: `src/modules/query/api/refresh-entry.ts`
- Modify: `src/modules/translations/api/fetch-text-translation.ts`
- Modify: `src/modules/history/api/fetch-history-page.ts`
- Modify: `src/modules/history/api/fetch-history-detail.ts`
- Modify: `src/modules/audio/api/fetch-audio.ts`
- Modify: `src/modules/wordbooks/api/fetch-wordbooks.ts`
- Modify: `src/modules/wordbooks/api/fetch-wordbook-words.ts`
- Modify: `src/modules/wordbooks/api/find-containing-wordbooks.ts`
- Modify: `src/modules/wordbooks/api/mutate-wordbooks.ts`
- Modify: `src/modules/wordbooks/api/mutate-wordbook-words.ts`
- Modify: `src/modules/recent-searches/api/fetch-recent-searches.ts`
- Modify: `src/modules/translations/api/fetch-recent-translation-history.ts`
- Modify: `src/modules/query/screens/workspace-screen.tsx`
- Modify: `src/modules/translations/screens/translations-screen.tsx`
- Modify: `src/modules/history/screens/history-screen.tsx`
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.tsx`
- Modify: `src/modules/wordbooks/ui/add-to-wordbook-dialog.tsx`
- Test: `src/modules/query/ui/workspace-screen.test.tsx`
- Test: `src/modules/translations/ui/translations-screen.test.tsx`
- Test: `src/modules/history/ui/history-screen.test.tsx`
- Test: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
- Test: `src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`

- [ ] **Step 1: Write failing screen tests for authenticated gating and cache keys**

```ts
// add to src/modules/query/ui/workspace-screen.test.tsx
beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState());
});

it("asks the user to log in before running protected workspace queries", async () => {
  useSettingsStore.setState({
    isHydrated: true,
    values: {
      ...defaultSettingsValues,
      baseUrl: "http://localhost:8080",
    },
  });

  renderWorkspace(createTestQueryClient());

  expect(await screen.findByText("请先完成设置并登录")).toBeInTheDocument();
});
```

```ts
// add to src/modules/wordbooks/ui/wordbooks-screen.test.tsx
it("does not fetch wordbooks when the session is anonymous", async () => {
  const requests = vi.fn();
  server.use(
    http.get("http://localhost:8080/api/v1/wordbooks", () => {
      requests();
      return HttpResponse.json([]);
    }),
  );

  useAuthStore.setState(useAuthStore.getInitialState());
  renderWordbooksScreen();

  expect(await screen.findByText("请先完成设置并登录")).toBeInTheDocument();
  expect(requests).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the protected-screen tests to verify they fail**

Run: `npm run test -- src/modules/query/ui/workspace-screen.test.tsx src/modules/translations/ui/translations-screen.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`

Expected: FAIL because screens still depend on `settings.username/password`, API helpers still construct Basic-auth clients, and the anonymous-state copy still says `请先完成设置`.

- [ ] **Step 3: Implement the authenticated HTTP helper and update protected consumers**

```ts
// src/modules/auth/api/authenticated-http-client.ts
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { createHttpClient } from "@/shared/api/http-client";

export function createAuthenticatedHttpClient(
  connection: Pick<SettingsValues, "baseUrl" | "requestTimeoutMs">,
) {
  return createHttpClient(
    {
      baseUrl: connection.baseUrl,
      requestTimeoutMs: connection.requestTimeoutMs,
    },
    {
      auth: {
        requiresAuth: true,
        retryOnAuthFailure: true,
        getAccessToken: () => useAuthStore.getState().accessToken,
        refreshAccessToken: async () => {
          await useAuthStore.getState().refreshSession(connection);
          return useAuthStore.getState().accessToken;
        },
        clearSession: (message) => {
          void useAuthStore.getState().clearSession(message);
        },
      },
    },
  );
}
```

```ts
// example: src/modules/query/api/fetch-entry.ts
export async function fetchEntry(
  params: QueryParams,
  settings: Pick<SettingsValues, "baseUrl" | "requestTimeoutMs">,
) {
  const client = createAuthenticatedHttpClient(settings);
  const { data } = await client.get<EntryQueryResponse>("/api/v1/entries", { params });
  return mapEntryResponse(data);
}
```

```tsx
// example: src/modules/query/screens/workspace-screen.tsx
const authStatus = useAuthStore((state) => state.status);
const authUser = useAuthStore((state) => state.user);
const canQuery = Boolean(settings.baseUrl && authStatus === "authenticated" && authUser);

const recentSearchesQueryKey = useMemo(
  () => (authUser ? ["recent-searches", settings.baseUrl, authUser.id] as const : ["recent-searches", "anonymous"] as const),
  [authUser, settings.baseUrl],
);

{isHydrated && settings.baseUrl && !canQuery ? (
  <StatusView
    title="请先完成设置并登录"
    description="登录后即可使用查词、历史和单词本。"
    className="border-white/5 bg-[hsl(var(--surface))/0.7]"
  />
) : null}
```

- [ ] **Step 4: Run the protected-screen tests to verify they pass**

Run: `npm run test -- src/modules/query/ui/workspace-screen.test.tsx src/modules/translations/ui/translations-screen.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`

Expected: PASS with anonymous gating, authenticated fetches, and user-scoped query-key assertions.

- [ ] **Step 5: Commit the protected-session refactor**

```bash
git add src/modules/auth/api/authenticated-http-client.ts src/modules/query/api/fetch-entry.ts src/modules/query/api/refresh-entry.ts src/modules/translations/api/fetch-text-translation.ts src/modules/history/api/fetch-history-page.ts src/modules/history/api/fetch-history-detail.ts src/modules/audio/api/fetch-audio.ts src/modules/wordbooks/api/fetch-wordbooks.ts src/modules/wordbooks/api/fetch-wordbook-words.ts src/modules/wordbooks/api/find-containing-wordbooks.ts src/modules/wordbooks/api/mutate-wordbooks.ts src/modules/wordbooks/api/mutate-wordbook-words.ts src/modules/recent-searches/api/fetch-recent-searches.ts src/modules/translations/api/fetch-recent-translation-history.ts src/modules/query/screens/workspace-screen.tsx src/modules/translations/screens/translations-screen.tsx src/modules/history/screens/history-screen.tsx src/modules/wordbooks/ui/wordbooks-screen.tsx src/modules/wordbooks/ui/add-to-wordbook-dialog.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/translations/ui/translations-screen.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx
git commit -m "refactor: gate protected screens on auth session"
```

## Task 7: Migrate history timestamps to ISO strings

**Files:**
- Modify: `src/modules/history/model/history-types.ts`
- Modify: `src/modules/history/model/history-time.ts`
- Modify: `src/modules/history/model/history-restore.test.ts`
- Modify: `src/modules/history/ui/history-list.test.tsx`
- Modify: `src/modules/translations/ui/translations-screen.test.tsx`
- Modify: `src/modules/history/ui/history-screen.test.tsx`
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`

- [ ] **Step 1: Write the failing ISO timestamp tests**

```ts
import { expect, it } from "vitest";
import { formatHistoryTime } from "./history-time";

it("formats ISO local-date-time strings without timezone conversion", () => {
  expect(formatHistoryTime("2026-03-21T12:00:00")).toBe("2026-03-21 12:00:00");
});
```

```ts
const detail = {
  historyKey: "text::2026-03-22",
  query: "早上好",
  normalizedQuery: "早上好",
  resultType: "TEXT_TRANSLATION",
  summary: "Good morning",
  sourceApi: "TEXT_TRANSLATIONS_V1",
  latestSearchTime: "2026-03-22T09:10:00",
  searchCount: 1,
  searchTimes: ["2026-03-22T09:10:00"],
  response: {
    text: "早上好",
    normalizedText: "早上好",
    sourceLanguage: "zh",
    targetLanguage: "en",
    translatedText: "Good morning",
    segments: [],
    keyPhrases: [],
    notes: ["常见问候语"],
  },
} satisfies HistoryDetail;
```

- [ ] **Step 2: Run the history tests to verify they fail**

Run: `npm run test -- src/modules/history/model/history-restore.test.ts src/modules/history/ui/history-list.test.tsx`

Expected: FAIL because history types and formatters still require Jackson time arrays.

- [ ] **Step 3: Implement ISO timestamp support**

```ts
// src/modules/history/model/history-types.ts
export type HistorySummaryItem = {
  historyKey: string;
  query: string;
  normalizedQuery: string;
  resultType: HistoryResultType;
  summary: string;
  sourceApi: string;
  latestSearchTime?: string;
  searchCount?: number;
  searchTimes?: string[];
};
```

```ts
// src/modules/history/model/history-time.ts
export function formatHistoryTime(value?: string) {
  if (!value) {
    return "";
  }

  const normalized = value.replace("T", " ");
  return normalized.length >= 19 ? normalized.slice(0, 19) : normalized;
}
```

- [ ] **Step 4: Run the history tests to verify they pass**

Run: `npm run test -- src/modules/history/model/history-restore.test.ts src/modules/history/ui/history-list.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/translations/ui/translations-screen.test.tsx src/modules/query/ui/workspace-screen.test.tsx`

Expected: PASS with all history fixtures using ISO strings consistently.

- [ ] **Step 5: Commit the ISO timestamp migration**

```bash
git add src/modules/history/model/history-types.ts src/modules/history/model/history-time.ts src/modules/history/model/history-restore.test.ts src/modules/history/ui/history-list.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/translations/ui/translations-screen.test.tsx src/modules/query/ui/workspace-screen.test.tsx
git commit -m "refactor: parse history timestamps as iso strings"
```

## Task 8: Final docs update and verification

**Files:**
- Modify: `README.md`
- Verify: all changed frontend tests

- [ ] **Step 1: Update the README for the new Settings-page auth flow**

```md
## 本地开发

1. 安装 Node.js、Rust、Tauri 前置依赖。
2. 执行 `npm install`。
3. Web 调试执行 `npm run dev`，默认监听 `127.0.0.1:3000`。
4. 桌面壳调试执行 `npm run tauri:dev`，会复用同一份开发服务器配置。
5. 打开应用后，在“设置”页先保存 DicServer 服务地址。
6. 然后在同一页的“账号会话”区域注册或登录；客户端会持久化 refresh token，并在下次启动时自动恢复登录状态。
```

- [ ] **Step 2: Run the focused frontend verification suite**

Run: `npm run test -- src/shared/api/http-client.test.ts src/modules/auth/api/auth-session-repository.test.ts src/modules/auth/api/auth-client.test.ts src/modules/auth/model/auth.store.test.ts src/modules/settings/api/settings-repository.test.ts src/modules/settings/ui/settings-screen.test.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/translations/ui/translations-screen.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/history/model/history-restore.test.ts src/modules/history/ui/history-list.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx src/app/app.test.tsx`

Expected: PASS with no remaining Basic-auth assertions and no Jackson-array timestamp fixtures.

- [ ] **Step 3: Run the production build as a final type check**

Run: `npm run build`

Expected: PASS with a successful TypeScript compile and Vite production build.

- [ ] **Step 4: Manually verify the live backend flow at `http://127.0.0.1:8080`**

```text
1. 保存服务地址 http://127.0.0.1:8080
2. 注册一个新用户并确认立即进入已登录态
3. 退出登录，再用同一用户登录
4. 重启应用，确认自动恢复登录成功
5. 执行一次查词、一次短文翻译、一次历史打开、一次新建单词本
6. 修改服务地址，确认会话被清空并提示重新登录
```

- [ ] **Step 5: Commit the finished feature**

```bash
git add README.md
git commit -m "feat: support authenticated multi-user sessions"
```
