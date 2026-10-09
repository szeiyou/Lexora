import { act, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import App from "./app";

const WEB_STORAGE_KEY = "codict.settings";

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState(useAuthStore.getInitialState());
  useSettingsStore.setState(useSettingsStore.getInitialState());
});

it("renders the Lexora shell and default lookup route", async () => {
  await act(async () => {
    render(<App />);
  });

  expect(screen.getByText("Lexora")).toBeInTheDocument();
  const navigation = screen.getByRole("navigation", { name: "主导航" });
  expect(navigation).toBeInTheDocument();
  expect(within(navigation).getByRole("link", { name: "翻译" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "查词" })).toBeInTheDocument();
});

it("hydrates settings and then attempts auth restore on app startup", async () => {
  localStorage.setItem(
    WEB_STORAGE_KEY,
    JSON.stringify({
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 30000,
      closeBehavior: "ask",
    }),
  );

  const restoreSession = vi.fn().mockResolvedValue(undefined);
  useAuthStore.setState({
    status: "anonymous",
    restoreSession,
  });

  await act(async () => {
    render(<App />);
  });

  await waitFor(() => {
    expect(restoreSession).toHaveBeenCalledWith({
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: 60000,
    });
  });
});
