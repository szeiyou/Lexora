import { mapEntryResponse } from "@/modules/query/model/entry-result-mapper";
import type { EntryResultViewModel } from "@/modules/query/model/entry-result-view-model";
import type { HistoryDetail } from "@/modules/history/api/fetch-history-detail";
import { mapTextTranslationResult } from "@/modules/translations/model/text-translation-result-mapper";
import type { TextTranslationResultViewModel } from "@/modules/translations/model/text-translation-result-view-model";

type EntryHistoryRestore = {
  destination: "/";
  historyKey: string;
  resultType: "ENGLISH_WORD" | "ZH_TO_EN_TERM" | "SENTENCE_TRANSLATION";
  restoredResult: EntryResultViewModel;
};

type TextTranslationHistoryRestore = {
  destination: "/translations";
  historyKey: string;
  resultType: "TEXT_TRANSLATION";
  restoredResult: TextTranslationResultViewModel;
};

export type HistoryRestoreResult = EntryHistoryRestore | TextTranslationHistoryRestore;

export type HistoryLocationState = {
  restoredHistory?: HistoryRestoreResult;
};

type ParseHistoryDetailResult =
  | { ok: true; value: HistoryRestoreResult }
  | { ok: false; reason: "history-parse-failed" };

export function parseHistoryDetail(detail: HistoryDetail): ParseHistoryDetailResult {
  try {
    if (detail.resultType === "TEXT_TRANSLATION") {
      return {
        ok: true,
        value: {
          destination: "/translations",
          historyKey: detail.historyKey,
          resultType: detail.resultType,
          restoredResult: mapTextTranslationResult(detail.response),
        },
      };
    }

    return {
      ok: true,
      value: {
        destination: "/",
        historyKey: detail.historyKey,
        resultType: detail.resultType,
        restoredResult: mapEntryResponse(detail.response),
      },
    };
  } catch {
    return { ok: false, reason: "history-parse-failed" };
  }
}
