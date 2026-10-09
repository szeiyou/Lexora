import {
  createAuthenticatedHttpClient,
  type AuthenticatedConnectionConfig,
} from "@/modules/auth/api/authenticated-http-client";
import type { EntryQueryResponse } from "@/modules/query/model/entry-response";
import type {
  HistoryResultType,
  HistorySummaryItem,
} from "@/modules/history/model/history-types";
import type { TextTranslationResponse } from "@/modules/translations/model/text-translation-response";

type EntryHistoryResultType = Exclude<HistoryResultType, "TEXT_TRANSLATION">;

type EntryHistoryDetail = HistorySummaryItem & {
  resultType: EntryHistoryResultType;
  response: EntryQueryResponse;
};

type TextTranslationHistoryDetail = HistorySummaryItem & {
  resultType: "TEXT_TRANSLATION";
  response: TextTranslationResponse;
};

export type HistoryDetail = EntryHistoryDetail | TextTranslationHistoryDetail;

export async function fetchHistoryDetail(
  historyKey: string,
  settings: AuthenticatedConnectionConfig,
) {
  const client = createAuthenticatedHttpClient(settings);
  const { data } = await client.get<HistoryDetail>(`/api/v1/history/${historyKey}`);
  return data;
}
