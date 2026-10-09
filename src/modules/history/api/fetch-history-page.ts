import {
  createAuthenticatedHttpClient,
  type AuthenticatedConnectionConfig,
} from "@/modules/auth/api/authenticated-http-client";
import type { HistorySummaryItem } from "@/modules/history/model/history-types";
export { getHistorySummaryKey } from "@/modules/history/model/history-types";
export type { HistorySummaryItem } from "@/modules/history/model/history-types";

export type HistoryPageResponse = {
  content: HistorySummaryItem[];
};

export async function fetchHistoryPage(
  page: number,
  size: number,
  settings: AuthenticatedConnectionConfig,
) {
  const client = createAuthenticatedHttpClient(settings);
  const { data } = await client.get<HistoryPageResponse>("/api/v1/history", {
    params: { page, size },
  });
  return data;
}
