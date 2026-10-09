import type { SettingsValues } from "@/modules/settings/model/settings.schema";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { createHttpClient } from "@/shared/api/http-client";

export type AuthenticatedConnectionConfig = Pick<
  SettingsValues,
  "baseUrl" | "requestTimeoutMs"
>;

export function createAuthenticatedHttpClient(
  connection: AuthenticatedConnectionConfig,
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
        refreshAccessToken: () => useAuthStore.getState().refreshSession(connection),
        clearSession: (message) => useAuthStore.getState().clearSession(message),
      },
    },
  );
}
