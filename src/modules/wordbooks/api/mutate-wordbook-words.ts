import {
  createAuthenticatedHttpClient,
  type AuthenticatedConnectionConfig,
} from "@/modules/auth/api/authenticated-http-client";

function createWordbookClient(settings: AuthenticatedConnectionConfig) {
  return createAuthenticatedHttpClient(settings);
}

export async function addWordsToWordbook(
  wordbookId: number,
  words: string[],
  settings: AuthenticatedConnectionConfig,
) {
  const client = createWordbookClient(settings);
  await client.post(`/api/v1/wordbooks/${wordbookId}/words`, words);
}

export async function removeWordsFromWordbook(
  wordbookId: number,
  words: string[],
  settings: AuthenticatedConnectionConfig,
) {
  const client = createWordbookClient(settings);
  await client.delete(`/api/v1/wordbooks/${wordbookId}/words`, { data: words });
}

export async function clearWordbook(
  wordbookId: number,
  settings: AuthenticatedConnectionConfig,
) {
  const client = createWordbookClient(settings);
  await client.delete(`/api/v1/wordbooks/${wordbookId}/words/all`);
}
