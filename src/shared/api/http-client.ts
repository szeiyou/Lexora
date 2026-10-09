import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { ApiError } from "@/shared/api/api-error";
import {
  recordHttpDiagnostic,
  toHttpDiagnosticErrorMetadata,
  type HttpRuntimeDiagnostics,
  type HttpTransport,
} from "@/shared/api/http-diagnostics";

export const DEV_API_PROXY_PREFIX = "/__api_proxy__";

const SESSION_EXPIRED_MESSAGE = "登录已过期，请重新登录";

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

export type ResolveApiBaseUrlOptions = HttpRuntimeDiagnostics;

export type HttpRequestConfig<D = unknown> = Pick<
  AxiosRequestConfig<D>,
  "data" | "params" | "responseType" | "validateStatus"
>;

export type HttpResponse<T = unknown> = {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
};

export type HttpClient = {
  get<T = unknown>(url: string, requestConfig?: HttpRequestConfig): Promise<HttpResponse<T>>;
  post<T = unknown>(
    url: string,
    data?: unknown,
    requestConfig?: HttpRequestConfig,
  ): Promise<HttpResponse<T>>;
  put<T = unknown>(
    url: string,
    data?: unknown,
    requestConfig?: HttpRequestConfig,
  ): Promise<HttpResponse<T>>;
  delete<T = unknown>(url: string, requestConfig?: HttpRequestConfig): Promise<HttpResponse<T>>;
};

export type TauriFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type CreateHttpClientOptions = {
  runtimeOptions?: ResolveApiBaseUrlOptions;
  tauriFetch?: TauriFetch;
  auth?: HttpAuthController;
};

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type RequestAttemptState = {
  accessTokenOverride?: string | null;
  hasRetriedAfterAuthFailure?: boolean;
};

type HttpAuthState = {
  getAuthorizationHeader: (accessTokenOverride?: string | null) => string | undefined;
  canRetryUnauthorized: (hasRetriedAfterAuthFailure?: boolean) => boolean;
  refreshAccessToken: (authContextKey: string) => Promise<string | null>;
  clearExpiredSession: () => Promise<void>;
};

const sharedRefreshPromisesByAuthContext = new Map<string, Promise<string | null>>();

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof AxiosError) {
    return new ApiError(error.message, {
      status: error.response?.status,
      code: error.code,
      details: error.response?.data,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  if (typeof error === "string") {
    return new ApiError(error);
  }

  return new ApiError("Unknown API error");
}

function toTimedOutApiError(
  requestTimeoutMs: number,
  reason?: unknown,
) {
  const details =
    reason instanceof Error
      ? reason.message
      : typeof reason === "object" &&
          reason !== null &&
          "message" in reason &&
          typeof reason.message === "string"
        ? reason.message
        : typeof reason === "string"
          ? reason
          : undefined;

  return new ApiError(`timeout of ${requestTimeoutMs}ms exceeded`, {
    code: "ECONNABORTED",
    details,
  });
}

function toTauriRequestError(
  error: unknown,
  timeoutSignal: AbortSignal | undefined,
  requestTimeoutMs: number,
) {
  if (timeoutSignal?.aborted) {
    return toTimedOutApiError(requestTimeoutMs, timeoutSignal.reason ?? error);
  }

  return toApiError(error);
}

function detectRuntimeOptions(): ResolveApiBaseUrlOptions {
  const isBrowserRuntime = typeof window !== "undefined";
  const isTauriRuntime = isBrowserRuntime && "__TAURI_INTERNALS__" in window;

  return {
    isDev: import.meta.env.DEV && !import.meta.env.VITEST,
    isTauriRuntime,
    isBrowserRuntime,
  };
}

function getHttpTransport(options: ResolveApiBaseUrlOptions): HttpTransport {
  return options.isTauriRuntime ? "tauri-http" : "browser-http";
}

function recordClientCreated(
  transport: HttpTransport,
  runtimeOptions: ResolveApiBaseUrlOptions,
  config: HttpClientConfig,
  resolvedBaseUrl: string,
) {
  recordHttpDiagnostic({
    phase: "client.created",
    transport,
    ...runtimeOptions,
    configuredBaseUrl: config.baseUrl,
    resolvedBaseUrl,
    requestTimeoutMs: config.requestTimeoutMs,
  });
}

function recordRequestStarted(
  transport: HttpTransport,
  runtimeOptions: ResolveApiBaseUrlOptions,
  config: HttpClientConfig,
  resolvedBaseUrl: string,
  method: string,
  requestPath: string,
) {
  recordHttpDiagnostic({
    phase: "request.started",
    transport,
    ...runtimeOptions,
    method,
    configuredBaseUrl: config.baseUrl,
    resolvedBaseUrl,
    requestPath,
    requestTimeoutMs: config.requestTimeoutMs,
  });
}

function recordResponseReceived(
  transport: HttpTransport,
  runtimeOptions: ResolveApiBaseUrlOptions,
  config: HttpClientConfig,
  resolvedBaseUrl: string,
  method: string,
  requestPath: string,
  status: number,
  statusText: string,
) {
  recordHttpDiagnostic({
    phase: "response.received",
    transport,
    ...runtimeOptions,
    method,
    configuredBaseUrl: config.baseUrl,
    resolvedBaseUrl,
    requestPath,
    requestTimeoutMs: config.requestTimeoutMs,
    status,
    statusText,
  });
}

function recordRequestFailed(
  transport: HttpTransport,
  runtimeOptions: ResolveApiBaseUrlOptions,
  config: HttpClientConfig,
  resolvedBaseUrl: string,
  method: string,
  requestPath: string,
  error: unknown,
) {
  const metadata = toHttpDiagnosticErrorMetadata(error);

  recordHttpDiagnostic({
    phase: "request.failed",
    transport,
    ...runtimeOptions,
    method,
    configuredBaseUrl: config.baseUrl,
    resolvedBaseUrl,
    requestPath,
    requestTimeoutMs: config.requestTimeoutMs,
    status: metadata.status,
    code: metadata.code,
    message: metadata.message,
    details: metadata.details,
  });
}

export function resolveApiBaseUrl(
  baseUrl: string,
  options: ResolveApiBaseUrlOptions = detectRuntimeOptions(),
) {
  if (options.isDev && options.isBrowserRuntime && !options.isTauriRuntime) {
    return `${DEV_API_PROXY_PREFIX}/${encodeURIComponent(baseUrl)}`;
  }

  return baseUrl;
}

function appendSearchParams(url: URL, params?: HttpRequestConfig["params"]) {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return;
  }

  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    url.searchParams.delete(key);

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        url.searchParams.append(key, String(value));
      }
      continue;
    }

    url.searchParams.set(key, String(rawValue));
  }
}

