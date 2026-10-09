import { ApiError } from "@/shared/api/api-error";
import { isRequestTimeoutError } from "@/shared/api/api-error-utils";
import {
  createHttpClient,
  type HttpAuthController,
  type HttpClientConfig,
} from "@/shared/api/http-client";
import type { AuthTokenEnvelope, AuthUser } from "@/modules/auth/model/auth.types";

export type AuthCredentials = {
  username: string;
  password: string;
};

export type AuthConnectionConfig = HttpClientConfig;

export type AuthenticatedSession = {
  accessToken: string;
  refreshToken: string;
};

type AuthAction = "login" | "register";

type ApiErrorDetails = {
  code?: string;
  message?: string;
};

const CONNECTION_FAILED_MESSAGE = "连接失败，请确认服务地址是否正确（通常需要包含 :8080）";
const AUTHENTICATION_FAILED_MESSAGE = "认证失败，请检查用户名和密码";
const REQUEST_TIMEOUT_MESSAGE = "请求超时，请稍后重试";
const AUTH_OPERATION_FAILED_MESSAGE = "操作失败，请稍后重试";
const NETWORK_FAILURE_PATTERN =
  /\bnetwork error\b|\bfailed to fetch\b|\bfetch failed\b|\beconnrefused\b|\bload failed\b/i;

function createAuthenticatedAuthClient(
  connection: AuthConnectionConfig,
  accessToken: string,
) {
  return createHttpClient(connection, {
    auth: {
      requiresAuth: true,
      retryOnAuthFailure: false,
      getAccessToken: () => accessToken,
      refreshAccessToken: async () => null,
      clearSession: () => undefined,
    },
  });
}

function extractApiErrorDetails(details: unknown): ApiErrorDetails | null {
  if (typeof details !== "object" || details === null) {
    return null;
  }

  const candidate = details as Record<string, unknown>;

  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message: typeof candidate.message === "string" ? candidate.message : undefined,
  };
}

function isConnectionFailure(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === undefined && NETWORK_FAILURE_PATTERN.test(error.message);
  }

  return error instanceof Error && NETWORK_FAILURE_PATTERN.test(error.message);
}

function toFriendlyAuthError(
  error: unknown,
  action: AuthAction,
) {
  if (isRequestTimeoutError(error)) {
    return new ApiError(REQUEST_TIMEOUT_MESSAGE, {
      code: "ECONNABORTED",
      details: error instanceof ApiError ? error.details : undefined,
    });
  }

  if (isConnectionFailure(error)) {
    return new ApiError(CONNECTION_FAILED_MESSAGE, {
      details: error instanceof ApiError ? error.details : undefined,
    });
  }

  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error : new Error(AUTH_OPERATION_FAILED_MESSAGE);
  }

  const details = extractApiErrorDetails(error.details);

  if (error.status === 404) {
    return new ApiError(CONNECTION_FAILED_MESSAGE, {
      status: error.status,
      code: details?.code,
      details: error.details,
    });
  }

  if (action === "login" && (error.status === 401 || error.status === 403)) {
    const message =
      details?.code === "INVALID_CREDENTIALS"
        ? details.message ?? "用户名或密码错误"
        : details?.message ?? AUTHENTICATION_FAILED_MESSAGE;

    return new ApiError(message, {
      status: error.status,
      code: details?.code,
      details: error.details,
    });
  }

  if (action === "register" && error.status === 400 && details?.message) {
    return new ApiError(details.message, {
      status: error.status,
      code: details.code,
      details: error.details,
    });
  }

  if (details?.message) {
    return new ApiError(details.message, {
      status: error.status,
      code: details.code,
      details: error.details,
    });
  }

  return new ApiError(AUTH_OPERATION_FAILED_MESSAGE, {
    status: error.status,
    code: details?.code,
    details: error.details,
  });
}

export async function registerWithPassword(
  credentials: AuthCredentials,
  connection: AuthConnectionConfig,
) {
  try {
    const client = createHttpClient(connection);
    const { data } = await client.post<AuthTokenEnvelope>("/api/v1/auth/register", credentials);
    return data;
  } catch (error) {
    throw toFriendlyAuthError(error, "register");
  }
}

export async function loginWithPassword(
  credentials: AuthCredentials,
  connection: AuthConnectionConfig,
) {
  try {
    const client = createHttpClient(connection);
    const { data } = await client.post<AuthTokenEnvelope>("/api/v1/auth/login", credentials);
    return data;
  } catch (error) {
    throw toFriendlyAuthError(error, "login");
  }
}

export async function refreshSessionToken(
  refreshToken: string,
  connection: AuthConnectionConfig,
) {
  const client = createHttpClient(connection);
  const { data } = await client.post<AuthTokenEnvelope>("/api/v1/auth/refresh", { refreshToken });
  return data;
}

export async function fetchCurrentUser(
  accessToken: string,
  connection: AuthConnectionConfig,
) {
  const client = createAuthenticatedAuthClient(connection, accessToken);
  const { data } = await client.get<AuthUser>("/api/v1/auth/me");
  return data;
}

export async function fetchCurrentUserWithSessionRecovery(
  connection: AuthConnectionConfig,
  auth: HttpAuthController,
) {
  const client = createHttpClient(connection, { auth });
  const { data } = await client.get<AuthUser>("/api/v1/auth/me");
  return data;
}

export async function logoutCurrentSession(
  session: AuthenticatedSession,
  connection: AuthConnectionConfig,
) {
  const client = createAuthenticatedAuthClient(connection, session.accessToken);
  await client.post("/api/v1/auth/logout", {
    refreshToken: session.refreshToken,
  });
}
