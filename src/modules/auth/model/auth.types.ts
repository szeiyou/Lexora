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

export type AuthStatus =
  | "anonymous"
  | "restoring"
  | "authenticated"
  | "refreshing";
