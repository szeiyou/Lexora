import { StrictMode } from "react";
import { HttpResponse, http } from "msw";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { ApiError } from "@/shared/api/api-error";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import * as fetchEntryApi from "@/modules/query/api/fetch-entry";
import { mapEntryResponse } from "@/modules/query/model/entry-result-mapper";
import {
  englishWordResponse,
  sentenceTranslationResponse,
  zhToEnTermResponse,
} from "@/modules/query/model/__fixtures__/entry-responses";
import { useQueryStore } from "@/modules/query/model/query-store";
import { defaultSettingsValues } from "@/modules/settings/model/settings.schema";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { clearHttpDiagnostics } from "@/shared/api/http-diagnostics";
import { WorkspaceScreen } from "@/modules/query/screens/workspace-screen";
import { server } from "@/test/msw/server";
import { vi } from "vitest";

const audioApiMocks = vi.hoisted(() => ({
  fetchAudio: vi.fn(),
}));

const queryFailureLogMocks = vi.hoisted(() => ({
  recordEntryQueryFailure: vi.fn(),
}));

vi.mock("@/modules/audio/api/fetch-audio", () => ({
  fetchAudio: audioApiMocks.fetchAudio,
}));

vi.mock("@/modules/query/api/fetch-entry", async () => {
  const actual = await vi.importActual<typeof import("@/modules/query/api/fetch-entry")>(
    "@/modules/query/api/fetch-entry",
  );

  return {
    ...actual,
    fetchEntry: vi.fn(actual.fetchEntry),
  };
});

vi.mock("@/modules/query/api/query-failure-log", () => ({
  recordEntryQueryFailure: queryFailureLogMocks.recordEntryQueryFailure,
}));

const fetchEntryMock = vi.mocked(fetchEntryApi.fetchEntry);

const visibleHistoryItem = {
  historyKey: "entry::visible::2026-03-24",
  query: "visible",
  normalizedQuery: "visible",
  resultType: "ENGLISH_WORD",
  summary: "可见的",
  sourceApi: "ENTRIES_V1",
  latestSearchTime: [2026, 3, 24, 10, 0, 0],
  searchCount: 2,
  searchTimes: [
    [2026, 3, 24, 10, 0, 0],
    [2026, 3, 23, 9, 0, 0],
  ],
};

const exampleHistoryItem = {
  historyKey: "entry::example::2026-03-23",
  query: "example",
  normalizedQuery: "example",
  resultType: "ZH_TO_EN_TERM",
  summary: "例子",
  sourceApi: "ENTRIES_V1",
  latestSearchTime: [2026, 3, 23, 11, 15, 0],
  searchCount: 1,
  searchTimes: [[2026, 3, 23, 11, 15, 0]],
};

const dropdownHistoryResponse = { content: [visibleHistoryItem, exampleHistoryItem] };

const groupedHistoryResponseWithTextTranslation = {
  content: [
    visibleHistoryItem,
    {
      historyKey: "text::paragraph::2026-03-22",
      query: "Long paragraph",
      normalizedQuery: "long paragraph",
      resultType: "TEXT_TRANSLATION",
      summary: "A long translated paragraph",
      sourceApi: "TEXT_TRANSLATIONS_V1",
      latestSearchTime: [2026, 3, 22, 9, 10, 0],
      searchCount: 1,
      searchTimes: [[2026, 3, 22, 9, 10, 0]],
    },
  ],
};

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

function renderWorkspace(
  queryClient: QueryClient,
  initialEntries: MemoryRouterProps["initialEntries"] = ["/"],
  options: { strict?: boolean } = {},
) {
  const screenElement = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <WorkspaceScreen />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return render(options.strict ? <StrictMode>{screenElement}</StrictMode> : screenElement);
}

