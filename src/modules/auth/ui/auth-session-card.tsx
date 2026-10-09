import { useEffect, useState } from "react";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { type SettingsValues } from "@/modules/settings/model/settings.schema";
import { cn } from "@/shared/lib/cn";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { StatusView } from "@/shared/ui/status-view";

type AuthSessionCardProps = {
  connection: Pick<SettingsValues, "baseUrl" | "requestTimeoutMs">;
};

export function AuthSessionCard({ connection }: AuthSessionCardProps) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const authMessage = useAuthStore((state) => state.authMessage);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const message = feedback ?? authMessage;
  const activeTabId = `auth-mode-${mode}`;

  useEffect(() => {
    if (authMessage) {
      setFeedback(null);
    }
  }, [authMessage]);

  const handleAuthSubmit = async () => {
    if (mode === "register" && password !== confirmPassword) {
      setFeedback("两次输入的密码不一致");
      return;
    }

    try {
      const action = mode === "login" ? login : register;
      await action({ username, password }, connection);
      setFeedback(null);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "操作失败，请稍后重试");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>账号会话</CardTitle>
        <CardDescription>登录、注册或退出当前账号。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connection.baseUrl ? <StatusView title="请先保存服务地址" /> : null}

        {connection.baseUrl && message ? (
          <Alert variant="destructive">
            <AlertTitle>账号提示</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {connection.baseUrl && (status === "restoring" || status === "refreshing") ? (
          <StatusView title="正在恢复登录状态" state="loading" />
        ) : null}

        {connection.baseUrl && status === "authenticated" && user ? (
          <>
            <p className="text-sm text-[hsl(var(--foreground))]">当前用户：{user.username}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => void logout(connection)}>退出登录</Button>
            </div>
          </>
        ) : null}

        {connection.baseUrl && status === "anonymous" ? (
          <div className="space-y-4">
            <div
              className="inline-flex rounded-full bg-[hsl(var(--muted))] p-1"
              role="tablist"
              aria-label="账号模式"
            >
              <button
                id="auth-mode-login"
                role="tab"
                type="button"
                aria-selected={mode === "login"}
                aria-controls="auth-mode-panel"
                tabIndex={mode === "login" ? 0 : -1}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                  mode === "login"
                    ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
                onClick={() => {
                  setMode("login");
                  setFeedback(null);
                }}
              >
                登录
              </button>
              <button
                id="auth-mode-register"
                role="tab"
                type="button"
                aria-selected={mode === "register"}
                aria-controls="auth-mode-panel"
                tabIndex={mode === "register" ? 0 : -1}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
                  mode === "register"
                    ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
                onClick={() => {
                  setMode("register");
                  setFeedback(null);
                }}
              >
                注册
              </button>
            </div>

            <div
              id="auth-mode-panel"
              role="tabpanel"
              aria-labelledby={activeTabId}
              className="grid gap-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="auth-username">
                  用户名
                </label>
                <Input
                  id="auth-username"
                  value={username}
                  autoComplete="username"
                  onChange={(event) => {
                    setFeedback(null);
                    setUsername(event.target.value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="auth-password">
                  密码
                </label>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  onChange={(event) => {
                    setFeedback(null);
                    setPassword(event.target.value);
                  }}
                />
              </div>

              {mode === "register" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="auth-confirm-password">
                    确认密码
                  </label>
                  <Input
                    id="auth-confirm-password"
                    type="password"
                    value={confirmPassword}
                    autoComplete="new-password"
                    onChange={(event) => {
                      setFeedback(null);
                      setConfirmPassword(event.target.value);
                    }}
                  />
                </div>
              ) : null}
            </div>

            <Button onClick={() => void handleAuthSubmit()}>{mode === "login" ? "登录" : "注册"}</Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
