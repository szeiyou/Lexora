import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { fetchWordbooks } from "@/modules/wordbooks/api/fetch-wordbooks";
import { addWordsToWordbook } from "@/modules/wordbooks/api/mutate-wordbook-words";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { StatusView } from "@/shared/ui/status-view";

type AddToWordbookDialogProps = {
  word: string;
  triggerLabel?: string;
};

export function AddToWordbookDialog({
  word,
  triggerLabel = "加入单词本",
}: AddToWordbookDialogProps) {
  const isHydrated = useSettingsStore((state) => state.isHydrated);
  const settings = useSettingsStore((state) => state.values);
  const authStatus = useAuthStore((state) => state.status);
  const authUser = useAuthStore((state) => state.user);
  const protectedStateVersion = useAuthStore((state) => state.protectedStateVersion);
  const [open, setOpen] = useState(false);
  const [selectedWordbookId, setSelectedWordbookId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const lastProtectedStateVersionRef = useRef(protectedStateVersion);
  const canQuery = Boolean(settings.baseUrl && authStatus === "authenticated" && authUser);

  const wordbooksQuery = useQuery({
    queryKey: ["wordbooks-select", settings.baseUrl, authUser?.id ?? "anonymous"],
    queryFn: () => fetchWordbooks(settings),
    enabled: open && isHydrated && canQuery,
  });

  const addMutation = useMutation({
    mutationFn: (wordbookId: number) => addWordsToWordbook(wordbookId, [word], settings),
    onSuccess: (_, wordbookId) => {
      const wordbook = wordbooksQuery.data?.find((item) => item.id === wordbookId);
      setFeedback(wordbook ? `已加入 ${wordbook.name}` : "已加入单词本");
      setOpen(false);
      setSelectedWordbookId("");
    },
  });

  useEffect(() => {
    if (lastProtectedStateVersionRef.current === protectedStateVersion) {
      return;
    }

    lastProtectedStateVersionRef.current = protectedStateVersion;
    addMutation.reset();
    setOpen(false);
    setSelectedWordbookId("");
    setFeedback(null);
  }, [addMutation, protectedStateVersion]);

  const handleConfirm = () => {
    const nextId = Number(selectedWordbookId);
    if (!nextId) {
      return;
    }

    addMutation.mutate(nextId);
  };

  return (
    <>
      <Button
        onClick={() => {
          setFeedback(null);
          setOpen(true);
        }}
      >
        {triggerLabel}
      </Button>
      {feedback ? (
        <Alert className="mt-3" role="status">
          <AlertTitle>操作成功</AlertTitle>
          <AlertDescription>{feedback}</AlertDescription>
        </Alert>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-label={`加入单词本 ${word}`} showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>加入单词本</DialogTitle>
            <DialogDescription>选择一个目标单词本，将当前单词加入其中。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {!isHydrated ? <StatusView title="正在加载设置" state="loading" /> : null}
            {isHydrated && !settings.baseUrl ? <StatusView title="请先完成设置" /> : null}
            {isHydrated && settings.baseUrl && !canQuery ? (
              <StatusView
                title="请先完成设置并登录"
                description="登录后即可使用查词、历史和单词本。"
              />
            ) : null}
            {isHydrated && canQuery && wordbooksQuery.isLoading ? (
              <StatusView title="正在加载单词本" state="loading" />
            ) : null}
            {isHydrated && canQuery && wordbooksQuery.error ? (
              <StatusView title="单词本加载失败" state="error" />
            ) : null}
            {isHydrated && canQuery && !wordbooksQuery.isLoading && !wordbooksQuery.error ? (
              wordbooksQuery.data && wordbooksQuery.data.length > 0 ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">目标单词本</label>
                  <Select value={selectedWordbookId} onValueChange={setSelectedWordbookId}>
                    <SelectTrigger aria-label="目标单词本">
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {wordbooksQuery.data.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <StatusView title="暂无单词本" />
              )
            ) : null}
            {addMutation.isError ? (
              <Alert variant="destructive">
                <AlertTitle>加入失败</AlertTitle>
                <AlertDescription>加入单词本失败</AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)} variant="outline">
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedWordbookId || addMutation.isPending || !canQuery}
            >
              确认加入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
