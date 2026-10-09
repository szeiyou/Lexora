import { HttpResponse, http } from "msw";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { delay } from "msw";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { englishWordResponse } from "@/modules/query/model/__fixtures__/entry-responses";
import { mapEntryResponse } from "@/modules/query/model/entry-result-mapper";
import { EnglishWordCard } from "@/modules/query/ui/english-word-card";
import { defaultSettingsValues } from "@/modules/settings/model/settings.schema";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { AddToWordbookDialog } from "@/modules/wordbooks/ui/add-to-wordbook-dialog";
import { server } from "@/test/msw/server";
import { vi } from "vitest";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function setAuthenticatedSession() {
  useAuthStore.setState({
    status: "authenticated",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: { id: 1, username: "tester" },
    expiresAt: Date.now() + 60_000,
    authMessage: null,
  });
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState(useAuthStore.getInitialState());
  setAuthenticatedSession();
  useSettingsStore.setState({
    isHydrated: true,
    values: {
      ...defaultSettingsValues,
      baseUrl: "http://localhost:8080",
    },
  });
});

function renderAddToWordbookDialog() {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AddToWordbookDialog word="phenomenon" />
    </QueryClientProvider>,
  );
}

it("asks the user to log in before loading wordbooks in the add dialog", async () => {
  const requests = vi.fn();

  server.use(
    http.get("http://localhost:8080/api/v1/wordbooks", () => {
      requests();
      return HttpResponse.json([]);
    }),
  );

  useAuthStore.setState(useAuthStore.getInitialState());
  renderAddToWordbookDialog();

  await userEvent.click(screen.getByRole("button", { name: "加入单词本" }));

  expect(await screen.findByText("请先完成设置并登录")).toBeInTheDocument();
  expect(requests).not.toHaveBeenCalled();
});

it("shows the updated loading copy while fetching wordbooks", async () => {
  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", async () => {
      await delay("infinite");
      return HttpResponse.json([]);
    }),
  );

  renderAddToWordbookDialog();

  await userEvent.click(screen.getByRole("button", { name: "加入单词本" }));

  expect(await screen.findByText("正在加载单词本")).toBeInTheDocument();
});

it("shows the updated error copy when fetching wordbooks fails", async () => {
  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 500 })),
  );

  renderAddToWordbookDialog();

  await userEvent.click(screen.getByRole("button", { name: "加入单词本" }));

  expect(await screen.findByText("单词本加载失败")).toBeInTheDocument();
});

it("shows the updated empty copy when no wordbooks are available", async () => {
  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", () => HttpResponse.json([])),
  );

  renderAddToWordbookDialog();

  await userEvent.click(screen.getByRole("button", { name: "加入单词本" }));

  expect(await screen.findByText("暂无单词本")).toBeInTheDocument();
});

it("adds the current result word to a selected wordbook", async () => {
  const result = mapEntryResponse(englishWordResponse);
  if (result.kind !== "english-word") {
    throw new Error("Expected an english-word result.");
  }

  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", () =>
      HttpResponse.json([
        { id: 1, name: "重要单词", createTime: "2026-03-21T10:00:00" },
        { id: 2, name: "考试词汇", createTime: "2026-03-21T10:05:00" },
      ]),
    ),
    http.options("http://localhost:8080/api/v1/wordbooks/2/words", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.post("http://localhost:8080/api/v1/wordbooks/2/words", async ({ request }) => {
      expect(await request.json()).toEqual(["phenomenon"]);
      return new HttpResponse(null, { status: 200 });
    }),
  );

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <EnglishWordCard result={result} />
    </QueryClientProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "加入单词本" }));
  await userEvent.click(screen.getByRole("combobox", { name: "目标单词本" }));
  await userEvent.click(await screen.findByRole("option", { name: "考试词汇" }));
  await userEvent.click(screen.getByRole("button", { name: "确认加入" }));

  expect(await screen.findByText("已加入 考试词汇")).toBeInTheDocument();
});
