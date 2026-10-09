import {
  createAuthenticatedHttpClient,
  type AuthenticatedConnectionConfig,
} from "@/modules/auth/api/authenticated-http-client";
import type { Wordbook } from "@/modules/wordbooks/model/wordbook.types";

export async function fetchWordbooks(settings: AuthenticatedConnectionConfig) {
  const client = createAuthenticatedHttpClient(settings);
  const { data } = await client.get<Wordbook[]>("/api/v1/wordbooks");
  return data;
}