function resolveRequestUrl(
  baseUrl: string,
  requestUrl: string,
  params?: HttpRequestConfig["params"],
) {
  const url = new URL(requestUrl, baseUrl);
  appendSearchParams(url, params);
  return url.toString();
}

function shouldSendJsonBody(body: unknown) {
  return (
    body !== null &&
    body !== undefined &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams)
  );
}

function toRequestHeaders(
  body: unknown,
  authorization?: string,
) {
  const headers: Record<string, string> = {};

  if (authorization) {
    headers.Authorization = authorization;
  }

  if (shouldSendJsonBody(body)) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function readResponseData<T>(
  response: Response,
  responseType?: HttpRequestConfig["responseType"],
) {
  if (responseType === "blob") {
    return (await response.blob()) as T;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

function toApiErrorFromResponse(
  message: string,
  response: Response,
  details: unknown,
) {
  return new ApiError(message, {
    status: response.status,
    details,
  });
}

function toApiErrorFromAxiosResponse<T>(
  response: Pick<AxiosResponse<T>, "status" | "data">,
) {
  return new ApiError(`Request failed with status code ${response.status}`, {
    status: response.status,
    details: response.data,
  });
}

function isSuccessStatus(status: number) {
  return status >= 200 && status < 300;
}

async function getTauriFetch(override?: TauriFetch): Promise<TauriFetch> {
  if (override) {
    return override;
  }

  const { fetch } = await import("@tauri-apps/plugin-http");
  return fetch;
}

function getAuthContextKey(
  resolvedBaseUrl: string,
  authorization?: string,
) {
  return `${resolvedBaseUrl}::${authorization ?? "no-auth-token"}`;
}

function createHttpAuthState(auth?: HttpAuthController): HttpAuthState {
  return {
    getAuthorizationHeader(accessTokenOverride) {
      if (!auth?.requiresAuth) {
        return undefined;
      }

      const accessToken = accessTokenOverride ?? auth.getAccessToken();
      return accessToken ? `Bearer ${accessToken}` : undefined;
    },
    canRetryUnauthorized(hasRetriedAfterAuthFailure) {
      return Boolean(
        auth?.requiresAuth &&
          auth.retryOnAuthFailure &&
          !hasRetriedAfterAuthFailure,
      );
    },
    async refreshAccessToken(authContextKey) {
      if (!auth?.requiresAuth || !auth.retryOnAuthFailure) {
        return null;
      }

      const inFlightRefresh = sharedRefreshPromisesByAuthContext.get(authContextKey);
      if (inFlightRefresh) {
        return inFlightRefresh;
      }

      const refreshPromise = Promise.resolve(auth.refreshAccessToken()).finally(() => {
        sharedRefreshPromisesByAuthContext.delete(authContextKey);
      });
      sharedRefreshPromisesByAuthContext.set(authContextKey, refreshPromise);

      return refreshPromise;
    },
    async clearExpiredSession() {
      if (!auth) {
        return;
      }

      try {
        await auth.clearSession(SESSION_EXPIRED_MESSAGE);
      } catch {
        // Preserve the original auth failure when session cleanup also fails.
      }
    },
  };
}

async function resolveRetriedAccessToken(
  authState: HttpAuthState,
  hasRetriedAfterAuthFailure: boolean | undefined,
  authContextKey: string,
) {
  if (!authState.canRetryUnauthorized(hasRetriedAfterAuthFailure)) {
    return null;
  }

  const refreshedAccessToken = await authState.refreshAccessToken(authContextKey);

  if (refreshedAccessToken) {
    return refreshedAccessToken;
  }

  await authState.clearExpiredSession();
  return null;
}

async function sendTauriRequest<T>(
  method: HttpMethod,
  clientConfig: HttpClientConfig,
  runtimeOptions: ResolveApiBaseUrlOptions,
  resolvedBaseUrl: string,
  requestUrl: string,
  requestConfig: HttpRequestConfig = {},
  authState: HttpAuthState,
  tauriFetch?: TauriFetch,
  attemptState: RequestAttemptState = {},
): Promise<HttpResponse<T>> {
  const transport = getHttpTransport(runtimeOptions);
  const targetUrl = resolveRequestUrl(resolvedBaseUrl, requestUrl, requestConfig.params);
  const fetchImpl = await getTauriFetch(tauriFetch);
  const body = requestConfig.data;
  const timeoutSignal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(clientConfig.requestTimeoutMs)
      : undefined;

  try {
    const authorization = authState.getAuthorizationHeader(attemptState.accessTokenOverride);
    const authContextKey = getAuthContextKey(resolvedBaseUrl, authorization);
    recordRequestStarted(
      transport,
      runtimeOptions,
      clientConfig,
      resolvedBaseUrl,
      method,
      targetUrl,
    );

    const response = await fetchImpl(targetUrl, {
      method,
      headers: toRequestHeaders(
        body,
        authorization,
      ),
      body:
        body === null || body === undefined
          ? undefined
          : shouldSendJsonBody(body)
            ? JSON.stringify(body)
            : (body as BodyInit),
      signal: timeoutSignal,
    });
    const data = await readResponseData<T>(response, requestConfig.responseType);

    if (response.status === 401) {
      const refreshedAccessToken = await resolveRetriedAccessToken(
        authState,
        attemptState.hasRetriedAfterAuthFailure ?? false,
        authContextKey,
      );

      if (refreshedAccessToken) {
        return sendTauriRequest<T>(
          method,
          clientConfig,
          runtimeOptions,
          resolvedBaseUrl,
          requestUrl,
          requestConfig,
          authState,
          tauriFetch,
          {
            accessTokenOverride: refreshedAccessToken,
            hasRetriedAfterAuthFailure: true,
          },
        );
      }
    }

    const validateStatus = requestConfig.validateStatus ?? isSuccessStatus;

    if (!validateStatus(response.status)) {
      throw toApiErrorFromResponse(`Request failed with status code ${response.status}`, response, data);
    }

    recordResponseReceived(
      transport,
      runtimeOptions,
      clientConfig,
      resolvedBaseUrl,
      method,
      targetUrl,
      response.status,
      response.statusText,
    );

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    const normalizedError = toTauriRequestError(
      error,
      timeoutSignal,
      clientConfig.requestTimeoutMs,
    );

    recordRequestFailed(
      transport,
      runtimeOptions,
      clientConfig,
      resolvedBaseUrl,
      method,
      targetUrl,
      normalizedError,
    );
    return Promise.reject(normalizedError);
  }
}

function createTauriHttpClient(
  config: HttpClientConfig,
  runtimeOptions: ResolveApiBaseUrlOptions,
  authState: HttpAuthState,
  tauriFetch?: TauriFetch,
): HttpClient {
  const resolvedBaseUrl = resolveApiBaseUrl(config.baseUrl, runtimeOptions);

  recordClientCreated(getHttpTransport(runtimeOptions), runtimeOptions, config, resolvedBaseUrl);

  return {
    get: <T = unknown>(url: string, requestConfig?: HttpRequestConfig) =>
      sendTauriRequest<T>(
        "GET",
        config,
        runtimeOptions,
        resolvedBaseUrl,
        url,
        requestConfig,
        authState,
        tauriFetch,
      ),
    post: <T = unknown>(url: string, data?: unknown, requestConfig?: HttpRequestConfig) =>
      sendTauriRequest<T>(
        "POST",
        config,
        runtimeOptions,
        resolvedBaseUrl,
        url,
        { ...requestConfig, data },
        authState,
        tauriFetch,
      ),
    put: <T = unknown>(url: string, data?: unknown, requestConfig?: HttpRequestConfig) =>
      sendTauriRequest<T>(
        "PUT",
        config,
        runtimeOptions,
        resolvedBaseUrl,
        url,
        { ...requestConfig, data },
        authState,
        tauriFetch,
      ),
    delete: <T = unknown>(url: string, requestConfig?: HttpRequestConfig) =>
      sendTauriRequest<T>(
        "DELETE",
        config,
        runtimeOptions,
        resolvedBaseUrl,
        url,
        requestConfig,
        authState,
        tauriFetch,
      ),
  };
}

function createAxiosHttpClient(
  config: HttpClientConfig,
  runtimeOptions: ResolveApiBaseUrlOptions,
  authState: HttpAuthState,
): HttpClient {
  const transport = getHttpTransport(runtimeOptions);
  const resolvedBaseUrl = resolveApiBaseUrl(config.baseUrl, runtimeOptions);
  const client = axios.create({
    baseURL: resolvedBaseUrl,
    timeout: config.requestTimeoutMs,
  });

  recordClientCreated(transport, runtimeOptions, config, resolvedBaseUrl);

  async function sendAxiosRequest<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    requestConfig: HttpRequestConfig = {},
    attemptState: RequestAttemptState = {},
  ): Promise<HttpResponse<T>> {
    const authorization = authState.getAuthorizationHeader(attemptState.accessTokenOverride);
    const authContextKey = getAuthContextKey(resolvedBaseUrl, authorization);
    recordRequestStarted(transport, runtimeOptions, config, resolvedBaseUrl, method, url);

    try {
      const response = await client.request<T>({
        ...requestConfig,
        method,
        url,
        data,
        headers: toRequestHeaders(
          data,
          authorization,
        ),
        validateStatus: () => true,
      });

      if (response.status === 401) {
        const refreshedAccessToken = await resolveRetriedAccessToken(
          authState,
          attemptState.hasRetriedAfterAuthFailure ?? false,
          authContextKey,
        );

        if (refreshedAccessToken) {
          return sendAxiosRequest<T>(
            method,
            url,
            data,
            requestConfig,
            {
              accessTokenOverride: refreshedAccessToken,
              hasRetriedAfterAuthFailure: true,
            },
          );
        }
      }

      const validateStatus = requestConfig.validateStatus ?? isSuccessStatus;

      if (!validateStatus(response.status)) {
        throw toApiErrorFromAxiosResponse(response);
      }

      recordResponseReceived(
        transport,
        runtimeOptions,
        config,
        resolvedBaseUrl,
        method,
        url,
        response.status,
        response.statusText,
      );

      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      const normalizedError = toApiError(error);
      recordRequestFailed(transport, runtimeOptions, config, resolvedBaseUrl, method, url, normalizedError);
      return Promise.reject(normalizedError);
    }
  }

  return {
    get: <T = unknown>(url: string, requestConfig?: HttpRequestConfig) =>
      sendAxiosRequest<T>("GET", url, undefined, requestConfig),
    post: <T = unknown>(url: string, data?: unknown, requestConfig?: HttpRequestConfig) =>
      sendAxiosRequest<T>("POST", url, data, requestConfig),
    put: <T = unknown>(url: string, data?: unknown, requestConfig?: HttpRequestConfig) =>
      sendAxiosRequest<T>("PUT", url, data, requestConfig),
    delete: <T = unknown>(url: string, requestConfig?: HttpRequestConfig) =>
      sendAxiosRequest<T>("DELETE", url, undefined, requestConfig),
  };
}

export function createHttpClient<TConfig extends HttpClientConfig>(
  config: TConfig,
  options: CreateHttpClientOptions = {},
): HttpClient {
  const runtimeOptions = options.runtimeOptions ?? detectRuntimeOptions();
  const authState = createHttpAuthState(options.auth);

  if (runtimeOptions.isTauriRuntime) {
    return createTauriHttpClient(config, runtimeOptions, authState, options.tauriFetch);
  }

  return createAxiosHttpClient(config, runtimeOptions, authState);
}