function setAuthenticatedSession(
  overrides?: Partial<Pick<ReturnType<typeof useAuthStore.getState>, "accessToken" | "refreshToken" | "user">>,
) {
  useAuthStore.setState({
    status: "authenticated",
    accessToken: overrides?.accessToken ?? "access-1",
    refreshToken: overrides?.refreshToken ?? "refresh-1",
    user: overrides?.user ?? { id: 1, username: "tester" },
    expiresAt: Date.now() + 60_000,
    authMessage: null,
  });
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState(useAuthStore.getInitialState());
  setAuthenticatedSession();
  fetchEntryMock.mockClear();
  audioApiMocks.fetchAudio.mockReset();
  audioApiMocks.fetchAudio.mockResolvedValue({
    status: 200,
    blob: new Blob(["audio"]),
  });
  queryFailureLogMocks.recordEntryQueryFailure.mockReset();
  queryFailureLogMocks.recordEntryQueryFailure.mockResolvedValue(undefined);
  clearHttpDiagnostics();
  useSettingsStore.setState({
    isHydrated: true,
    values: {
      ...defaultSettingsValues,
      baseUrl: "http://localhost:8080",
    },
  });
  useQueryStore.setState(useQueryStore.getInitialState());
  server.use(
    http.get("http://localhost:8080/api/v1/history", () => HttpResponse.json({ content: [] })),
  );
});

it("opens a wordbook word route-state lookup as a fresh English word query", async () => {
  const queryClient = createTestQueryClient();
  const requestedQueries: Array<{ q: string; type: string | null }> = [];

  server.use(
    http.get("http://localhost:8080/api/v1/entries", ({ request }) => {
      const url = new URL(request.url);
      requestedQueries.push({
        q: url.searchParams.get("q") ?? "",
        type: url.searchParams.get("type"),
      });
      return HttpResponse.json(englishWordResponse);
    }),
  );

  renderWorkspace(queryClient, [
    {
      pathname: "/",
      state: {
        wordbookWordLookup: {
          query: "  phenomenon  ",
        },
      },
    },
  ]);

  expect(
    await screen.findByText("The northern lights are a natural phenomenon."),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("输入内容")).toHaveValue("phenomenon");
  expect(screen.getByLabelText("内容类型")).toHaveTextContent("英文单词");

  await waitFor(() => {
    expect(requestedQueries).toEqual([{ q: "phenomenon", type: "ENGLISH_WORD" }]);
  });
});

it("applies the same wordbook lookup route state only once under strict effects", async () => {
  const queryClient = createTestQueryClient();
  const requestedQueries: string[] = [];

  server.use(
    http.get("http://localhost:8080/api/v1/entries", ({ request }) => {
      requestedQueries.push(new URL(request.url).searchParams.get("q") ?? "");
      return HttpResponse.json(englishWordResponse);
    }),
  );

  renderWorkspace(
    queryClient,
    [
      {
        pathname: "/",
        state: {
          wordbookWordLookup: {
            query: "phenomenon",
          },
        },
      },
    ],
    { strict: true },
  );

  expect(
    await screen.findByText("The northern lights are a natural phenomenon."),
  ).toBeInTheDocument();

  await waitFor(() => {
    expect(requestedQueries).toEqual(["phenomenon"]);
  });
});

it("asks the user to log in before running protected workspace queries", async () => {
  const historyRequests = vi.fn();
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/history", () => {
      historyRequests();
      return HttpResponse.json({ content: [] });
    }),
  );

  useAuthStore.setState(useAuthStore.getInitialState());
  renderWorkspace(queryClient);

  expect(await screen.findByText("请先完成设置并登录")).toBeInTheDocument();
  expect(historyRequests).not.toHaveBeenCalled();
});

