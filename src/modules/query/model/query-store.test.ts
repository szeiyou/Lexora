import type { EntryResultType } from "./entry-response";
import { useQueryStore } from "./query-store";

type QueryStoreWithDraftOnly = ReturnType<typeof useQueryStore.getState> & {
  fillDraftFromRecordedQuery: (query: string, resultType: EntryResultType) => void;
};

beforeEach(() => {
  useQueryStore.setState(useQueryStore.getInitialState());
});

it("fills draft state from a recorded query without starting a request", () => {
  const queryStore = useQueryStore.getState() as QueryStoreWithDraftOnly;
  queryStore.setDraftQuery("phenomenon");
  queryStore.submitDraft();

  const beforeState = useQueryStore.getState();
  expect(beforeState.activeQuery).not.toBeNull();
  expect(beforeState.requestIdCounter).toBeGreaterThan(0);

  const beforeRequestId = beforeState.activeQuery?.requestId;
  const beforeQuery = beforeState.activeQuery?.q;
  const beforeType = beforeState.activeQuery?.type;
  const beforeRequestIdCounter = beforeState.requestIdCounter;

  queryStore.fillDraftFromRecordedQuery("visible", "ENGLISH_WORD");

  const state = useQueryStore.getState();
  expect(state.draftQuery).toBe("visible");
  expect(state.forcedType).toBe("ENGLISH_WORD");
  expect(state.activeQuery?.requestId).toBe(beforeRequestId);
  expect(state.activeQuery?.q).toBe(beforeQuery);
  expect(state.activeQuery?.type).toBe(beforeType);
  expect(state.requestIdCounter).toBe(beforeRequestIdCounter);
});

it("does not submit an overlong query", () => {
  const queryStore = useQueryStore.getState();
  queryStore.setDraftQuery("a".repeat(301));

  const submitted = queryStore.submitDraft();
  const state = useQueryStore.getState();

  expect(submitted).toBe(false);
  expect(state.activeQuery).toBeNull();
  expect(state.requestIdCounter).toBe(0);
});
