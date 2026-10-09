import {
  createAuthenticatedHttpClient,
  type AuthenticatedConnectionConfig,
} from "@/modules/auth/api/authenticated-http-client";
import type { WordbookWord } from "@/modules/wordbooks/model/wordbook.types";

export async function fetchWordbookWords(
  wordbookId: number,
  settings: AuthenticatedConnectionConfig,
) {
  const client = createAuthenticatedHttpClient(settings);
  const { data } = await client.get<WordbookWord[]>(`/api/v1/wordbooks/${wordbookId}/words`);
  return data;
}