it("clears restored workspace state after the session changes on the same mount", async () => {
  const queryClient = createTestQueryClient();
  const restoredResult = mapEntryResponse(sentenceTranslationResponse);

  if (restoredResult.kind !== "sentence-translation") {
    throw new Error("Expected a sentence-translation result.");
  }

  useQueryStore.setState({
    ...useQueryStore.getInitialState(),
    draftQuery: "你今天怎么样？",
    forcedType: "SENTENCE_TRANSLATION",
    restoredResult,
  });

  renderWorkspace(queryClient);

  expect((await screen.findAllByText("How are you today?")).length).toBeGreaterThan(0);

  await act(async () => {
    await useAuthStore.getState().clearSession("登录已过期，请重新登录");
  });

  expect(await screen.findByText("请先完成设置并登录")).toBeInTheDocument();

  act(() => {
    setAuthenticatedSession({
      accessToken: "access-2",
      refreshToken: "refresh-2",
      user: { id: 2, username: "other" },
    });
  });

  await waitFor(() => {
    expect(screen.queryByText("How are you today?")).not.toBeInTheDocument();
    expect(screen.getByLabelText("输入内容")).toHaveValue("");
  });
});

it("shows the recent-search dropdown and fills draft without firing a request", async () => {
  const entryRequests = vi.fn();
  const historyRequests: URL[] = [];
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      historyRequests.push(new URL(request.url));
      return HttpResponse.json(dropdownHistoryResponse);
    }),
    http.get("http://localhost:8080/api/v1/entries", () => {
      entryRequests();
      return HttpResponse.json(englishWordResponse);
    }),
  );

  renderWorkspace(queryClient);

  const queryInput = screen.getByLabelText("输入内容");
  await userEvent.click(queryInput);

  expect(await screen.findByRole("listbox", { name: "最近记录" })).toBeInTheDocument();
  expect(historyRequests).toHaveLength(1);
  expect(historyRequests[0]?.searchParams.get("page")).toBe("1");
  expect(historyRequests[0]?.searchParams.get("size")).toBe("5");

  await userEvent.type(queryInput, "vi");

  expect(historyRequests).toHaveLength(1);
  const visibleOption = screen.getByRole("option", { name: /visible/i });
  expect(visibleOption).toBeInTheDocument();
  expect(visibleOption.className).toContain("cursor-pointer");
  expect(screen.queryByRole("option", { name: /example/i })).not.toBeInTheDocument();

  await userEvent.click(visibleOption);

  expect(queryInput).toHaveValue("visible");
  expect(screen.getByLabelText("内容类型")).toHaveTextContent("英文单词");
  expect(entryRequests).not.toHaveBeenCalled();
});

it("filters grouped TEXT_TRANSLATION history out of the query recent-search dropdown", async () => {
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/history", () =>
      HttpResponse.json(groupedHistoryResponseWithTextTranslation),
    ),
  );

  renderWorkspace(queryClient);

  const queryInput = screen.getByLabelText("输入内容");
  await userEvent.click(queryInput);

  expect(await screen.findByRole("listbox", { name: "最近记录" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: /visible/i })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /Long paragraph/i })).not.toBeInTheDocument();
  expect(screen.queryByText("TEXT_TRANSLATION")).not.toBeInTheDocument();
});

