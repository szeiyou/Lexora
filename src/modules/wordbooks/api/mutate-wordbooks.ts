import {
  createAuthenticatedHttpClient,
  type AuthenticatedConnectionConfig,
} from "@/modules/auth/api/authenticated-http-client";
import type { Wordbook } from "@/modules/wordbooks/model/wordbook.types";

function createWordbookClient(settings: AuthenticatedConnectionConfig) {
  return createAuthenticatedHttpClient(settings);
}

export async function createWordbook(name: string, settings: AuthenticatedConnectionConfig) {
  const client = createWordbookClient(settings);
  const { data } = await client.post<Wordbook>("/api/v1/wordbooks", null, {
    params: { name },
  });
  return data;
}

export async function renameWordbook(
  id: number,
  name: string,
  settings: AuthenticatedConnectionConfig,
) {
  const client = createWordbookClient(settings);
  const { data } = await client.put<Wordbook>(`/api/v1/wordbooks/${id}`, null, {
    params: { name },
  });
  return data;
}

export async function deleteWordbook(id: number, settings: AuthenticatedConnectionConfig) {
  const client = createWordbookClient(settings);
  await client.delete(`/api/v1/wordbooks/${id}`);
}
