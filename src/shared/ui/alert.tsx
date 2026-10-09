import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

const alertVariants = cva(
  "relative w-full rounded-[var(--radius-md)] border px-4 py-3 text-sm shadow-sm",
  {
    variants: {
      variant: {
        default:
          "border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.72)] text-[hsl(var(--foreground))]",
        destructive:
          "border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive-foreground))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const Alert = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(
  function Alert({ className, variant, ...props }, ref) {
    return <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
  },
);

export const AlertTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  function AlertTitle({ className, ...props }, ref) {
    return <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
  },
);

export const AlertDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AlertDescription({ className, ...props }, ref) {
    return <div ref={ref} className={cn("text-sm text-[inherit] [&_p]:leading-relaxed", className)} {...props} />;
  },
);