it("backfills entry history items from later pages when page 1 slots are consumed by TEXT_TRANSLATION", async () => {
  const queryClient = createTestQueryClient();
  const historyRequests: URL[] = [];
  const pageOneResponse = {
    content: [
      visibleHistoryItem,
      {
        historyKey: "text::1",
        query: "paragraph 1",
        normalizedQuery: "paragraph 1",
        resultType: "TEXT_TRANSLATION",
        summary: "translation 1",
        sourceApi: "TEXT_TRANSLATIONS_V1",
        latestSearchTime: [2026, 3, 22, 9, 10, 0],
      },
      {
        historyKey: "text::2",
        query: "paragraph 2",
        normalizedQuery: "paragraph 2",
        resultType: "TEXT_TRANSLATION",
        summary: "translation 2",
        sourceApi: "TEXT_TRANSLATIONS_V1",
        latestSearchTime: [2026, 3, 22, 9, 9, 0],
      },
      {
        historyKey: "text::3",
        query: "paragraph 3",
        normalizedQuery: "paragraph 3",
        resultType: "TEXT_TRANSLATION",
        summary: "translation 3",
        sourceApi: "TEXT_TRANSLATIONS_V1",
        latestSearchTime: [2026, 3, 22, 9, 8, 0],
      },
      {
        historyKey: "text::4",
        query: "paragraph 4",
        normalizedQuery: "paragraph 4",
        resultType: "TEXT_TRANSLATION",
        summary: "translation 4",
        sourceApi: "TEXT_TRANSLATIONS_V1",
        latestSearchTime: [2026, 3, 22, 9, 7, 0],
      },
    ],
  };
  const pageTwoResponse = {
    content: [exampleHistoryItem],
  };

  server.use(
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      const url = new URL(request.url);
      historyRequests.push(url);
      const page = url.searchParams.get("page");

      if (page === "1") {
        return HttpResponse.json(pageOneResponse);
      }

      if (page === "2") {
        return HttpResponse.json(pageTwoResponse);
      }

      return HttpResponse.json({ content: [] });
    }),
  );

  renderWorkspace(queryClient);

  const queryInput = screen.getByLabelText("输入内容");
  await userEvent.click(queryInput);

  expect(await screen.findByRole("listbox", { name: "最近记录" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: /visible/i })).toBeInTheDocument();
  expect(await screen.findByRole("option", { name: /example/i })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /paragraph 1/i })).not.toBeInTheDocument();

  await waitFor(() => {
    expect(historyRequests.map((url) => url.searchParams.get("page"))).toEqual(["1", "2"]);
    expect(historyRequests.map((url) => url.searchParams.get("size"))).toEqual(["5", "5"]);
  });
});

it("keeps already collected entry history when a later backfill page request fails", async () => {
  const queryClient = createTestQueryClient();
  const historyRequests: URL[] = [];
  const pageOneResponse = {
    content: [
      visibleHistoryItem,
      {
        historyKey: "text::11",
        query: "paragraph 11",
        normalizedQuery: "paragraph 11",
        resultType: "TEXT_TRANSLATION",
        summary: "translation 11",
        sourceApi: "TEXT_TRANSLATIONS_V1",
        latestSearchTime: [2026, 3, 22, 10, 10, 0],
      },
      {
        historyKey: "text::12",
        query: "paragraph 12",
        normalizedQuery: "paragraph 12",
        resultType: "TEXT_TRANSLATION",
        summary: "translation 12",
        sourceApi: "TEXT_TRANSLATIONS_V1",
        latestSearchTime: [2026, 3, 22, 10, 9, 0],
      },
      {
        historyKey: "text::13",
        query: "paragraph 13",
        normalizedQuery: "paragraph 13",
        resultType: "TEXT_TRANSLATION",
        summary: "translation 13",
        sourceApi: "TEXT_TRANSLATIONS_V1",
        latestSearchTime: [2026, 3, 22, 10, 8, 0],
      },
      {
        historyKey: "text::14",
        query: "paragraph 14",
        normalizedQuery: "paragraph 14",
        resultType: "TEXT_TRANSLATION",
        summary: "translation 14",
        sourceApi: "TEXT_TRANSLATIONS_V1",
        latestSearchTime: [2026, 3, 22, 10, 7, 0],
      },
    ],
  };

  server.use(
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      const url = new URL(request.url);
      historyRequests.push(url);
      const page = url.searchParams.get("page");

      if (page === "1") {
        return HttpResponse.json(pageOneResponse);
      }

      if (page === "2") {
        return HttpResponse.json({ message: "history unavailable" }, { status: 500 });
      }

      return HttpResponse.json({ content: [] });
    }),
  );

  renderWorkspace(queryClient);

  const queryInput = screen.getByLabelText("输入内容");
  await userEvent.click(queryInput);

  expect(await screen.findByRole("listbox", { name: "最近记录" })).toBeInTheDocument();
  expect(await screen.findByRole("option", { name: /visible/i })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /paragraph 11/i })).not.toBeInTheDocument();

  await waitFor(() => {
    expect(historyRequests.map((url) => url.searchParams.get("page"))).toEqual(["1", "2"]);
  });
});

