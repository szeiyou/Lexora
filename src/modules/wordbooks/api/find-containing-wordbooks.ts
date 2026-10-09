import {
  createAuthenticatedHttpClient,
  type AuthenticatedConnectionConfig,
} from "@/modules/auth/api/authenticated-http-client";

export async function findContainingWordbooks(
  word: string,
  settings: AuthenticatedConnectionConfig,
) {
  const client = createAuthenticatedHttpClient(settings);
  const { data } = await client.get<number[]>("/api/v1/wordbooks/containing", {
    params: { word },
  });
  return data;
}
