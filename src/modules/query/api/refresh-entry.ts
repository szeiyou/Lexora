import {
  createAuthenticatedHttpClient,
  type AuthenticatedConnectionConfig,
} from "@/modules/auth/api/authenticated-http-client";
import { mapEntryResponse } from "../model/entry-result-mapper";
import type { EntryQueryResponse } from "../model/entry-response";
import type { QueryParams } from "./fetch-entry";

export async function refreshEntry(
  params: QueryParams,
  settings: AuthenticatedConnectionConfig,
) {
  const client = createAuthenticatedHttpClient(settings);
  const { data } = await client.post<EntryQueryResponse>("/api/v1/entries/refresh", null, {
    params,
  });
  return mapEntryResponse(data);
}