it("submits the typed query when enter is pressed without an active suggestion", async () => {
  const requestedQueries: string[] = [];
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/history", () => HttpResponse.json(dropdownHistoryResponse)),
    http.get("http://localhost:8080/api/v1/entries", ({ request }) => {
      requestedQueries.push(new URL(request.url).searchParams.get("q") ?? "");
      return HttpResponse.json(englishWordResponse);
    }),
  );

  renderWorkspace(queryClient);

  const queryInput = screen.getByLabelText("输入内容");
  await userEvent.click(queryInput);
  await screen.findByRole("listbox", { name: "最近记录" });

  await userEvent.type(queryInput, "vi");
  await userEvent.keyboard("{Enter}");

  await waitFor(() => {
    expect(requestedQueries).toEqual(["vi"]);
  });
  expect(queryInput).toHaveValue("vi");
});

it("refreshes the recent-search dropdown after a newly queried word succeeds", async () => {
  const queryClient = createTestQueryClient();
  const historyResponses = [
    dropdownHistoryResponse,
    {
      content: [
        ...dropdownHistoryResponse.content,
        {
          historyKey: "entry::phenomenon::2026-03-28",
          query: "phenomenon",
          normalizedQuery: "phenomenon",
          resultType: "ENGLISH_WORD",
          summary: "现象",
          sourceApi: "ENTRIES_V1",
          latestSearchTime: [2026, 3, 28, 9, 30, 0],
          searchCount: 1,
          searchTimes: [[2026, 3, 28, 9, 30, 0]],
        },
      ],
    },
  ];
  const historyRequests: URL[] = [];

  server.use(
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      historyRequests.push(new URL(request.url));
      const nextResponse = historyResponses.shift();
      const fallbackResponse = historyResponses[historyResponses.length - 1];
      return HttpResponse.json(nextResponse ?? fallbackResponse ?? { content: [] });
    }),
    http.get("http://localhost:8080/api/v1/entries", () => HttpResponse.json(englishWordResponse)),
  );

  renderWorkspace(queryClient);

  const queryInput = screen.getByLabelText("输入内容");
  await userEvent.click(queryInput);

  expect(await screen.findByRole("listbox", { name: "最近记录" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /phenomenon/i })).not.toBeInTheDocument();

  await userEvent.type(queryInput, "phenomenon");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));
  expect(
    await screen.findByText("The northern lights are a natural phenomenon."),
  ).toBeInTheDocument();

  await userEvent.click(queryInput);

  expect(await screen.findByRole("option", { name: /phenomenon/i })).toBeInTheDocument();
  expect(historyRequests).toHaveLength(2);
});

it("closes the recent-search dropdown on escape and when focus leaves the input group", async () => {
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/history", () => HttpResponse.json(dropdownHistoryResponse)),
  );

  renderWorkspace(queryClient);

  const queryInput = screen.getByLabelText("输入内容");
  await userEvent.click(queryInput);
  expect(await screen.findByRole("listbox", { name: "最近记录" })).toBeInTheDocument();

  await userEvent.keyboard("{Escape}");
  await waitFor(() => {
    expect(screen.queryByRole("listbox", { name: "最近记录" })).not.toBeInTheDocument();
  });

  await userEvent.tab();
  act(() => {
    queryInput.focus();
  });
  expect(await screen.findByRole("listbox", { name: "最近记录" })).toBeInTheDocument();

  await userEvent.tab();
  await waitFor(() => {
    expect(screen.queryByRole("listbox", { name: "最近记录" })).not.toBeInTheDocument();
  });
});

