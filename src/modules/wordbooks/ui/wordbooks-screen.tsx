import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { createWordbook, deleteWordbook, renameWordbook } from "@/modules/wordbooks/api/mutate-wordbooks";
import { fetchWordbooks } from "@/modules/wordbooks/api/fetch-wordbooks";
import type { Wordbook } from "@/modules/wordbooks/model/wordbook.types";
import { WordbookDetailPane } from "@/modules/wordbooks/ui/wordbook-detail-pane";
import { WordbookEditorDialog } from "@/modules/wordbooks/ui/wordbook-editor-dialog";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { StatusView } from "@/shared/ui/status-view";

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "rename"; wordbook: Wordbook };

export function WordbooksScreen() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isHydrated = useSettingsStore((state) => state.isHydrated);
  const settings = useSettingsStore((state) => state.values);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const protectedStateVersion = useAuthStore((state) => state.protectedStateVersion);
  const [selectedWordbookId, setSelectedWordbookId] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({ mode: "closed" });
  const [pendingDeleteWordbook, setPendingDeleteWordbook] = useState<Wordbook | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const lastProtectedStateVersionRef = useRef(protectedStateVersion);

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
    setSelectedWordbookId(null);
    setEditorState({ mode: "closed" });
    setPendingDeleteWordbook(null);
    setDeleteErrorMessage(null);
    setSaveErrorMessage(null);
  }, [protectedStateVersion]);

  const canQuery = Boolean(settings.baseUrl && authStatus === "authenticated" && authUser);
  const wordbooksQueryKey = useMemo(
    () => ["wordbooks", settings.baseUrl, authUser?.id ?? "anonymous"] as const,
    [authUser?.id, settings.baseUrl],
  );

  const wordbooksQuery = useQuery({
    queryKey: wordbooksQueryKey,
    queryFn: () => fetchWordbooks(settings),
    enabled: isHydrated && canQuery,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createWordbook(name, settings),
    onSuccess: (created) => {
      queryClient.setQueryData<Wordbook[]>(wordbooksQueryKey, (current = []) => [...current, created]);
      setSelectedWordbookId(created.id);
      setSaveErrorMessage(null);
      setEditorState({ mode: "closed" });
    },
    onError: () => {
      setSaveErrorMessage("保存失败，请稍后重试。");
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameWordbook(id, name, settings),
    onSuccess: (updated) => {
      queryClient.setQueryData<Wordbook[]>(
        wordbooksQueryKey,
        (current = []) => current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSaveErrorMessage(null);
      setEditorState({ mode: "closed" });
    },
    onError: () => {
      setSaveErrorMessage("保存失败，请稍后重试。");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteWordbook(id, settings),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Wordbook[]>(
        wordbooksQueryKey,
        (current = []) => current.filter((item) => item.id !== deletedId),
      );
      setSelectedWordbookId((current) => (current === deletedId ? null : current));
      setPendingDeleteWordbook(null);
      setDeleteErrorMessage(null);
    },
    onError: () => {
      setDeleteErrorMessage("删除失败，请稍后重试。");
    },
  });

  const selectedWordbook =
    wordbooksQuery.data?.find((item) => item.id === selectedWordbookId) ?? null;

  const handleOpenWord = (word: string) => {
    const query = word.trim();

    if (!query) {
      return;
    }

    navigate("/", {
      state: {
        wordbookWordLookup: {
          query,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">单词本</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            收藏并整理你想记住的词
          </p>
        </div>
        <Button
          disabled={!canQuery}
          onClick={() => {
            setDeleteErrorMessage(null);
            setSaveErrorMessage(null);
            setEditorState({ mode: "create" });
          }}
          className="self-start"
        >
          <Plus className="size-4" aria-hidden="true" />
          新建单词本
        </Button>
      </header>

      {!isHydrated ? <StatusView title="正在加载设置" state="loading" /> : null}
      {isHydrated && !settings.baseUrl ? <StatusView title="请先完成设置" /> : null}
      {isHydrated && settings.baseUrl && !canQuery ? (
        <StatusView
          title="请先完成设置并登录"
          description="登录后即可使用查词、历史和单词本。"
        />
      ) : null}
      {isHydrated && canQuery ? (
        <div
          data-testid="wordbooks-layout"
          className="grid gap-6 min-[880px]:grid-cols-[minmax(12.5rem,14.5rem)_minmax(0,1fr)]"
        >
          <Card className="shadow-none min-[880px]:sticky min-[880px]:top-0 min-[880px]:self-start">
            <CardHeader className="space-y-2 border-b border-[hsl(var(--border))]/80 pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookMarked className="size-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
                我的单词本
              </CardTitle>
              <CardDescription>选择一个单词本查看内容</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {wordbooksQuery.isLoading ? <StatusView title="正在加载单词本" state="loading" /> : null}
              {wordbooksQuery.error ? <StatusView title="单词本加载失败" state="error" /> : null}
              {deleteErrorMessage ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>删除失败</AlertTitle>
                  <AlertDescription>{deleteErrorMessage}</AlertDescription>
                </Alert>
              ) : null}
              {!wordbooksQuery.isLoading && !wordbooksQuery.error ? (
                wordbooksQuery.data && wordbooksQuery.data.length > 0 ? (
                  <div className="grid gap-2">
                    {wordbooksQuery.data.map((item) => {
                      const isSelected = item.id === selectedWordbookId;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-label={`打开单词本 ${item.name}`}
                          aria-pressed={isSelected}
                          onClick={() => {
                            setSelectedWordbookId(item.id);
                            setDeleteErrorMessage(null);
                          }}
                          className={[
                            "flex w-full cursor-pointer items-start justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                            isSelected
                              ? "border-[hsl(var(--accent)/0.45)] bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--foreground))]"
                              : "border-[hsl(var(--border))]/70 bg-[hsl(var(--surface)/0.35)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface)/0.55)]",
                          ].join(" ")}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{item.name}</span>
                            <span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
                              {item.createTime}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <StatusView title="暂无单词本" />
                )
              ) : null}
            </CardContent>
          </Card>

          <WordbookDetailPane
            wordbook={selectedWordbook}
            onOpenWord={handleOpenWord}
            onRename={() => {
              setDeleteErrorMessage(null);
              setSaveErrorMessage(null);
              if (selectedWordbook) {
                setEditorState({ mode: "rename", wordbook: selectedWordbook });
              }
            }}
            onDelete={() => {
              setDeleteErrorMessage(null);
              if (selectedWordbook) {
                setPendingDeleteWordbook(selectedWordbook);
              }
            }}
          />
        </div>
      ) : null}
      <WordbookEditorDialog
        open={editorState.mode !== "closed"}
        title={editorState.mode === "rename" ? "重命名单词本" : "新建单词本"}
        initialName={editorState.mode === "rename" ? editorState.wordbook.name : ""}
        confirmLabel="保存单词本"
        errorMessage={saveErrorMessage}
        onClose={() => {
          setSaveErrorMessage(null);
          setEditorState({ mode: "closed" });
        }}
        onSubmit={async (name) => {
          setSaveErrorMessage(null);
          if (editorState.mode === "rename") {
            try {
              await renameMutation.mutateAsync({ id: editorState.wordbook.id, name });
            } catch {
              return;
            }
            return;
          }

          try {
            await createMutation.mutateAsync(name);
          } catch {
            return;
          }
        }}
      />
      <AlertDialog
        open={pendingDeleteWordbook !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setPendingDeleteWordbook(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除单词本</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteWordbook
                ? `确定要删除“${pendingDeleteWordbook.name}”吗？此操作会立即生效。`
                : "确定要删除当前单词本吗？此操作会立即生效。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (pendingDeleteWordbook) {
                  setDeleteErrorMessage(null);
                  deleteMutation.mutate(pendingDeleteWordbook.id);
                }
              }}
            >
              {deleteMutation.isPending ? "删除中..." : "删除单词本"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
