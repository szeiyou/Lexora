import type { RememberedCloseBehavior } from "@/modules/desktop-shell/model/close-behavior";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export function CloseBehaviorDialog({
  onChoose,
}: {
  onChoose: (value: RememberedCloseBehavior) => void;
}) {
  return (
    <Dialog open>
      <DialogContent aria-label="关闭应用方式" showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>关闭应用方式</DialogTitle>
          <DialogDescription>首次关闭窗口时，请选择后续默认行为。</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-stretch">
          <Button onClick={() => onChoose("tray")} className="w-full">
            最小化到托盘
          </Button>
          <Button onClick={() => onChoose("exit")} variant="secondary" className="w-full">
            直接退出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
