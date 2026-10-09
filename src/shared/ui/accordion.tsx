import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { forwardRef, type ComponentRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/shared/lib/cn";

export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(function AccordionItem({ className, ...props }, ref) {
  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn("rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.58)] px-4", className)}
      {...props}
    />
  );
});

export const AccordionTrigger = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(function AccordionTrigger({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          "flex flex-1 cursor-pointer items-center justify-between py-4 text-left text-sm font-medium transition-[color] duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-reduce:transition-none hover:text-[hsl(var(--foreground))] [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform duration-[var(--motion-base)] ease-[var(--motion-ease)] motion-reduce:transition-none" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});

export const AccordionContent = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(function AccordionContent({ className, children, ...props }, ref) {
  return (
    <AccordionPrimitive.Content
      ref={ref}
      className={cn(
        "overflow-hidden text-sm text-[hsl(var(--muted-foreground))] data-[state=closed]:animate-out data-[state=closed]:accordion-up data-[state=open]:animate-in data-[state=open]:accordion-down motion-reduce:animate-none",
        className,
      )}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </AccordionPrimitive.Content>
  );
});
