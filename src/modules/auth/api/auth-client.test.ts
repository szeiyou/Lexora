import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import { createHttpClient } from "@/shared/api/http-client";
import {
  fetchCurrentUser,
  loginWithPassword,
  logoutCurrentSession,
  refreshSessionToken,
  registerWithPassword,
} from "./auth-client";

vi.mock("@/shared/api/http-client", () => ({
  createHttpClient: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it("maps invalid login credentials to a friendly message", async () => {
  const post = vi.fn().mockRejectedValue(
    new ApiError("Request failed with status code 401", {
      status: 401,
      details: {
        code: "INVALID_CREDENTIALS",
        message: "用户名或密码错误",
      },
    }),
  );

  vi.mocked(createHttpClient).mockReturnValue({
    get: vi.fn(),
    post,
    put: vi.fn(),
    delete: vi.fn(),
  });

  await expect(
    loginWithPassword(
      { username: "alice", password: "wrong-password" },
      { baseUrl: "http://localhost:8080", requestTimeoutMs: 60000 },
    ),
  ).rejects.toMatchObject({
    message: "用户名或密码错误",
  });
});

it("prefers the backend register message for validation failures", async () => {
  const post = vi.fn().mockRejectedValue(
    new ApiError("Request failed with status code 400", {
      status: 400,
      details: {
        code: "USERNAME_ALREADY_EXISTS",
        message: "用户名已存在",
      },
    }),
  );

  vi.mocked(createHttpClient).mockReturnValue({
    get: vi.fn(),
    post,
    put: vi.fn(),
    delete: vi.fn(),
  });

  await expect(
    registerWithPassword(
      { username: "alice", password: "Password123" },
      { baseUrl: "http://localhost:8080", requestTimeoutMs: 60000 },
    ),
  ).rejects.toMatchObject({
    message: "用户名已存在",
  });
});

it("maps missing auth endpoints to a connection hint", async () => {
  const post = vi.fn().mockRejectedValue(
    new ApiError("Request failed with status code 404", {
      status: 404,
    }),
  );

  vi.mocked(createHttpClient).mockReturnValue({
    get: vi.fn(),
    post,
    put: vi.fn(),
    delete: vi.fn(),
  });

  await expect(
    loginWithPassword(
      { username: "alice", password: "Password123" },
      { baseUrl: "http://localhost:8080", requestTimeoutMs: 60000 },
    ),
  ).rejects.toMatchObject({
    message: "连接失败，请确认服务地址是否正确（通常需要包含 :8080）",
  });
});

it("maps timeout failures to a retry hint", async () => {
  const post = vi.fn().mockRejectedValue(
    new ApiError("timeout of 60000ms exceeded", {
      code: "ECONNABORTED",
      details: "The operation timed out.",
    }),
  );

  vi.mocked(createHttpClient).mockReturnValue({
    get: vi.fn(),
    post,
    put: vi.fn(),
    delete: vi.fn(),
  });

  await expect(
    loginWithPassword(
      { username: "alice", password: "Password123" },
      { baseUrl: "http://localhost:8080", requestTimeoutMs: 60000 },
    ),
  ).rejects.toMatchObject({
    message: "请求超时，请稍后重试",
  });
});

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

  vi.mocked(createHttpClient).mockReturnValue({
    get: vi.fn(),
    post,
    put: vi.fn(),
    delete: vi.fn(),
  });

  await loginWithPassword(
    { username: "alice", password: "Password123" },
    { baseUrl: "http://localhost:8080", requestTimeoutMs: 60000 },
  );

  expect(post).toHaveBeenCalledWith("/api/v1/auth/login", {
    username: "alice",
    password: "Password123",
  });
});

it("posts username and password to /api/v1/auth/register", async () => {
  const post = vi.fn().mockResolvedValue({
    data: {
      accessToken: "access-1",
      refreshToken: "refresh-1",
      tokenType: "Bearer",
      expiresIn: 900,
      user: { id: 1, username: "alice" },
    },
  });

  vi.mocked(createHttpClient).mockReturnValue({
    get: vi.fn(),
    post,
    put: vi.fn(),
    delete: vi.fn(),
  });

  await registerWithPassword(
    { username: "alice", password: "Password123" },
    { baseUrl: "http://localhost:8080", requestTimeoutMs: 60000 },
  );

  expect(post).toHaveBeenCalledWith("/api/v1/auth/register", {
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

  vi.mocked(createHttpClient).mockReturnValue({
    get: vi.fn(),
    post,
    put: vi.fn(),
    delete: vi.fn(),
  });

  await refreshSessionToken("refresh-1", {
    baseUrl: "http://localhost:8080",
    requestTimeoutMs: 60000,
  });

  expect(post).toHaveBeenCalledWith("/api/v1/auth/refresh", {
    refreshToken: "refresh-1",
  });
});

it("gets the current user with an authenticated client", async () => {
  const get = vi.fn().mockResolvedValue({
    data: { id: 1, username: "alice" },
  });

  vi.mocked(createHttpClient).mockReturnValue({
    get,
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  });

  await fetchCurrentUser("access-1", {
    baseUrl: "http://localhost:8080",
    requestTimeoutMs: 60000,
  });

  expect(createHttpClient).toHaveBeenCalledWith(
    { baseUrl: "http://localhost:8080", requestTimeoutMs: 60000 },
    expect.objectContaining({
      auth: expect.objectContaining({
        requiresAuth: true,
        retryOnAuthFailure: false,
        getAccessToken: expect.any(Function),
      }),
    }),
  );
  expect(get).toHaveBeenCalledWith("/api/v1/auth/me");
});

it("posts logout with the refresh token using an authenticated client", async () => {
  const post = vi.fn().mockResolvedValue({ data: undefined });

  vi.mocked(createHttpClient).mockReturnValue({
    get: vi.fn(),
    post,
    put: vi.fn(),
    delete: vi.fn(),
  });

  await logoutCurrentSession(
    {
      accessToken: "access-1",
      refreshToken: "refresh-1",
    },
    {
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 60000,
    },
  );

  expect(createHttpClient).toHaveBeenCalledWith(
    { baseUrl: "http://localhost:8080", requestTimeoutMs: 60000 },
    expect.objectContaining({
      auth: expect.objectContaining({
        requiresAuth: true,
        retryOnAuthFailure: false,
        getAccessToken: expect.any(Function),
      }),
    }),
  );
  expect(post).toHaveBeenCalledWith("/api/v1/auth/logout", {
    refreshToken: "refresh-1",
  });
});
