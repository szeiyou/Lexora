import { Languages } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { fetchHistoryDetail } from "@/modules/history/api/fetch-history-detail";
import {
  type HistoryLocationState,
  parseHistoryDetail,
} from "@/modules/history/model/history-restore";
import {
  fetchRecentTranslationHistory,
  getRecentTranslationHistoryQueryKey,
  type RecentTranslationHistoryItem,
} from "@/modules/translations/api/fetch-recent-translation-history";
import { fetchTextTranslation } from "@/modules/translations/api/fetch-text-translation";
import {
  getTranslationDirectionFromLanguages,
  resolveTranslationLanguages,
  TRANSLATION_DIRECTION_OPTIONS,
  type TranslationDirection,
} from "@/modules/translations/model/translation-direction";
import type { TextTranslationResultViewModel } from "@/modules/translations/model/text-translation-result-view-model";
import { getTextTranslationValidationMessage } from "@/modules/translations/model/text-translation-validation";
import { RecentTranslationList } from "@/modules/translations/ui/recent-translation-list";
import { TextTranslationResult } from "@/modules/translations/ui/text-translation-result";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { StatusView } from "@/shared/ui/status-view";
import { Textarea } from "@/shared/ui/textarea";

function isTranslationRestore(
  restoredHistory: HistoryLocationState["restoredHistory"],
): restoredHistory is NonNullable<HistoryLocationState["restoredHistory"]> & {
  resultType: "TEXT_TRANSLATION";
  restoredResult: TextTranslationResultViewModel;
} {
  return (
    restoredHistory?.resultType === "TEXT_TRANSLATION" &&
    restoredHistory.restoredResult?.kind === "text-translation"
  );
}

function getTranslationRestoreFromLocationState(locationState: unknown) {
  const restoredHistory = (locationState as HistoryLocationState | null)?.restoredHistory;
  return isTranslationRestore(restoredHistory) ? restoredHistory : null;
}

