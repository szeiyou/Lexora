import {
  createAuthenticatedHttpClient,
  type AuthenticatedConnectionConfig,
} from "@/modules/auth/api/authenticated-http-client";
import { mapEntryResponse } from "../model/entry-result-mapper";
import type { EntryQueryResponse, EntryResultType } from "../model/entry-response";

export type QueryParams = {
  q: string;
  type?: EntryResultType;
};

export async function fetchEntry(
  params: QueryParams,
  settings: AuthenticatedConnectionConfig,
) {
  const client = createAuthenticatedHttpClient(settings);
  const { data } = await client.get<EntryQueryResponse>("/api/v1/entries", { params });
  return mapEntryResponse(data);
}
