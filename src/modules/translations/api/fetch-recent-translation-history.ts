import { fetchHistoryPage } from "@/modules/history/api/fetch-history-page";
import type { HistorySummaryItem } from "@/modules/history/api/fetch-history-page";
import type { SettingsValues } from "@/modules/settings/model/settings.schema";

const RECENT_TRANSLATION_HISTORY_SIZE = 5;
const HISTORY_PAGE_SIZE = 5;

export type RecentTranslationHistoryItem = HistorySummaryItem & {
  resultType: "TEXT_TRANSLATION";
};

function isTextTranslationHistory(
  item: HistorySummaryItem,
): item is RecentTranslationHistoryItem {
  return item.resultType === "TEXT_TRANSLATION";
}

export function getRecentTranslationHistoryQueryKey(
  settings: Pick<SettingsValues, "baseUrl">,
  userId: number,
) {
  return ["history", settings.baseUrl, userId, "translations-recent"] as const;
}

export async function fetchRecentTranslationHistory(settings: SettingsValues) {
  const recentTranslations: RecentTranslationHistoryItem[] = [];
  let page = 1;
  let hasMore = true;

  while (recentTranslations.length < RECENT_TRANSLATION_HISTORY_SIZE && hasMore) {
    let data;
    try {
      data = await fetchHistoryPage(page, HISTORY_PAGE_SIZE, settings);
    } catch (error) {
      if (recentTranslations.length > 0) {
        break;
      }
      throw error;
    }

    for (const item of data.content.filter(isTextTranslationHistory)) {
      recentTranslations.push(item);
      if (recentTranslations.length >= RECENT_TRANSLATION_HISTORY_SIZE) {
        break;
      }
    }

    hasMore = data.content.length === HISTORY_PAGE_SIZE;
    page += 1;
  }

  return recentTranslations;
}
