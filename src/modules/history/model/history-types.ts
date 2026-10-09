export type HistoryResultType =
  | "ENGLISH_WORD"
  | "ZH_TO_EN_TERM"
  | "SENTENCE_TRANSLATION"
  | "TEXT_TRANSLATION";

export type JacksonTimeArray = [number, number, number, number, number, ...number[]];

export type HistorySummaryItem = {
  historyKey: string;
  query: string;
  normalizedQuery: string;
  resultType: HistoryResultType;
  summary: string;
  sourceApi: string;
  latestSearchTime?: JacksonTimeArray;
  searchCount?: number;
  searchTimes?: JacksonTimeArray[];
};

export function getHistorySummaryKey(item: Pick<HistorySummaryItem, "historyKey">) {
  return item.historyKey;
}
