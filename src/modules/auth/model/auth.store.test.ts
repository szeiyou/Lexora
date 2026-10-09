import { beforeEach, expect, it, vi } from "vitest";
import { clearProtectedQueryCache } from "@/shared/api/query-client";
import { useAuthStore } from "./auth.store";

vi.mock("@/modules/auth/api/auth-client", () => ({
  loginWithPassword: vi.fn(),
  registerWithPassword: vi.fn(),
  refreshSessionToken: vi.fn(),
  logoutCurrentSession: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchCurrentUserWithSessionRecovery: vi.fn(),
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
  vi.clearAllMocks();
  useAuthStore.setState(useAuthStore.getInitialState());
});

it("restores a persisted refresh token into an authenticated session", async () => {
  const { loadPersistedAuthSession } = await import("@/modules/auth/api/auth-session-repository");
  const { savePersistedAuthSession } = await import("@/modules/auth/api/auth-session-repository");
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
  expect(savePersistedAuthSession).toHaveBeenCalledWith({
    refreshToken: "refresh-2",
    user: { id: 1, username: "alice" },
  });
});

it("clears auth state and protected query cache when logout completes", async () => {
  const { clearPersistedAuthSession } = await import("@/modules/auth/api/auth-session-repository");

  useAuthStore.setState({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    expiresAt: Date.now() + 10_000,
    authMessage: null,
  });

  await useAuthStore.getState().clearSession("登录已过期，请重新登录");

  expect(clearPersistedAuthSession).toHaveBeenCalled();
  expect(clearProtectedQueryCache).toHaveBeenCalled();
  expect(useAuthStore.getState()).toMatchObject({
    status: "anonymous",
    accessToken: null,
    refreshToken: null,
    user: null,
    authMessage: "登录已过期，请重新登录",
  });
});

it("still clears auth state when persisted session cleanup fails", async () => {
  const { clearPersistedAuthSession } = await import("@/modules/auth/api/auth-session-repository");

  vi.mocked(clearPersistedAuthSession).mockRejectedValue(new Error("store unavailable"));

  useAuthStore.setState({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    expiresAt: Date.now() + 10_000,
    authMessage: null,
  });

  await expect(useAuthStore.getState().clearSession("登录已过期，请重新登录")).resolves.toBeUndefined();

  expect(clearPersistedAuthSession).toHaveBeenCalled();
  expect(clearProtectedQueryCache).toHaveBeenCalled();
  expect(useAuthStore.getState()).toMatchObject({
    status: "anonymous",
    accessToken: null,
    refreshToken: null,
    user: null,
    authMessage: "登录已过期，请重新登录",
  });
});

it("stores the rotated session after login succeeds", async () => {
  const { loginWithPassword } = await import("@/modules/auth/api/auth-client");
  const { savePersistedAuthSession } = await import("@/modules/auth/api/auth-session-repository");

  vi.mocked(loginWithPassword).mockResolvedValue({
    accessToken: "access-1",
    refreshToken: "refresh-1",
    tokenType: "Bearer",
    expiresIn: 900,
    user: { id: 1, username: "alice" },
  });

  await useAuthStore.getState().login(
    { username: "alice", password: "Password123" },
    {
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 60000,
    },
  );

  expect(savePersistedAuthSession).toHaveBeenCalledWith({
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
  });
  expect(useAuthStore.getState()).toMatchObject({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    authMessage: null,
  });
  expect(useAuthStore.getState().expiresAt).toEqual(expect.any(Number));
});

it("clears local auth state even when logout revocation fails", async () => {
  const { logoutCurrentSession } = await import("@/modules/auth/api/auth-client");

  vi.mocked(logoutCurrentSession).mockRejectedValue(new Error("expired on server"));

  useAuthStore.setState({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    expiresAt: Date.now() + 10_000,
    authMessage: null,
  });

  await useAuthStore.getState().logout({
    baseUrl: "http://localhost:8080",
    requestTimeoutMs: 60000,
  });

  expect(useAuthStore.getState()).toMatchObject({
    status: "anonymous",
    accessToken: null,
    refreshToken: null,
    user: null,
    authMessage: null,
  });
});

it("sets authMessage and resolves when current-user verification fails", async () => {
  const { fetchCurrentUser } = await import("@/modules/auth/api/auth-client");

  vi.mocked(fetchCurrentUser).mockRejectedValue(new Error("expired access token"));

  useAuthStore.setState({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    expiresAt: Date.now() + 10_000,
    authMessage: null,
  });

  await expect(
    useAuthStore.getState().verifySession({
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 60000,
    }),
  ).resolves.toBeNull();

  expect(fetchCurrentUser).toHaveBeenCalledWith("access-1", {
    baseUrl: "http://localhost:8080",
    requestTimeoutMs: 60000,
  });
  expect(useAuthStore.getState()).toMatchObject({
    status: "authenticated",
    authMessage: "当前会话验证失败",
    user: { id: 1, username: "alice" },
  });
});

it("keeps the user authenticated when silent session verification succeeds", async () => {
  const { fetchCurrentUserWithSessionRecovery } = await import("@/modules/auth/api/auth-client");

  vi.mocked(fetchCurrentUserWithSessionRecovery).mockResolvedValue({
    id: 1,
    username: "alice-renamed",
  });

  useAuthStore.setState({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    expiresAt: Date.now() + 10_000,
    authMessage: "stale error",
  });

  await expect(
    useAuthStore.getState().silentlyVerifySession({
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 60000,
    }),
  ).resolves.toEqual({ id: 1, username: "alice-renamed" });

  expect(fetchCurrentUserWithSessionRecovery).toHaveBeenCalledWith(
    {
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 60000,
    },
    expect.objectContaining({
      requiresAuth: true,
      retryOnAuthFailure: true,
      getAccessToken: expect.any(Function),
      refreshAccessToken: expect.any(Function),
      clearSession: expect.any(Function),
    }),
  );
  expect(useAuthStore.getState()).toMatchObject({
    status: "authenticated",
    user: { id: 1, username: "alice-renamed" },
    authMessage: null,
  });
});

it("clears the session when silent verification fails", async () => {
  const { fetchCurrentUserWithSessionRecovery } = await import("@/modules/auth/api/auth-client");

  vi.mocked(fetchCurrentUserWithSessionRecovery).mockRejectedValue(new Error("expired"));

  useAuthStore.setState({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    expiresAt: Date.now() + 10_000,
    authMessage: null,
  });

  await expect(
    useAuthStore.getState().silentlyVerifySession({
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 60000,
    }),
  ).resolves.toBeNull();

  expect(useAuthStore.getState()).toMatchObject({
    status: "anonymous",
    accessToken: null,
    refreshToken: null,
    user: null,
    authMessage: "登录已过期，请重新登录",
  });
});
