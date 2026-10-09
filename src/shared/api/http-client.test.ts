import { HttpResponse, http } from "msw";
import { afterEach, expect, it, vi } from "vitest";
import { createHttpClient, resolveApiBaseUrl } from "@/shared/api/http-client";
import { server } from "@/test/msw/server";

afterEach(() => {
  vi.restoreAllMocks();
});

it("routes browser dev requests through the local proxy", () => {
  expect(
    resolveApiBaseUrl("http://192.168.0.10:8080", {
      isDev: true,
      isTauriRuntime: false,
      isBrowserRuntime: true,
    }),
  ).toBe("/__api_proxy__/http%3A%2F%2F192.168.0.10%3A8080");
});

it("keeps the configured base url outside browser dev mode", () => {
  expect(
    resolveApiBaseUrl("http://192.168.0.10:8080", {
      isDev: false,
      isTauriRuntime: false,
      isBrowserRuntime: true,
    }),
  ).toBe("http://192.168.0.10:8080");

  expect(
    resolveApiBaseUrl("http://192.168.0.10:8080", {
      isDev: true,
      isTauriRuntime: true,
      isBrowserRuntime: true,
    }),
  ).toBe("http://192.168.0.10:8080");
});

it("uses the tauri native transport for desktop runtime requests", async () => {
  const tauriFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify([{ query: "hello" }]), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }),
  );
  const client = createHttpClient(
    {
      baseUrl: "http://192.168.0.10:8080",
      requestTimeoutMs: 5000,
    },
    {
      runtimeOptions: {
        isDev: true,
        isTauriRuntime: true,
        isBrowserRuntime: true,
      },
      tauriFetch,
    },
  );

  const response = await client.get("/api/v1/recent-searches");

  expect(tauriFetch).toHaveBeenCalledWith(
    "http://192.168.0.10:8080/api/v1/recent-searches",
    expect.objectContaining({
      method: "GET",
    }),
  );
  expect(response.status).toBe(200);
  expect(response.data).toEqual([{ query: "hello" }]);
});

it("maps tauri timeout cancellations to timeout api errors", async () => {
  const controller = new AbortController();
  controller.abort(new DOMException("The operation timed out.", "TimeoutError"));
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);

  const client = createHttpClient(
    {
      baseUrl: "http://47.116.163.88:8080",
      requestTimeoutMs: 8000,
    },
    {
      runtimeOptions: {
        isDev: false,
        isTauriRuntime: true,
        isBrowserRuntime: true,
      },
      tauriFetch: vi.fn().mockRejectedValue("Request canceled"),
    },
  );

  await expect(client.get("/api/v1/entries", { params: { q: "clarification" } })).rejects.toMatchObject({
    message: "timeout of 8000ms exceeded",
    code: "ECONNABORTED",
    details: "The operation timed out.",
  });
});

it("adds a Bearer token for authenticated tauri requests", async () => {
  const tauriFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ content: [] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }),
  );

  const client = createHttpClient(
    {
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 5000,
    },
    {
      runtimeOptions: {
        isDev: false,
        isTauriRuntime: true,
        isBrowserRuntime: true,
      },
      tauriFetch,
      auth: {
        requiresAuth: true,
        retryOnAuthFailure: true,
        getAccessToken: () => "tauri-access-token",
        refreshAccessToken: vi.fn(),
        clearSession: vi.fn(),
      },
    },
  );

  await expect(client.get("/api/v1/history")).resolves.toMatchObject({ status: 200 });

  expect(tauriFetch).toHaveBeenCalledWith(
    "http://localhost:8080/api/v1/history",
    expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({
        Authorization: "Bearer tauri-access-token",
      }),
    }),
  );
});