it("keeps the recent-search dropdown above the current result section after a query", async () => {
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/history", () => HttpResponse.json(dropdownHistoryResponse)),
    http.get("http://localhost:8080/api/v1/entries", () => HttpResponse.json(englishWordResponse)),
  );

  renderWorkspace(queryClient);

  const queryInput = screen.getByLabelText("输入内容");
  await userEvent.type(queryInput, "visible");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));

  expect(await screen.findByText("The northern lights are a natural phenomenon.")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "结果" })).not.toBeInTheDocument();

  await userEvent.click(queryInput);
  expect(await screen.findByRole("listbox", { name: "最近记录" })).toBeInTheDocument();

  const queryPanelLayer = screen.getByTestId("query-toolbar-layer");
  expect(queryPanelLayer).toHaveClass("relative", "z-30");

  const queryPanelCard = screen.getByRole("heading", { name: "查询面板" }).closest("[class*='rounded-[var(--radius-lg)]']");
  expect(queryPanelCard).not.toBeNull();
  expect(queryPanelCard).toHaveClass("[backdrop-filter:none]");
});

it("does not keep rendering the standalone recent-search region in the workspace", async () => {
  const recentSearchHandler = vi.fn(() => HttpResponse.json(dropdownHistoryResponse));
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/history", () => recentSearchHandler()),
  );

  renderWorkspace(queryClient);

  await waitFor(() => {
    expect(recentSearchHandler).toHaveBeenCalledTimes(1);
  });

  expect(screen.queryByRole("region", { name: "最近搜索" })).not.toBeInTheDocument();
});

it("keeps query controls horizontal longer before stacking", async () => {
  const queryClient = createTestQueryClient();

  renderWorkspace(queryClient);

  expect(screen.getByRole("heading", { name: "查词" })).toBeInTheDocument();

  const typeSelector = screen.getByLabelText("内容类型");
  const submitButton = screen.getByRole("button", { name: "查看结果" });
  const refreshButton = screen.getByRole("button", { name: "重新获取结果" });
  const buttonGroup = submitButton.parentElement;
  const controlsRow = buttonGroup?.parentElement;

  expect(buttonGroup).not.toBeNull();
  expect(controlsRow).not.toBeNull();
  expect(typeSelector.className).toContain("min-[900px]:max-w-[220px]");
  expect(controlsRow!.className).toContain("min-[900px]:grid-cols-[minmax(0,1fr)_auto]");
  expect(buttonGroup!.className).toContain("min-[900px]:justify-end");
  expect(submitButton.className).toContain("min-w-[108px]");
  expect(refreshButton.className).toContain("min-w-[108px]");
});

it("submits a query and renders the mapped result", async () => {
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/entries", () => HttpResponse.json(englishWordResponse)),
  );

  renderWorkspace(queryClient);

  expect(screen.getByRole("heading", { name: "查词" })).toBeInTheDocument();
  expect(screen.getByText("输入单词、词组或句子")).toBeInTheDocument();
  expect(screen.getByLabelText("输入内容")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "查看结果" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "重新获取结果" })).toBeDisabled();

  await userEvent.type(screen.getByLabelText("输入内容"), "phenomenon");
  expect(screen.getByRole("button", { name: "查看结果" })).toBeEnabled();
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));

  expect(
    await screen.findByText("The northern lights are a natural phenomenon."),
  ).toBeInTheDocument();
  expect(screen.queryByText("当前内容：phenomenon")).not.toBeInTheDocument();
});

it("renders zh-to-en results through the shared result switch", async () => {
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/entries", () => HttpResponse.json(zhToEnTermResponse)),
  );

  renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "苹果");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));

  expect(await screen.findByText("水果通常用 apple；公司名称用 Apple。"))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "词条发音" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "加入单词本" })).toBeInTheDocument();
});

it("renders sentence translation results through the shared result switch", async () => {
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/entries", () => HttpResponse.json(sentenceTranslationResponse)),
  );

  renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "你今天怎么样？");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));

  expect(await screen.findAllByText("How are you today?")).toHaveLength(2);
  expect(screen.getByText("可用于日常打招呼。")).toBeInTheDocument();
});

