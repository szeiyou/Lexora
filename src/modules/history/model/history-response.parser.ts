import { mapEntryResponse } from "@/modules/query/model/entry-result-mapper";
import type { EntryQueryResponse } from "@/modules/query/model/entry-response";

export function parseHistoryResponseJson(responseJson: string) {
  try {
    const parsed = JSON.parse(responseJson) as EntryQueryResponse;
    return { ok: true, value: mapEntryResponse(parsed) } as const;
  } catch {
    return { ok: false, reason: "history-parse-failed" } as const;
  }
}
