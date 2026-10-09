import { useQuery } from "@tanstack/react-query";
import type { EntryResultType } from "@/modules/query/model/entry-response";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import type { SettingsValues } from "@/modules/settings/model/settings.schema";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import {
  fetchHistoryPage,
  getHistorySummaryKey,
  type HistorySummaryItem,
} from "@/modules/history/api/fetch-history-page";

export type RecentSearchItem = {
  historyKey: string;
  query: string;
  resultType: EntryResultType;
  summary: string;
};

const RECENT_SEARCH_LIMIT = 5;
const HISTORY_PAGE_SIZE = 5;

function isEntryHistorySummary(
  item: HistorySummaryItem,
): item is HistorySummaryItem & { resultType: EntryResultType } {
  return (
    item.resultType === "ENGLISH_WORD" ||
    item.resultType === "ZH_TO_EN_TERM" ||
    item.resultType === "SENTENCE_TRANSLATION"
  );
}

async function fetchRecentSearches() {
  const settings = useSettingsStore.getState().values;
  const recentSearches: RecentSearchItem[] = [];
  let page = 1;
  let hasMore = true;

  while (recentSearches.length < RECENT_SEARCH_LIMIT && hasMore) {
    let data;
    try {
      data = await fetchHistoryPage(page, HISTORY_PAGE_SIZE, settings);
    } catch (error) {
      if (recentSearches.length > 0) {
        break;
      }
      throw error;
    }
    const entryItems = data.content.filter(isEntryHistorySummary);

    for (const item of entryItems) {
      recentSearches.push({
        historyKey: getHistorySummaryKey(item),
        query: item.query,
        resultType: item.resultType,
        summary: item.summary,
      });
      if (recentSearches.length >= RECENT_SEARCH_LIMIT) {
        break;
      }
    }

    hasMore = data.content.length === HISTORY_PAGE_SIZE;
    page += 1;
  }

  return recentSearches;
}

export function getRecentSearchesQueryKey(
  settings: Pick<SettingsValues, "baseUrl">,
  userId: number,
) {
  return ["recent-searches", settings.baseUrl, userId] as const;
}

export function useRecentSearchesQuery() {
  const isHydrated = useSettingsStore((state) => state.isHydrated);
  const settings = useSettingsStore((state) => state.values);
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const canQuery = Boolean(settings.baseUrl && authStatus === "authenticated" && authUser);

  return useQuery({
    queryKey: authUser
      ? getRecentSearchesQueryKey(settings, authUser.id)
      : (["recent-searches", "anonymous"] as const),
    queryFn: fetchRecentSearches,
    enabled: isHydrated && canQuery,
  });
}
