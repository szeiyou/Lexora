import { Loader2 } from "lucide-react";
import type { RecentTranslationHistoryItem } from "@/modules/translations/api/fetch-recent-translation-history";
import { cn } from "@/shared/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { StatusView } from "@/shared/ui/status-view";

type RecentTranslationListProps = {
  items: RecentTranslationHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  openingHistoryKey: string | null;
  onSelect: (item: RecentTranslationHistoryItem) => void;
};

export function RecentTranslationList({
  items,
  isLoading,
  isError,
  openingHistoryKey,
  onSelect,
}: RecentTranslationListProps) {
  return (
    <section aria-label="最近查询">
      <Card className="h-full border-[hsl(var(--border))]/80 bg-[hsl(var(--surface))/0.55] shadow-none">
        <CardHeader className="border-b border-[hsl(var(--border))]/70 pb-4">
          <CardTitle className="text-base">最近查询</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <StatusView title="正在加载最近查询" state="loading" />
            </div>
          ) : null}

          {!isLoading && isError ? (
            <div className="p-4">
              <StatusView title="最近查询加载失败" state="error" />
            </div>
          ) : null}

          {!isLoading && !isError && items.length === 0 ? (
            <div className="p-4">
              <StatusView title="暂无最近查询" />
            </div>
          ) : null}

          {!isLoading && !isError && items.length > 0 ? (
            <div className="max-h-[26rem] overflow-y-auto">
              <ul className="divide-y divide-[hsl(var(--border))]/60">
                {items.map((item) => {
                  const isOpening = openingHistoryKey === item.historyKey;

                  return (
                    <li key={item.historyKey}>
                      <button
                        type="button"
                        onClick={() => onSelect(item)}
                        disabled={isOpening}
                        className={cn(
                          "flex w-full cursor-pointer flex-col gap-2 px-4 py-4 text-left transition-[background-color,color] duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-reduce:transition-none hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-70",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="line-clamp-2 text-sm font-medium text-[hsl(var(--foreground))]">
                            {item.query}
                          </p>
                          {isOpening ? (
                            <Loader2
                              className="mt-0.5 size-4 shrink-0 animate-spin text-[hsl(var(--muted-foreground))]"
                              aria-hidden="true"
                            />
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-sm text-[hsl(var(--muted-foreground))]">
                          {item.summary}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
