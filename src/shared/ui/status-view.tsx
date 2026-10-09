import { LoaderCircle } from "lucide-react";
import { type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { cn } from "@/shared/lib/cn";

type StatusViewProps = {
  title: string;
  description?: ReactNode;
  className?: string;
  tone?: "default" | "destructive";
  state?: "empty" | "loading" | "error";
  role?: "status" | "alert";
};

export function StatusView({
  title,
  description,
  className,
  tone,
  state = "empty",
  role,
}: StatusViewProps) {
  const variant = tone ?? (state === "error" ? "destructive" : "default");
  const resolvedRole = role ?? (state === "error" ? "alert" : "status");

  return (
    <Alert className={cn("grid gap-2", className)} variant={variant} role={resolvedRole}>
      {state === "loading" ? (
        <LoaderCircle
          className="size-4 animate-spin text-[hsl(var(--muted-foreground))] motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : null}
      <AlertTitle>{title}</AlertTitle>
      {description ? <AlertDescription>{description}</AlertDescription> : null}
    </Alert>
  );
}
