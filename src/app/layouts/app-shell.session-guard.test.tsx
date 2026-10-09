import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "@/app/layouts/app-shell";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { defaultSettingsValues } from "@/modules/settings/model/settings.schema";
import { useSettingsStore } from "@/modules/settings/model/settings.store";

function renderShell(initialEntries: string[]) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <h1>查词</h1> },
          { path: "history", element: <h1>历史</h1> },
          { path: "translations", element: <h1>翻译</h1> },
          { path: "wordbooks", element: <h1>单词本</h1> },
          { path: "settings", element: <h1>设置</h1> },
        ],
      },
    ],
    { initialEntries },
  );

  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
}

beforeEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  useSettingsStore.setState({
    isHydrated: true,
    values: {
      ...defaultSettingsValues,
      baseUrl: "http://localhost:8080",
    },
  });
  useAuthStore.setState({
    ...useAuthStore.getInitialState(),
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "alice" },
    expiresAt: Date.now() + 60_000,
    authMessage: null,
    silentlyVerifySession: vi.fn().mockResolvedValue({ id: 1, username: "alice" }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("silently verifies the session when entering a protected route", async () => {
  renderShell(["/history"]);

  await screen.findByRole("heading", { name: "历史" });

  await waitFor(() => {
    expect(useAuthStore.getState().silentlyVerifySession).toHaveBeenCalledWith({
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 60000,
    });
  });
});

it("does not verify the session on the settings route", async () => {
  renderShell(["/settings"]);

  await screen.findByRole("heading", { name: "设置" });

  await waitFor(() => {
    expect(useAuthStore.getState().silentlyVerifySession).not.toHaveBeenCalled();
  });
});

it("revalidates the session when the window regains focus on a protected route", async () => {
  const nowSpy = vi.spyOn(Date, "now");
  nowSpy.mockReturnValue(0);

  renderShell(["/history"]);

  await screen.findByRole("heading", { name: "历史" });

  await waitFor(() => {
    expect(useAuthStore.getState().silentlyVerifySession).toHaveBeenCalledTimes(1);
  });

  nowSpy.mockReturnValue(31_000);
  window.dispatchEvent(new Event("focus"));

  await waitFor(() => {
    expect(useAuthStore.getState().silentlyVerifySession).toHaveBeenCalledTimes(2);
  });
});

it("redirects to settings when silent verification fails on a protected route", async () => {
  useAuthStore.setState({
    ...useAuthStore.getState(),
    silentlyVerifySession: vi.fn().mockResolvedValue(null),
  });

  renderShell(["/history"]);

  expect(await screen.findByRole("heading", { name: "设置" })).toBeInTheDocument();
});
