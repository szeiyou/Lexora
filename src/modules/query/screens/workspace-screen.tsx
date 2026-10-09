import { SearchCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import type { HistoryLocationState } from "@/modules/history/model/history-restore";
import { fetchEntry } from "@/modules/query/api/fetch-entry";
import { recordEntryQueryFailure } from "@/modules/query/api/query-failure-log";
import { refreshEntry } from "@/modules/query/api/refresh-entry";
import { getQueryValidationMessage } from "@/modules/query/model/query-input-validation";
import { useQueryStore } from "@/modules/query/model/query-store";
import { QueryToolbar } from "@/modules/query/ui/query-toolbar";
import { ResultSwitch } from "@/modules/query/ui/result-switch";
import {
  getRecentSearchesQueryKey,
  useRecentSearchesQuery,
} from "@/modules/recent-searches/api/fetch-recent-searches";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { isRequestTimeoutError } from "@/shared/api/api-error-utils";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { StatusView } from "@/shared/ui/status-view";

function getEntryQueryErrorMessage(error: unknown) {
  if (isRequestTimeoutError(error)) {
    return "请求超时，请稍后重试";
  }

  return "请检查连接后重试";
}

type WordbookWordLookupLocationState = {
  wordbookWordLookup?: {
    query?: string;
  };
};

type WorkspaceLocationState = HistoryLocationState & WordbookWordLookupLocationState;

export function WorkspaceScreen() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isHydrated = useSettingsStore((state) => state.isHydrated);
  const settings = useSettingsStore((state) => state.values);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const protectedStateVersion = useAuthStore((state) => state.protectedStateVersion);

  const draftQuery = useQueryStore((state) => state.draftQuery);
  const forcedType = useQueryStore((state) => state.forcedType);
  const activeQuery = useQueryStore((state) => state.activeQuery);
  const restoredResult = useQueryStore((state) => state.restoredResult);
  const setDraftQuery = useQueryStore((state) => state.setDraftQuery);
  const setForcedType = useQueryStore((state) => state.setForcedType);
  const fillDraftFromRecordedQuery = useQueryStore((state) => state.fillDraftFromRecordedQuery);
  const submitDraft = useQueryStore((state) => state.submitDraft);
  const reopenRecentSearch = useQueryStore((state) => state.reopenRecentSearch);
  const restoreHistoryResult = useQueryStore((state) => state.restoreHistoryResult);

  const [feedback, setFeedback] = useState<string | null>(null);
  const lastProtectedStateVersionRef = useRef(protectedStateVersion);
  const lastSyncedRecentSearchRequestIdRef = useRef<number | null>(null);
  const lastLoggedEntryFailureRequestIdRef = useRef<number | null>(null);
  const lastAppliedRestoreRef = useRef<string | null>(null);
  const lastAppliedWordbookLookupRef = useRef<string | null>(null);
  const recentSearchesQueryKey = useMemo(
    () =>
      authUser
        ? getRecentSearchesQueryKey(settings, authUser.id)
        : (["recent-searches", "anonymous"] as const),
    [authUser, settings.baseUrl],
  );

  useEffect(() => {
    if (!isHydrated) {
      void hydrate();
    }
  }, [hydrate, isHydrated]);

  useEffect(() => {
    if (lastProtectedStateVersionRef.current === protectedStateVersion) {
      return;
    }

    lastProtectedStateVersionRef.current = protectedStateVersion;
    setFeedback(null);
    lastSyncedRecentSearchRequestIdRef.current = null;
    lastLoggedEntryFailureRequestIdRef.current = null;
    lastAppliedRestoreRef.current = null;
    lastAppliedWordbookLookupRef.current = null;
  }, [protectedStateVersion]);

  useEffect(() => {
    const state = location.state as WorkspaceLocationState | null;
    const restoredHistory = state?.restoredHistory;

    if (
      !restoredHistory ||
      restoredHistory.destination !== "/"
    ) {
      return;
    }

    const restoreKey = `${location.key}:${restoredHistory.historyKey}`;
    if (lastAppliedRestoreRef.current === restoreKey) {
      return;
    }

    lastAppliedRestoreRef.current = restoreKey;
    restoreHistoryResult(
      restoredHistory.restoredResult.query,
      restoredHistory.resultType,
      restoredHistory.restoredResult,
    );
    setFeedback(null);
  }, [location.key, location.state, restoreHistoryResult]);

  useEffect(() => {
    const state = location.state as WorkspaceLocationState | null;
    const query = state?.wordbookWordLookup?.query?.trim();

    if (!query) {
      return;
    }

    const lookupKey = `${location.key}:${query}`;
    if (lastAppliedWordbookLookupRef.current === lookupKey) {
      return;
    }

    lastAppliedWordbookLookupRef.current = lookupKey;
    reopenRecentSearch(query, "ENGLISH_WORD");
    setFeedback(null);
  }, [location.key, location.state, reopenRecentSearch]);

  const canQuery = Boolean(settings.baseUrl && authStatus === "authenticated" && authUser);
  const entryQueryKey = useMemo(
    () =>
      [
        "entry",
        settings.baseUrl,
        authUser?.id ?? "anonymous",
        activeQuery?.requestId,
        activeQuery?.q,
        activeQuery?.type,
      ] as const,
    [activeQuery?.q, activeQuery?.requestId, activeQuery?.type, authUser?.id, settings.baseUrl],
  );
  const queryValidationMessage = useMemo(() => getQueryValidationMessage(draftQuery), [draftQuery]);

  const entryQuery = useQuery({
    queryKey: entryQueryKey,
    queryFn: () => fetchEntry(activeQuery!, settings),
    enabled: canQuery && activeQuery !== null,
  });
  const recentSearchesQuery = useRecentSearchesQuery();

  const refreshMutation = useMutation({
    mutationFn: () => refreshEntry(activeQuery!, settings),
    onSuccess: (nextResult) => {
      setFeedback("结果已更新");
      queryClient.setQueryData(entryQueryKey, nextResult);
      void queryClient.invalidateQueries({ queryKey: recentSearchesQueryKey });
    },
  });

  useEffect(() => {
    if (!activeQuery || !entryQuery.isSuccess) {
      return;
    }

    if (lastSyncedRecentSearchRequestIdRef.current === activeQuery.requestId) {
      return;
    }

    lastSyncedRecentSearchRequestIdRef.current = activeQuery.requestId;
    void queryClient.invalidateQueries({ queryKey: recentSearchesQueryKey });
  }, [activeQuery, entryQuery.isSuccess, queryClient, recentSearchesQueryKey]);

  useEffect(() => {
    if (!activeQuery || !entryQuery.error) {
      return;
    }

    if (lastLoggedEntryFailureRequestIdRef.current === activeQuery.requestId) {
      return;
    }

    lastLoggedEntryFailureRequestIdRef.current = activeQuery.requestId;
    void recordEntryQueryFailure({
      query: activeQuery,
      baseUrl: settings.baseUrl,
      requestTimeoutMs: settings.requestTimeoutMs,
      error: entryQuery.error,
    });
  }, [activeQuery, entryQuery.error, settings.baseUrl, settings.requestTimeoutMs]);

  const handleSubmit = () => {
    refreshMutation.reset();
    if (queryValidationMessage) {
      setFeedback(null);
      return;
    }
    const submitted = submitDraft();
    if (!submitted) {
      return;
    }
    setFeedback(null);
  };

  const handleRefresh = () => {
    if (!activeQuery) {
      return;
    }
    setFeedback(null);
    refreshMutation.reset();
    refreshMutation.mutate();
  };

  const currentResult = !entryQuery.error && entryQuery.data ? entryQuery.data : restoredResult;

  return (
    <div className="space-y-5 pb-10">
      <header className="px-1 pt-1">
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
          查词
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          输入单词、词组或句子
        </p>
      </header>

      {!isHydrated ? (
        <StatusView
          title="正在加载设置"
          state="loading"
          className="border-white/5 bg-[hsl(var(--surface))/0.7]"
        />
      ) : null}

      {isHydrated && !settings.baseUrl ? (
        <StatusView
          title="请先完成设置"
          description="填写服务信息后即可开始使用"
          className="border-white/5 bg-[hsl(var(--surface))/0.7]"
        />
      ) : null}

      {isHydrated && settings.baseUrl && !canQuery ? (
        <StatusView
          title="请先完成设置并登录"
          description="登录后即可使用查词、历史和单词本。"
          className="border-white/5 bg-[hsl(var(--surface))/0.7]"
        />
      ) : null}

      {isHydrated && canQuery ? (
        <div className="grid gap-5">
          <QueryToolbar
            key={lastAppliedWordbookLookupRef.current ?? "workspace-toolbar"}
            query={draftQuery}
            forcedType={forcedType}
            onQueryChange={setDraftQuery}
            onForcedTypeChange={setForcedType}
            recentSearches={recentSearchesQuery.data ?? []}
            onRecordedQueryFill={fillDraftFromRecordedQuery}
            onSubmit={handleSubmit}
            onRefresh={handleRefresh}
            canRefresh={activeQuery !== null}
            isQuerying={entryQuery.isFetching}
            isRefreshing={refreshMutation.isPending}
            queryValidationMessage={queryValidationMessage}
          />

          {entryQuery.isLoading ? (
            <StatusView
              title="正在获取结果"
              description="正在获取结果"
              state="loading"
              className="border-white/5 bg-[hsl(var(--surface))/0.72]"
            />
          ) : null}

          {entryQuery.error ? (
            <StatusView
              title="获取失败"
              description={getEntryQueryErrorMessage(entryQuery.error)}
              state="error"
              className="border-white/5"
            />
          ) : null}

          {refreshMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>刷新失败</AlertTitle>
              <AlertDescription>当前结果已保留</AlertDescription>
            </Alert>
          ) : null}

          {feedback ? (
            <Alert
              role="status"
              aria-live="polite"
              className="transition-[opacity,transform] duration-[var(--motion-base)] ease-[var(--motion-ease)] motion-reduce:transition-none"
            >
              <SearchCheck className="size-4 text-[hsl(var(--accent-foreground))]" aria-hidden="true" />
              <AlertTitle>{feedback}</AlertTitle>
              <AlertDescription />
            </Alert>
          ) : null}

          {currentResult ? <ResultSwitch result={currentResult} /> : null}
        </div>
      ) : null}
    </div>
  );
}
