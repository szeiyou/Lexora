import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { fetchWordbookWords } from "@/modules/wordbooks/api/fetch-wordbook-words";
import type { Wordbook } from "@/modules/wordbooks/model/wordbook.types";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { StatusView } from "@/shared/ui/status-view";

type WordbookDetailPaneProps = {
  wordbook: Wordbook | null;
  onOpenWord: (word: string) => void;
  onRename: () => void;
  onDelete: () => void;
};

export function WordbookDetailPane({
  wordbook,
  onOpenWord,
  onRename,
  onDelete,
}: WordbookDetailPaneProps) {
  const settings = useSettingsStore((state) => state.values);
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const wordsQuery = useQuery({
    queryKey: ["wordbook-words", settings.baseUrl, authUser?.id ?? "anonymous", wordbook?.id],
    queryFn: () => fetchWordbookWords(wordbook!.id, settings),
    enabled: Boolean(
      wordbook !== null && settings.baseUrl && authStatus === "authenticated" && authUser,
    ),
  });

  if (!wordbook) {
    return (
      <Card className="min-h-[24rem] shadow-none">
        <CardContent className="flex h-full items-center justify-center pt-6">
          <StatusView title="请选择单词本" description="从左侧列表选择一个单词本查看详情。" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-h-[24rem] shadow-none">
      <CardHeader className="flex flex-col gap-4 border-b border-[hsl(var(--border))]/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <CardTitle>{wordbook.name}</CardTitle>
          <CardDescription>查看并管理这个单词本中的词条。</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onRename} variant="outline">
            重命名
          </Button>
          <Button onClick={onDelete} variant="destructive">
            删除单词本
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {wordsQuery.isLoading ? <StatusView title="加载单词中..." state="loading" /> : null}
        {wordsQuery.error ? <StatusView title="加载单词失败" state="error" /> : null}
        {!wordsQuery.isLoading && !wordsQuery.error ? (
          wordsQuery.data && wordsQuery.data.length > 0 ? (
            <ul className="grid gap-3">
              {wordsQuery.data.map((item) => (
                <li key={item.word}>
                  <button
                    type="button"
                    aria-label={`打开单词 ${item.word} 的详情`}
                    onClick={() => onOpenWord(item.word)}
                    className="w-full cursor-pointer rounded-[var(--radius-md)] border border-[hsl(var(--border))]/70 bg-[hsl(var(--surface)/0.35)] px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--surface)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.word}</span>
                      <span className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                        {item.partOfSpeech}
                      </span>
                    </span>
                    <span className="mt-2 block text-sm text-[hsl(var(--muted-foreground))]">{item.meaning}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <StatusView title="这个单词本还没有单词。" />
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
