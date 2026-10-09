import { create } from "zustand";
import {
  fetchCurrentUser,
  fetchCurrentUserWithSessionRecovery,
  loginWithPassword,
  logoutCurrentSession,
  refreshSessionToken,
  registerWithPassword,
  type AuthConnectionConfig,
  type AuthCredentials,
} from "@/modules/auth/api/auth-client";
import {
  clearPersistedAuthSession,
  loadPersistedAuthSession,
  savePersistedAuthSession,
} from "@/modules/auth/api/auth-session-repository";
import type { AuthStatus, AuthTokenEnvelope, AuthUser } from "@/modules/auth/model/auth.types";
import { useQueryStore } from "@/modules/query/model/query-store";
import { clearProtectedQueryCache } from "@/shared/api/query-client";

const SESSION_EXPIRED_MESSAGE = "登录已过期，请重新登录";
const VERIFY_SESSION_FAILED_MESSAGE = "当前会话验证失败";

type AuthStoreState = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  authMessage: string | null;
  protectedStateVersion: number;
};

type AuthStoreActions = {
  restoreSession: (connection: AuthConnectionConfig) => Promise<void>;
  clearSession: (authMessage?: string | null) => Promise<void>;
  login: (
    credentials: AuthCredentials,
    connection: AuthConnectionConfig,
  ) => Promise<void>;
  register: (
    credentials: AuthCredentials,
    connection: AuthConnectionConfig,
  ) => Promise<void>;
  refreshSession: (connection: AuthConnectionConfig) => Promise<string | null>;
  verifySession: (connection: AuthConnectionConfig) => Promise<AuthUser | null>;
  silentlyVerifySession: (connection: AuthConnectionConfig) => Promise<AuthUser | null>;
  logout: (connection: AuthConnectionConfig) => Promise<void>;
};

export type AuthStore = AuthStoreState & AuthStoreActions;

function createAnonymousState(
  authMessage: string | null = null,
  protectedStateVersion = 0,
): AuthStoreState {
  return {
    status: "anonymous",
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    authMessage,
    protectedStateVersion,
  };
}

function toAuthenticatedState(
  envelope: AuthTokenEnvelope,
  protectedStateVersion: number,
): AuthStoreState {
  return {
    status: "authenticated",
    user: envelope.user,
    accessToken: envelope.accessToken,
    refreshToken: envelope.refreshToken,
    expiresAt: Date.now() + envelope.expiresIn * 1000,
    authMessage: null,
    protectedStateVersion,
  };
}

async function persistAuthenticatedSession(envelope: AuthTokenEnvelope) {
  await savePersistedAuthSession({
    refreshToken: envelope.refreshToken,
    user: envelope.user,
  });
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...createAnonymousState(),

  restoreSession: async (connection) => {
    const persisted = await loadPersistedAuthSession();
    if (!persisted) {
      set(createAnonymousState());
      return;
    }

    set({
      status: "restoring",
      user: persisted.user,
      accessToken: null,
      refreshToken: persisted.refreshToken,
      expiresAt: null,
      authMessage: null,
      protectedStateVersion: get().protectedStateVersion,
    });

    try {
      const envelope = await refreshSessionToken(persisted.refreshToken, connection);
      await persistAuthenticatedSession(envelope);
      set(toAuthenticatedState(envelope, get().protectedStateVersion));
    } catch {
      await get().clearSession(SESSION_EXPIRED_MESSAGE);
    }
  },

  clearSession: async (authMessage = null) => {
    const nextProtectedStateVersion = get().protectedStateVersion + 1;

    try {
      await clearPersistedAuthSession();
    } catch {
      // Query cache and in-memory auth state must always clear even if persistence cleanup fails.
    }

    useQueryStore.getState().reset();
    clearProtectedQueryCache();
    set(createAnonymousState(authMessage, nextProtectedStateVersion));
  },

  login: async (credentials, connection) => {
    const envelope = await loginWithPassword(credentials, connection);
    await persistAuthenticatedSession(envelope);
    set(toAuthenticatedState(envelope, get().protectedStateVersion));
  },

  register: async (credentials, connection) => {
    const envelope = await registerWithPassword(credentials, connection);
    await persistAuthenticatedSession(envelope);
    set(toAuthenticatedState(envelope, get().protectedStateVersion));
  },

  refreshSession: async (connection) => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) {
      await get().clearSession(SESSION_EXPIRED_MESSAGE);
      return null;
    }

    try {
      const envelope = await refreshSessionToken(refreshToken, connection);
      await persistAuthenticatedSession(envelope);
      set(toAuthenticatedState(envelope, get().protectedStateVersion));
      return envelope.accessToken;
    } catch {
      await get().clearSession(SESSION_EXPIRED_MESSAGE);
      return null;
    }
  },

  verifySession: async (connection) => {
    const accessToken = get().accessToken;
    if (!accessToken) {
      set({ authMessage: VERIFY_SESSION_FAILED_MESSAGE });
      return null;
    }

    try {
      const user = await fetchCurrentUser(accessToken, connection);
      set({
        status: "authenticated",
        user,
        authMessage: null,
      });
      return user;
    } catch {
      set({ authMessage: VERIFY_SESSION_FAILED_MESSAGE });
      return null;
    }
  },

  silentlyVerifySession: async (connection) => {
    const accessToken = get().accessToken;
    if (!accessToken) {
      await get().clearSession(SESSION_EXPIRED_MESSAGE);
      return null;
    }

    try {
      const user = await fetchCurrentUserWithSessionRecovery(connection, {
        requiresAuth: true,
        retryOnAuthFailure: true,
        getAccessToken: () => get().accessToken,
        refreshAccessToken: () => get().refreshSession(connection),
        clearSession: (message) => get().clearSession(message),
      });

      set({
        status: "authenticated",
        user,
        authMessage: null,
      });
      return user;
    } catch {
      if (get().status !== "anonymous") {
        await get().clearSession(SESSION_EXPIRED_MESSAGE);
      }
      return null;
    }
  },

  logout: async (connection) => {
    const { accessToken, refreshToken } = get();

    try {
      if (accessToken && refreshToken) {
        await logoutCurrentSession({ accessToken, refreshToken }, connection);
      }
    } catch {
      // Local logout must still succeed if the server has already expired the session.
    } finally {
      await get().clearSession();
    }
  },
}));
