import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { settingsSchema, type SettingsValues } from "@/modules/settings/model/settings.schema";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

type SettingsFormProps = {
  initialValues: SettingsValues;
  onSave: (values: SettingsValues) => Promise<void>;
  isBusy?: boolean;
};

type ValidationIssue = {
  path: PropertyKey[];
  message: string;
};

function formatValidationIssue(issue: ValidationIssue) {
  const field = issue.path[0];
  if (field === "baseUrl") {
    return "服务地址必须是有效的 URL";
  }
  if (field === "requestTimeoutMs") {
    return "请求超时必须在 1000-60000ms 之间";
  }
  return issue.message;
}

export function SettingsForm({
  initialValues,
  onSave,
  isBusy = false,
}: SettingsFormProps) {
  const form = useForm<SettingsValues>({
    defaultValues: initialValues,
  });

  const {
    control,
    clearErrors,
    handleSubmit,
    register,
    reset,
    setError,
    formState: { errors, isDirty },
  } = form;

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const runWithSchema =
    (handler: (values: SettingsValues) => Promise<void>) => async (values: SettingsValues) => {
      const parsed = settingsSchema.safeParse(values);
      if (!parsed.success) {
        clearErrors();
        for (const issue of parsed.error.issues) {
          const fieldName = issue.path[0];
          if (typeof fieldName === "string") {
            setError(fieldName as keyof SettingsValues, {
              type: "manual",
              message: formatValidationIssue(issue),
            });
          }
        }
        return;
      }

      clearErrors();
      await handler(parsed.data);
    };

  const validationFeedback = Object.values(errors)[0]?.message;

  return (
    <Form {...form}>
      <form className="mt-6 space-y-6" onSubmit={handleSubmit(runWithSchema(onSave))} onChange={() => clearErrors()}>
        <Card>
          <CardHeader>
            <CardTitle>连接设置</CardTitle>
            <CardDescription>配置连接服务信息。保存服务地址后即可登录或注册账号。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {validationFeedback ? (
              <Alert variant="destructive">
                <AlertTitle>表单校验失败</AlertTitle>
                <AlertDescription>{validationFeedback}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={control}
                name="baseUrl"
                render={() => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>服务地址</FormLabel>
                    <FormControl>
                      <Input
                        {...register("baseUrl")}
                        placeholder="http://localhost:8080"
                        autoComplete="url"
                      />
                    </FormControl>
                    <FormDescription>请输入完整地址，通常需要包含协议和端口。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="requestTimeoutMs"
                render={() => (
                  <FormItem>
                    <FormLabel>请求超时 (ms)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1000}
                        max={60000}
                        {...register("requestTimeoutMs", { valueAsNumber: true })}
                      />
                    </FormControl>
                    <FormDescription>允许范围 1000 - 60000 毫秒。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="closeBehavior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>关闭行为</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isBusy}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ask">每次询问</SelectItem>
                        <SelectItem value="tray">最小化到托盘</SelectItem>
                        <SelectItem value="exit">直接退出</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>控制首次关闭窗口后的默认行为。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={isBusy || !isDirty}>
                保存设置
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
