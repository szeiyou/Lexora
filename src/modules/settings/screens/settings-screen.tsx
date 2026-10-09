import { useEffect, useState } from "react";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { AuthSessionCard } from "@/modules/auth/ui/auth-session-card";
import { SettingsForm } from "@/modules/settings/ui/settings-form";
import { type SettingsValues } from "@/modules/settings/model/settings.schema";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function SettingsScreen() {
  const isHydrated = useSettingsStore((state) => state.isHydrated);
  const values = useSettingsStore((state) => state.values);
  const hydrate = useSettingsStore((state) => state.hydrate);
  const persist = useSettingsStore((state) => state.persist);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      void hydrate();
    }
  }, [hydrate, isHydrated]);

  const handleSave = async (nextValues: SettingsValues) => {
    setIsBusy(true);
    try {
      const previousBaseUrl = values.baseUrl;
      await persist(nextValues);

      if (previousBaseUrl && previousBaseUrl !== nextValues.baseUrl) {
        await useAuthStore.getState().clearSession("服务地址已变更，请重新登录");
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">设置</CardTitle>
          <CardDescription>连接词典服务并调整使用偏好</CardDescription>
        </CardHeader>
        <CardContent>
          {!isHydrated ? <p className="text-sm text-[hsl(var(--muted-foreground))]">正在加载设置</p> : null}
          {isHydrated ? (
            <SettingsForm
              initialValues={values}
              onSave={handleSave}
              isBusy={isBusy}
            />
          ) : null}
        </CardContent>
      </Card>
      {isHydrated ? (
        <AuthSessionCard
          connection={{
            baseUrl: values.baseUrl,
            requestTimeoutMs: values.requestTimeoutMs,
          }}
        />
      ) : null}
    </section>
  );
}