export function TranslationsScreen() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isHydrated = useSettingsStore((state) => state.isHydrated);
  const settings = useSettingsStore((state) => state.values);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const protectedStateVersion = useAuthStore((state) => state.protectedStateVersion);
  const initialRestore = getTranslationRestoreFromLocationState(location.state);

  const [text, setText] = useState(initialRestore?.restoredResult.text ?? "");
  const [translationDirection, setTranslationDirection] = useState<TranslationDirection>(
    initialRestore
      ? getTranslationDirectionFromLanguages(
          initialRestore.restoredResult.sourceLanguage,
          initialRestore.restoredResult.targetLanguage,
        )
      : "AUTO",
  );
  const [currentResult, setCurrentResult] = useState<TextTranslationResultViewModel | null>(
    initialRestore?.restoredResult ?? null,
  );
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [historyRestoreError, setHistoryRestoreError] = useState<string | null>(null);
  const [openingHistoryKey, setOpeningHistoryKey] = useState<string | null>(null);
  const lastProtectedStateVersionRef = useRef(protectedStateVersion);
  const lastAppliedRestoreRef = useRef<string | null>(
    initialRestore ? `${location.key}:${initialRestore.historyKey}` : null,
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
    lastAppliedRestoreRef.current = null;
    setText("");
    setTranslationDirection("AUTO");
    setCurrentResult(null);
    setSubmissionError(null);
    setHistoryRestoreError(null);
    setOpeningHistoryKey(null);
  }, [protectedStateVersion]);

  const canQuery = Boolean(settings.baseUrl && authStatus === "authenticated" && authUser);

  const recentHistoryQuery = useQuery({
    queryKey: authUser
      ? getRecentTranslationHistoryQueryKey(settings, authUser.id)
      : (["history", "anonymous", "translations-recent"] as const),
    queryFn: () => fetchRecentTranslationHistory(settings),
    enabled: isHydrated && canQuery,
  });

  const requestLanguages = useMemo(
    () => resolveTranslationLanguages({ direction: translationDirection, text }),
    [text, translationDirection],
  );

  const applyRestoredResult = (result: TextTranslationResultViewModel) => {
    setText(result.text);
    setTranslationDirection(
      getTranslationDirectionFromLanguages(result.sourceLanguage, result.targetLanguage),
    );
    setCurrentResult(result);
    setSubmissionError(null);
    setHistoryRestoreError(null);
  };

  useEffect(() => {
    const restoredHistory = getTranslationRestoreFromLocationState(location.state);

    if (!restoredHistory) {
      return;
    }

    const restoreKey = `${location.key}:${restoredHistory.historyKey}`;
    if (lastAppliedRestoreRef.current === restoreKey) {
      return;
    }

    lastAppliedRestoreRef.current = restoreKey;
    applyRestoredResult(restoredHistory.restoredResult);
  }, [location.key, location.state]);

  const validationMessage = useMemo(
    () =>
      getTextTranslationValidationMessage({
        text,
        sourceLanguage: requestLanguages.sourceLanguage,
        targetLanguage: requestLanguages.targetLanguage,
      }),
    [requestLanguages.sourceLanguage, requestLanguages.targetLanguage, text],
  );

  const translationMutation = useMutation({
    mutationFn: () =>
      fetchTextTranslation(
        {
          text: text.trim(),
          sourceLanguage: requestLanguages.sourceLanguage,
          targetLanguage: requestLanguages.targetLanguage,
        },
        settings,
      ),
    onSuccess: (nextResult) => {
      setCurrentResult(nextResult);
      setSubmissionError(null);
      void queryClient.invalidateQueries({
        queryKey: authUser
          ? (["history", settings.baseUrl, authUser.id] as const)
          : (["history", "anonymous"] as const),
      });
    },
    onError: () => {
      setSubmissionError("翻译失败，当前结果已保留。");
    },
  });

  const handleSubmit = () => {
    setHistoryRestoreError(null);

    if (validationMessage) {
      setSubmissionError(validationMessage);
      return;
    }

    setSubmissionError(null);
    translationMutation.mutate();
  };

  const handleSelectRecentHistory = async (item: RecentTranslationHistoryItem) => {
    setOpeningHistoryKey(item.historyKey);
    setHistoryRestoreError(null);

    try {
      const detail = await fetchHistoryDetail(item.historyKey, settings);
      const parsed = parseHistoryDetail(detail);

      if (
        !parsed.ok ||
        parsed.value.destination !== "/translations" ||
        parsed.value.resultType !== "TEXT_TRANSLATION"
      ) {
        setHistoryRestoreError("这条翻译记录无法恢复。");
        return;
      }

      applyRestoredResult(parsed.value.restoredResult);
    } catch {
      setHistoryRestoreError("恢复最近查询失败，请稍后重试。");
    } finally {
      setOpeningHistoryKey(null);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <header className="px-1 pt-1">
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
          翻译
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          输入短文或短句，查看分段译文、关键词和备注。
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
          description="填写服务信息后即可开始翻译"
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
        <div className="space-y-5">
          <div
            data-testid="translations-layout"
            className="grid gap-5 min-[900px]:grid-cols-[minmax(0,1.65fr)_minmax(13.5rem,0.8fr)]"
          >
            <Card className="border-[hsl(var(--border))]/80 bg-[hsl(var(--surface))/0.55] shadow-none">
              <CardHeader className="border-b border-[hsl(var(--border))]/70 pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Languages className="size-4" aria-hidden="true" />
                  翻译工作区
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-[hsl(var(--foreground))]"
                      htmlFor="translation-direction"
                    >
                      翻译方向
                    </label>
                    <Select
                      value={translationDirection}
                      onValueChange={(value) => setTranslationDirection(value as TranslationDirection)}
                    >
                      <SelectTrigger id="translation-direction" aria-label="翻译方向">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSLATION_DIRECTION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:self-end">
                    <Button
                      className="w-full md:min-w-28"
                      onClick={handleSubmit}
                      disabled={translationMutation.isPending}
                    >
                      {translationMutation.isPending ? "翻译中..." : "翻译"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]" htmlFor="translation-text">
                    输入文本
                  </label>
                  <Textarea
                    id="translation-text"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="输入需要翻译的短文或短句"
                    className="min-h-64 resize-y"
                  />
                </div>
              </CardContent>
            </Card>

            <RecentTranslationList
              items={recentHistoryQuery.data ?? []}
              isLoading={recentHistoryQuery.isLoading}
              isError={Boolean(recentHistoryQuery.error)}
              openingHistoryKey={openingHistoryKey}
              onSelect={handleSelectRecentHistory}
            />
          </div>

          {submissionError ? (
            <Alert variant="destructive">
              <AlertTitle>无法继续</AlertTitle>
              <AlertDescription>{submissionError}</AlertDescription>
            </Alert>
          ) : null}

          {historyRestoreError ? (
            <Alert variant="destructive">
              <AlertTitle>无法恢复</AlertTitle>
              <AlertDescription>{historyRestoreError}</AlertDescription>
            </Alert>
          ) : null}

          {currentResult ? <TextTranslationResult result={currentResult} /> : null}
        </div>
      ) : null}
    </div>
  );
}
