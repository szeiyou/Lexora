import { HttpResponse, http } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { defaultSettingsValues } from "@/modules/settings/model/settings.schema";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { SettingsScreen } from "@/modules/settings/screens/settings-screen";
import { server } from "@/test/msw/server";

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState(useAuthStore.getInitialState());
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

it("keeps save disabled until settings change and disables it again after saving", async () => {
  render(<SettingsScreen />);

  const saveButton = await screen.findByRole("button", { name: "保存设置" });
  expect(saveButton).toBeDisabled();

  await userEvent.type(screen.getByLabelText("服务地址"), "http://localhost:8080");
  expect(saveButton).toBeEnabled();

  await userEvent.click(saveButton);

  await waitFor(() => {
    expect(useSettingsStore.getState().values.baseUrl).toBe("http://localhost:8080");
  });
  await waitFor(() => {
    expect(saveButton).toBeDisabled();
  });
});

it("logs in from the account session card and shows the authenticated user", async () => {
  server.use(
    http.post("http://localhost:8080/api/v1/auth/login", () =>
      HttpResponse.json({
        accessToken: "access-1",
        refreshToken: "refresh-1",
        tokenType: "Bearer",
        expiresIn: 900,
        user: { id: 1, username: "测试者" },
      }),
    ),
  );

  render(<SettingsScreen />);

  await screen.findByLabelText("服务地址");
  await userEvent.type(screen.getByLabelText("服务地址"), "http://localhost:8080");
  await userEvent.click(screen.getByRole("button", { name: "保存设置" }));
  await userEvent.type(screen.getByLabelText("用户名"), "测试者");
  await userEvent.type(screen.getByLabelText("密码"), "secret");
  await userEvent.click(screen.getByRole("button", { name: "登录" }));

  expect(await screen.findByText("当前用户：测试者")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "验证当前会话" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "退出登录" })).toBeInTheDocument();
});

it("renders login and register as tabs with a shared tab panel", async () => {
  render(<SettingsScreen />);

  await screen.findByLabelText("服务地址");
  await userEvent.type(screen.getByLabelText("服务地址"), "http://localhost:8080");
  await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

  const tablist = screen.getByRole("tablist", { name: "账号模式" });
  const loginTab = screen.getByRole("tab", { name: "登录" });
  const registerTab = screen.getByRole("tab", { name: "注册" });

  expect(tablist).toHaveClass("rounded-full");
  expect(loginTab).toHaveAttribute("aria-selected", "true");
  expect(loginTab).toHaveAttribute("tabindex", "0");
  expect(loginTab).toHaveClass("bg-[hsl(var(--background))]");
  expect(loginTab).toHaveClass("cursor-pointer");
  expect(registerTab).toHaveAttribute("aria-selected", "false");
  expect(registerTab).toHaveAttribute("tabindex", "-1");
  expect(registerTab).toHaveClass("cursor-pointer");
  expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", loginTab.getAttribute("id"));

  await userEvent.click(registerTab);

  expect(registerTab).toHaveAttribute("aria-selected", "true");
  expect(registerTab).toHaveAttribute("tabindex", "0");
  expect(screen.getByRole("tabpanel")).toHaveAttribute(
    "aria-labelledby",
    registerTab.getAttribute("id"),
  );
  expect(await screen.findByLabelText("确认密码")).toBeInTheDocument();
});

it("switches to register mode and requires matching confirmation password", async () => {
  render(<SettingsScreen />);

  await screen.findByLabelText("服务地址");
  await userEvent.type(screen.getByLabelText("服务地址"), "http://localhost:8080");
  await userEvent.click(screen.getByRole("button", { name: "保存设置" }));
  await userEvent.click(screen.getByRole("tab", { name: "注册" }));
  await userEvent.type(screen.getByLabelText("用户名"), "alice");
  await userEvent.type(screen.getByLabelText("密码"), "Password123");
  await userEvent.type(screen.getByLabelText("确认密码"), "Password999");
  await userEvent.click(screen.getByRole("button", { name: "注册" }));

  expect(await screen.findByText("两次输入的密码不一致")).toBeInTheDocument();
});

it("shows a friendly login message for invalid credentials", async () => {
  server.use(
    http.post("http://localhost:8080/api/v1/auth/login", () =>
      HttpResponse.json(
        {
          code: "INVALID_CREDENTIALS",
          message: "用户名或密码错误",
        },
        { status: 401 },
      ),
    ),
  );

  render(<SettingsScreen />);

  await screen.findByLabelText("服务地址");
  await userEvent.type(screen.getByLabelText("服务地址"), "http://localhost:8080");
  await userEvent.click(screen.getByRole("button", { name: "保存设置" }));
  await userEvent.type(screen.getByLabelText("用户名"), "测试者");
  await userEvent.type(screen.getByLabelText("密码"), "wrong-password");
  await userEvent.click(screen.getByRole("button", { name: "登录" }));

  expect(await screen.findByText("用户名或密码错误")).toBeInTheDocument();
});

it("shows validation feedback when connection settings are invalid", async () => {
  render(<SettingsScreen />);

  await screen.findByLabelText("服务地址");
  await userEvent.type(screen.getByLabelText("服务地址"), "invalid-url");
  await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("服务地址必须是有效的 URL");
});

it("clears the session when the saved baseUrl changes", async () => {
  useAuthStore.setState({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    expiresAt: Date.now() + 10_000,
    authMessage: null,
  });
  useSettingsStore.setState({
    isHydrated: true,
    values: {
      ...defaultSettingsValues,
      baseUrl: "http://localhost:8080",
    },
  });

  render(<SettingsScreen />);

  const baseUrl = await screen.findByLabelText("服务地址");
  await userEvent.clear(baseUrl);
  await userEvent.type(baseUrl, "http://127.0.0.1:8080");
  await userEvent.click(screen.getByRole("button", { name: "保存设置" }));

  expect(await screen.findByText("服务地址已变更，请重新登录")).toBeInTheDocument();
  await waitFor(() => {
    expect(useAuthStore.getState().status).toBe("anonymous");
  });
});
