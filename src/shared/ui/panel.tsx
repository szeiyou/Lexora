import { type ComponentPropsWithoutRef, type ElementType } from "react";
import { cardBaseClass } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

type PanelProps<T extends ElementType> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

export function Panel<T extends ElementType = "section">({
  as,
  className,
  ...props
}: PanelProps<T>) {
  const Component = as ?? "section";
  return <Component className={cn(cardBaseClass, className)} {...props} />;
}