it("refreshes and retries tauri 401 requests with the new Bearer token", async () => {
  let currentToken = "tauri-stale-token";
  const refreshAccessToken = vi.fn(async () => {
    currentToken = "tauri-fresh-token";
    return currentToken;
  });
  const tauriFetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
    const authorization = (init?.headers as Record<string, string> | undefined)?.Authorization;

    if (authorization === "Bearer tauri-stale-token") {
      return new Response(JSON.stringify({ message: "expired" }), {
        status: 401,
        headers: {
          "content-type": "application/json",
        },
      });
    }

    expect(authorization).toBe("Bearer tauri-fresh-token");
    return new Response(JSON.stringify({ content: [] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  });

  const client = createHttpClient(
    {
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 5000,
    },
    {
      runtimeOptions: {
        isDev: false,
        isTauriRuntime: true,
        isBrowserRuntime: true,
      },
      tauriFetch,
      auth: {
        requiresAuth: true,
        retryOnAuthFailure: true,
        getAccessToken: () => currentToken,
        refreshAccessToken,
        clearSession: vi.fn(),
      },
    },
  );

  await expect(client.get("/api/v1/history")).resolves.toMatchObject({ status: 200 });
  expect(refreshAccessToken).toHaveBeenCalledTimes(1);
});

it("adds a Bearer token for authenticated browser requests", async () => {
  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      expect(request.headers.get("authorization")).toBe("Bearer access-token-1");
      return HttpResponse.json({ content: [] });
    }),
  );

  const client = createHttpClient(
    {
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 5000,
    },
    {
      runtimeOptions: {
        isDev: false,
        isTauriRuntime: false,
        isBrowserRuntime: true,
      },
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

it("refreshes once and retries concurrent 401 requests from separate clients with the new Bearer token", async () => {
  let currentToken = "stale-token";
  const sharedRefresh = vi.fn(async () => {
    currentToken = "fresh-token";
    return currentToken;
  });

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      if (request.headers.get("authorization") === "Bearer stale-token") {
        return HttpResponse.json({ message: "expired" }, { status: 401 });
      }

      expect(request.headers.get("authorization")).toBe("Bearer fresh-token");
      return HttpResponse.json({ content: [] });
    }),
  );

  const firstAuth = {
    requiresAuth: true,
    retryOnAuthFailure: true,
    getAccessToken: () => currentToken,
    refreshAccessToken: () => sharedRefresh(),
    clearSession: vi.fn(),
  };

  const secondAuth = {
    requiresAuth: true,
    retryOnAuthFailure: true,
    getAccessToken: () => currentToken,
    refreshAccessToken: () => sharedRefresh(),
    clearSession: vi.fn(),
  };

  const firstClient = createHttpClient(
    {
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 5000,
    },
    {
      runtimeOptions: {
        isDev: false,
        isTauriRuntime: false,
        isBrowserRuntime: true,
      },
      auth: firstAuth,
    },
  );

  const secondClient = createHttpClient(
    {
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 5000,
    },
    {
      runtimeOptions: {
        isDev: false,
        isTauriRuntime: false,
        isBrowserRuntime: true,
      },
      auth: secondAuth,
    },
  );

  await Promise.all([firstClient.get("/api/v1/history"), secondClient.get("/api/v1/history")]);

  expect(sharedRefresh).toHaveBeenCalledTimes(1);
});

it("does not share refresh across distinct auth contexts", async () => {
  let firstToken = "stale-token-1";
  let secondToken = "stale-token-2";
  const sharedRefresh = vi.fn(async (sessionId: string) => {
    if (sessionId === "first") {
      firstToken = "fresh-token-1";
      return firstToken;
    }

    secondToken = "fresh-token-2";
    return secondToken;
  });

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      const authorization = request.headers.get("authorization");

      if (authorization === "Bearer stale-token-1" || authorization === "Bearer stale-token-2") {
        return HttpResponse.json({ message: "expired" }, { status: 401 });
      }

      expect([
        "Bearer fresh-token-1",
        "Bearer fresh-token-2",
      ]).toContain(authorization);
      return HttpResponse.json({ content: [] });
    }),
  );

  const firstClient = createHttpClient(
    {
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 5000,
    },
    {
      runtimeOptions: {
        isDev: false,
        isTauriRuntime: false,
        isBrowserRuntime: true,
      },
      auth: {
        requiresAuth: true,
        retryOnAuthFailure: true,
        getAccessToken: () => firstToken,
        refreshAccessToken: () => sharedRefresh("first"),
        clearSession: vi.fn(),
      },
    },
  );

  const secondClient = createHttpClient(
    {
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 5000,
    },
    {
      runtimeOptions: {
        isDev: false,
        isTauriRuntime: false,
        isBrowserRuntime: true,
      },
      auth: {
        requiresAuth: true,
        retryOnAuthFailure: true,
        getAccessToken: () => secondToken,
        refreshAccessToken: () => sharedRefresh("second"),
        clearSession: vi.fn(),
      },
    },
  );

  await Promise.all([firstClient.get("/api/v1/history"), secondClient.get("/api/v1/history")]);

  expect(sharedRefresh).toHaveBeenCalledTimes(2);
});
