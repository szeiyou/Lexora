import {
  getHistorySummaryKey,
  type HistorySummaryItem,
} from "@/modules/history/model/history-types";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

type HistoryListProps = {
  items: HistorySummaryItem[];
  page: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  openingKey: string | null;
  onOpen: (item: HistorySummaryItem) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function HistoryList({
  items,
  page,
  canPreviousPage,
  canNextPage,
  openingKey,
  onOpen,
  onPreviousPage,
  onNextPage,
}: HistoryListProps) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed bg-[hsl(var(--surface)/0.35)] shadow-none">
        <CardContent className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          暂无历史记录。
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-label="历史记录列表" className="space-y-4">
      <ul className="grid gap-3 p-0" style={{ listStyle: "none" }}>
        {items.map((item) => {
          const itemKey = getHistorySummaryKey(item);

          return (
            <li key={itemKey} className="min-w-0">
              <Card className="min-w-0 overflow-hidden border-[hsl(var(--border))]/80 bg-[hsl(var(--surface)/0.55)] shadow-none">
                <CardContent className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 overflow-hidden space-y-1">
                    <p className="truncate text-base font-medium text-[hsl(var(--foreground))]">{item.query}</p>
                    <p className="truncate text-sm text-[hsl(var(--muted-foreground))]">{item.summary}</p>
                  </div>
                  <Button
                    aria-label={`打开历史记录 ${item.query}`}
                    disabled={openingKey === itemKey}
                    onClick={() => onOpen(item)}
                    variant="outline"
                    className="shrink-0 self-start sm:self-center"
                  >
                    {openingKey === itemKey ? "打开中..." : "打开"}
                  </Button>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[hsl(var(--border))]/80 bg-[hsl(var(--surface)/0.4)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-[hsl(var(--muted-foreground))]">第 {page} 页</span>
        <div className="flex items-center gap-2">
          <Button onClick={onPreviousPage} disabled={!canPreviousPage} variant="outline">
            上一页
          </Button>
          <Button onClick={onNextPage} disabled={!canNextPage} variant="outline">
            下一页
          </Button>
        </div>
      </div>
    </section>
  );
}
