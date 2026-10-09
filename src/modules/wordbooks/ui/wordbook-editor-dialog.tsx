import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";

type WordbookEditorDialogProps = {
  open: boolean;
  title: string;
  initialName?: string;
  confirmLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => void | Promise<unknown>;
  errorMessage?: string | null;
};

export function WordbookEditorDialog({
  open,
  title,
  initialName = "",
  confirmLabel,
  onClose,
  onSubmit,
  errorMessage = null,
}: WordbookEditorDialogProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, open]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    return onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        onClose();
      }
    }}>
      <DialogContent aria-label={title} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>请输入单词本名称。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label htmlFor="wordbook-name-input" className="text-sm font-medium text-[hsl(var(--foreground))]">
            单词本名称
          </label>
          <Input
            id="wordbook-name-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSubmit();
              }
            }}
          />
        </div>
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>保存单词本失败</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            取消
          </Button>
          <Button onClick={() => void handleSubmit()}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
