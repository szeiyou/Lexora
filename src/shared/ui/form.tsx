import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
} from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "@/shared/lib/cn";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue);
const FormItemContext = createContext<{ id: string }>({} as { id: string });

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

const FormItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function FormItem(
  { className, ...props },
  ref,
) {
  const id = useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
});

const FormLabel = forwardRef<HTMLLabelElement, ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  function FormLabel({ className, ...props }, ref) {
    const { error, formItemId } = useFormField();

    return (
      <LabelPrimitive.Root
        ref={ref}
        className={cn("text-sm font-medium leading-none", error && "text-[hsl(var(--destructive))]", className)}
        htmlFor={formItemId}
        {...props}
      />
    );
  },
);

const FormControl = forwardRef<HTMLElement, ComponentPropsWithoutRef<typeof Slot>>(
  function FormControl({ ...props }, ref) {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

    const describedBy = [formDescriptionId, error ? formMessageId : null].filter(Boolean).join(" ");

    return <Slot ref={ref} id={formItemId} aria-describedby={describedBy || undefined} aria-invalid={Boolean(error)} {...props} />;
  },
);

const FormDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function FormDescription({ className, ...props }, ref) {
    const { formDescriptionId } = useFormField();

    return <p ref={ref} id={formDescriptionId} className={cn("text-sm text-[hsl(var(--muted-foreground))]", className)} {...props} />;
  },
);

const FormMessage = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function FormMessage({ className, children, ...props }, ref) {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error.message ?? "") : children;

    if (!body) {
      return null;
    }

    return (
      <p ref={ref} id={formMessageId} className={cn("text-sm font-medium text-[hsl(var(--destructive))]", className)} {...props}>
        {body}
      </p>
    );
  },
);

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
};