it("refreshes the current query with the refresh endpoint and syncs query cache", async () => {
  const queryClient = createTestQueryClient();
  const refreshedResponse = {
    ...englishWordResponse,
    englishWord: {
      ...englishWordResponse.englishWord!,
      examples: [
        {
          sentence: "Gravity is still a visible phenomenon in daily life.",
          translation: "重力在日常生活中依然是可观察到的现象。",
        },
      ],
    },
  };

  server.use(
    http.get("http://localhost:8080/api/v1/entries", () => HttpResponse.json(englishWordResponse)),
    http.post("http://localhost:8080/api/v1/entries/refresh", () => HttpResponse.json(refreshedResponse)),
  );

  const { unmount } = renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "visible");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));
  expect(await screen.findByText("The northern lights are a natural phenomenon.")).toBeInTheDocument();
  await userEvent.click(await screen.findByRole("button", { name: "重新获取结果" }));
  expect(await screen.findByText("结果已更新")).toBeInTheDocument();
  expect(
    await screen.findByText("Gravity is still a visible phenomenon in daily life."),
  ).toBeInTheDocument();

  unmount();
  renderWorkspace(queryClient);

  expect(
    await screen.findByText("Gravity is still a visible phenomenon in daily life."),
  ).toBeInTheDocument();
});

it("shows a friendly timeout message when the entry request times out", async () => {
  const queryClient = createTestQueryClient();

  fetchEntryMock.mockRejectedValueOnce(
    new ApiError("timeout of 60000ms exceeded", { code: "ECONNABORTED" }),
  );

  renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "phenomenon");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));

  expect(await screen.findByText("获取失败")).toBeInTheDocument();
  expect(screen.getByText("请求超时，请稍后重试")).toBeInTheDocument();
});

it("records one query failure log when the main entry request fails", async () => {
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/entries", () =>
      HttpResponse.json({ message: "temporary failure" }, { status: 500 }),
    ),
  );

  renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "phenomenon");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));

  expect(await screen.findByText("获取失败")).toBeInTheDocument();

  await waitFor(() => {
    expect(queryFailureLogMocks.recordEntryQueryFailure).toHaveBeenCalledTimes(1);
  });

  expect(queryFailureLogMocks.recordEntryQueryFailure).toHaveBeenCalledWith(
    expect.objectContaining({
      query: expect.objectContaining({
        q: "phenomenon",
      }),
      baseUrl: "http://localhost:8080",
      requestTimeoutMs: defaultSettingsValues.requestTimeoutMs,
      error: expect.anything(),
    }),
  );
});

it("retries the same query when the user submits again after a failure", async () => {
  const queryClient = createTestQueryClient();
  let attempts = 0;

  server.use(
    http.get("http://localhost:8080/api/v1/entries", () => {
      attempts += 1;

      if (attempts === 1) {
        return HttpResponse.json({ message: "temporary failure" }, { status: 500 });
      }

      return HttpResponse.json(englishWordResponse);
    }),
  );

  renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "phenomenon");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));
  expect(await screen.findByText("获取失败")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));

  expect(
    await screen.findByText("The northern lights are a natural phenomenon."),
  ).toBeInTheDocument();
});

it("does not record a query failure log when the main entry request succeeds", async () => {
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/entries", () => HttpResponse.json(englishWordResponse)),
  );

  renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "visible");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));

  expect(
    await screen.findByText("The northern lights are a natural phenomenon."),
  ).toBeInTheDocument();

  expect(queryFailureLogMocks.recordEntryQueryFailure).not.toHaveBeenCalled();
});

it("does not record a query failure log when audio generation is unavailable", async () => {
  const queryClient = createTestQueryClient();

  audioApiMocks.fetchAudio.mockResolvedValueOnce({ status: 404 });
  server.use(
    http.get("http://localhost:8080/api/v1/entries", () => HttpResponse.json(englishWordResponse)),
  );

  renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "visible");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));

  expect(
    await screen.findByText("The northern lights are a natural phenomenon."),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "词头发音" }));

  expect(await screen.findByRole("button", { name: "无音频" })).toBeDisabled();
  expect(queryFailureLogMocks.recordEntryQueryFailure).not.toHaveBeenCalled();
});

