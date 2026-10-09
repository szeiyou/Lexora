import { create } from "zustand";
import type { QueryParams } from "@/modules/query/api/fetch-entry";
import type { EntryResultType } from "@/modules/query/model/entry-response";
import type { EntryResultViewModel } from "@/modules/query/model/entry-result-view-model";
import { getQueryValidationMessage } from "@/modules/query/model/query-input-validation";

export type ForcedResultType = EntryResultType | "AUTO";

type QueryStore = {
  requestIdCounter: number;
  draftQuery: string;
  forcedType: ForcedResultType;
  activeQuery: (QueryParams & { requestId: number }) | null;
  restoredResult: EntryResultViewModel | null;
  reset: () => void;
  setDraftQuery: (value: string) => void;
  setForcedType: (value: ForcedResultType) => void;
  fillDraftFromRecordedQuery: (query: string, resultType: EntryResultType) => void;
  submitDraft: () => boolean;
  reopenRecentSearch: (query: string, resultType: EntryResultType) => void;
  restoreHistoryResult: (
    query: string,
    resultType: EntryResultType,
    result: EntryResultViewModel,
  ) => void;
};

function toQueryParams(draftQuery: string, forcedType: ForcedResultType): QueryParams {
  const query = draftQuery.trim();
  return {
    q: query,
    type: forcedType === "AUTO" ? undefined : forcedType,
  };
}

function createInitialState() {
  return {
    requestIdCounter: 0,
    draftQuery: "",
    forcedType: "AUTO" as const,
    activeQuery: null,
    restoredResult: null,
  };
}

export const useQueryStore = create<QueryStore>((set, get) => ({
  ...createInitialState(),
  reset: () => {
    set(createInitialState());
  },
  setDraftQuery: (value) => {
    set({ draftQuery: value });
  },
  setForcedType: (value) => {
    set({ forcedType: value });
  },
  fillDraftFromRecordedQuery: (query, resultType) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    set({
      draftQuery: trimmed,
      forcedType: resultType,
    });
  },
  submitDraft: () => {
    const { draftQuery, forcedType, requestIdCounter } = get();
    const trimmed = draftQuery.trim();
    if (!trimmed || getQueryValidationMessage(trimmed)) {
      return false;
    }

    const nextRequestId = requestIdCounter + 1;
    set({
      requestIdCounter: nextRequestId,
      draftQuery: trimmed,
      restoredResult: null,
      activeQuery: {
        ...toQueryParams(trimmed, forcedType),
        requestId: nextRequestId,
      },
    });
    return true;
  },
  reopenRecentSearch: (query, resultType) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const nextRequestId = get().requestIdCounter + 1;
    set({
      requestIdCounter: nextRequestId,
      draftQuery: trimmed,
      forcedType: resultType,
      restoredResult: null,
      activeQuery: {
        q: trimmed,
        type: resultType,
        requestId: nextRequestId,
      },
    });
  },
  restoreHistoryResult: (query, resultType, result) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    set({
      draftQuery: trimmed,
      forcedType: resultType,
      activeQuery: null,
      restoredResult: result,
    });
  },
}));
