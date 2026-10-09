import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { fetchHistoryDetail } from "@/modules/history/api/fetch-history-detail";
import {
  fetchHistoryPage,
  getHistorySummaryKey,
  type HistorySummaryItem,
} from "@/modules/history/api/fetch-history-page";
import { parseHistoryDetail } from "@/modules/history/model/history-restore";
import { HistoryList } from "@/modules/history/ui/history-list";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { StatusView } from "@/shared/ui/status-view";

const PAGE_SIZE = 20;

export function HistoryScreen() {
  const navigate = useNavigate();
  const isHydrated = useSettingsStore((state) => state.isHydrated);
  const settings = useSettingsStore((state) => state.values);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const protectedStateVersion = useAuthStore((state) => state.protectedStateVersion);
  const [page, setPage] = useState(1);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [recoverableError, setRecoverableError] = useState<string | null>(null);
  const lastProtectedStateVersionRef = useRef(protectedStateVersion);
  const canQuery = Boolean(settings.baseUrl && authStatus === "authenticated" && authUser);

  const historyQuery = useQuery({
    queryKey: ["history", settings.baseUrl, authUser?.id ?? "anonymous", page],
    queryFn: () => fetchHistoryPage(page, PAGE_SIZE, settings),
    enabled: isHydrated && canQuery,
  });

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
    setPage(1);
    setOpeningKey(null);
    setRecoverableError(null);
  }, [protectedStateVersion]);

  const handleOpenHistory = async (item: HistorySummaryItem) => {
    if (!item.historyKey) {
      setRecoverableError("这条记录无法重新打开");
      setOpeningKey(null);
      return;
    }

    setRecoverableError(null);
    setOpeningKey(getHistorySummaryKey(item));

    try {
      const detail = await fetchHistoryDetail(item.historyKey, settings);
      const parsed = parseHistoryDetail(detail);

      if (!parsed.ok) {
        setRecoverableError("这条记录无法重新打开");
        return;
      }

      navigate(parsed.value.destination, {
        state: {
          restoredHistory: parsed.value,
        },
      });
    } catch {
      setRecoverableError("打开历史记录失败，请稍后重试。");
    } finally {
      setOpeningKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">历史</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">最近查过的内容</p>
      </header>

      {!isHydrated ? <StatusView title="正在加载设置" state="loading" /> : null}
      {isHydrated && !settings.baseUrl ? <StatusView title="请先完成设置" /> : null}
      {isHydrated && settings.baseUrl && !canQuery ? (
        <StatusView
          title="请先完成设置并登录"
          description="登录后即可使用查词、历史和单词本。"
        />
      ) : null}
      {recoverableError ? (
        <Alert variant="destructive">
          <AlertTitle>无法打开</AlertTitle>
          <AlertDescription>{recoverableError}</AlertDescription>
        </Alert>
      ) : null}
      {isHydrated && canQuery ? (
        <Card>
          <CardHeader className="space-y-2 border-b border-[hsl(var(--border))]/80 pb-4">
            <CardTitle>最近搜索</CardTitle>
            <CardDescription>查看并重新打开之前的搜索</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {historyQuery.isLoading ? <StatusView title="正在加载历史" state="loading" /> : null}
            {historyQuery.error ? <StatusView title="历史加载失败" state="error" /> : null}
            {!historyQuery.isLoading && !historyQuery.error ? (
              <HistoryList
                items={historyQuery.data?.content ?? []}
                page={page}
                canPreviousPage={page > 1}
                canNextPage={(historyQuery.data?.content ?? []).length === PAGE_SIZE}
                openingKey={openingKey}
                onOpen={handleOpenHistory}
                onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
                onNextPage={() => setPage((current) => current + 1)}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