it("blocks overlong queries before requesting the entry endpoint", async () => {
  const queryClient = createTestQueryClient();
  const entryRequests = vi.fn();
  const overlongQuery = "a".repeat(301);

  server.use(
    http.get("http://localhost:8080/api/v1/entries", () => {
      entryRequests();
      return HttpResponse.json(englishWordResponse);
    }),
  );

  renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), overlongQuery);
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));

  expect(await screen.findByText("输入内容最多 300 个字符，请精简后再试。")).toBeInTheDocument();
  expect(entryRequests).not.toHaveBeenCalled();
  expect(screen.queryByText("获取失败")).not.toBeInTheDocument();
});

it("shows refresh failure feedback while keeping the current result", async () => {
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/entries", () => HttpResponse.json(englishWordResponse)),
    http.post("http://localhost:8080/api/v1/entries/refresh", () =>
      HttpResponse.json({ message: "refresh failed" }, { status: 500 }),
    ),
  );

  renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "visible");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));
  expect(
    await screen.findByText("The northern lights are a natural phenomenon."),
  ).toBeInTheDocument();

  await userEvent.click(await screen.findByRole("button", { name: "重新获取结果" }));

  expect(await screen.findByText("刷新失败")).toBeInTheDocument();
  expect(screen.getByText("The northern lights are a natural phenomenon.")).toBeInTheDocument();
});

it("does not reuse cached results after the authenticated user changes on the same server", async () => {
  const queryClient = createTestQueryClient();
  const secondUserResponse = {
    ...englishWordResponse,
    englishWord: {
      ...englishWordResponse.englishWord!,
      examples: [
        {
          sentence: "A separate account should receive its own cached lookup result.",
          translation: "不同账户应该拿到各自独立缓存的查词结果。",
        },
      ],
    },
  };

  server.use(
    http.get("http://localhost:8080/api/v1/entries", ({ request }) => {
      const auth = request.headers.get("authorization");
      if (auth === "Bearer access-1") {
        return HttpResponse.json(englishWordResponse);
      }

      if (auth === "Bearer access-2") {
        return HttpResponse.json(secondUserResponse);
      }

      return HttpResponse.json({ message: "unauthorized" }, { status: 401 });
    }),
  );

  const { unmount } = renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "phenomenon");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));
  expect(
    await screen.findByText("The northern lights are a natural phenomenon."),
  ).toBeInTheDocument();

  act(() => {
    setAuthenticatedSession({
      accessToken: "access-2",
      refreshToken: "refresh-2",
      user: { id: 2, username: "other" },
    });
  });

  unmount();
  renderWorkspace(queryClient);

  expect(
    await screen.findByText("A separate account should receive its own cached lookup result."),
  ).toBeInTheDocument();
  expect(screen.queryByText("The northern lights are a natural phenomenon.")).not.toBeInTheDocument();
});

it("adds the current result word into a selected wordbook from the workspace", async () => {
  const queryClient = createTestQueryClient();

  server.use(
    http.get("http://localhost:8080/api/v1/entries", () => HttpResponse.json(englishWordResponse)),
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", () =>
      HttpResponse.json([
        { id: 2, name: "考试词汇", createTime: "2026-03-21T10:05:00" },
      ]),
    ),
    http.options("http://localhost:8080/api/v1/wordbooks/2/words", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.post("http://localhost:8080/api/v1/wordbooks/2/words", () => new HttpResponse(null, { status: 200 })),
  );

  renderWorkspace(queryClient);

  await userEvent.type(screen.getByLabelText("输入内容"), "phenomenon");
  await userEvent.click(screen.getByRole("button", { name: "查看结果" }));
  expect(
    await screen.findByText("The northern lights are a natural phenomenon."),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "加入单词本" }));
  await userEvent.click(screen.getByRole("combobox", { name: "目标单词本" }));
  await userEvent.click(await screen.findByRole("option", { name: "考试词汇" }));
  await userEvent.click(screen.getByRole("button", { name: "确认加入" }));

  expect(await screen.findByText("已加入 考试词汇")).toBeInTheDocument();
});
