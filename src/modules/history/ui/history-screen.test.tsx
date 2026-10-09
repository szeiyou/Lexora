import { HttpResponse, http } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";
import { AppShell } from "@/app/layouts/app-shell";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { HistoryScreen } from "@/modules/history/screens/history-screen";
import { sentenceTranslationResponse } from "@/modules/query/model/__fixtures__/entry-responses";
import { WorkspaceScreen } from "@/modules/query/screens/workspace-screen";
import { useQueryStore } from "@/modules/query/model/query-store";
import { defaultSettingsValues } from "@/modules/settings/model/settings.schema";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { server } from "@/test/msw/server";

function TranslationsStateProbe() {
  const location = useLocation();
  const state = location.state as
    | {
        restoredHistory?: {
          historyKey?: string;
          resultType?: string;
          restoredResult?: { translatedText?: string };
        };
      }
    | undefined;

  return (
    <div>
      <h1>翻译</h1>
      <p data-testid="translation-route-state-result-type">
        {state?.restoredHistory?.resultType ?? "MISSING_RESULT_TYPE"}
      </p>
      <p data-testid="translation-route-state-history-key">
        {state?.restoredHistory?.historyKey ?? "MISSING_HISTORY_KEY"}
      </p>
      <p data-testid="translation-route-state-translated-text">
        {state?.restoredHistory?.restoredResult?.translatedText ?? "MISSING_TRANSLATED_TEXT"}
      </p>
    </div>
  );
}

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

function renderHistoryScreen() {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <WorkspaceScreen /> },
          { path: "history", element: <HistoryScreen /> },
          { path: "translations", element: <TranslationsStateProbe /> },
        ],
      },
    ],
    {
      initialEntries: ["/history"],
    },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
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
  useQueryStore.setState(useQueryStore.getInitialState());
  server.use(
    http.options("http://localhost:8080/api/v1/auth/me", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/auth/me", () =>
      HttpResponse.json({ id: 1, username: "tester" }),
    ),
  );
});

it("asks the user to log in before opening protected history", async () => {
  const historyRequests: URL[] = [];

  server.use(
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      historyRequests.push(new URL(request.url));
      return HttpResponse.json({ content: [] });
    }),
  );

  useAuthStore.setState(useAuthStore.getInitialState());
  renderHistoryScreen();

  expect(await screen.findByText("请先完成设置并登录")).toBeInTheDocument();
  expect(historyRequests).toHaveLength(0);
});

it("opens SENTENCE_TRANSLATION history via historyKey detail and restores without replaying /entries", async () => {
  const detailRequests: string[] = [];

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      const url = new URL(request.url);

      if (url.searchParams.get("size") === "5") {
        return HttpResponse.json({
          content: [
            {
              historyKey: "sentence::2026-03-21",
              query: "你今天怎么样？",
              resultType: "SENTENCE_TRANSLATION",
              summary: "How are you today?",
              latestSearchTime: [2026, 3, 21, 12, 0, 0],
            },
          ],
        });
      }

      return HttpResponse.json({
        content: [
          {
            historyKey: "sentence::2026-03-21",
            query: "你今天怎么样？",
            normalizedQuery: "你今天怎么样？",
            resultType: "SENTENCE_TRANSLATION",
            summary: "How are you today?",
            sourceApi: "ENTRIES_V1",
            latestSearchTime: [2026, 3, 21, 12, 0, 0],
            searchCount: 2,
            searchTimes: [
              [2026, 3, 21, 12, 0, 0],
              [2026, 3, 20, 8, 30, 0],
            ],
          },
        ],
      });
    }),
    http.options("http://localhost:8080/api/v1/history/:historyKey", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history/:historyKey", ({ params }) => {
      detailRequests.push(String(params.historyKey));
      return HttpResponse.json({
        historyKey: String(params.historyKey),
        query: "你今天怎么样？",
        resultType: "SENTENCE_TRANSLATION",
        response: sentenceTranslationResponse,
      });
    }),
    http.options("http://localhost:8080/api/v1/entries", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/entries", ({ request }) => {
      throw new Error(`Unexpected history reopen replay to /entries: ${request.url}`);
    }),
  );

  renderHistoryScreen();

  expect(await screen.findByText("你今天怎么样？")).toBeInTheDocument();
  await userEvent.click(await screen.findByRole("button", { name: "打开历史记录 你今天怎么样？" }));

  expect(await screen.findByRole("heading", { name: "查词" })).toBeInTheDocument();
  expect(screen.getByDisplayValue("你今天怎么样？")).toBeInTheDocument();
  await waitFor(() => {
    expect(detailRequests).toEqual(["sentence::2026-03-21"]);
  });
  expect(screen.getByText("可用于日常打招呼。")).toBeInTheDocument();
});

it("opens TEXT_TRANSLATION history via historyKey detail and routes to /translations without replaying POST /text-translations", async () => {
  const detailRequests: string[] = [];

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      const url = new URL(request.url);

      if (url.searchParams.get("size") === "5") {
        return HttpResponse.json({
          content: [
            {
              historyKey: "text::2026-03-22",
              query: "早上好",
              resultType: "TEXT_TRANSLATION",
              summary: "Good morning",
              latestSearchTime: [2026, 3, 22, 9, 10, 0],
            },
          ],
        });
      }

      return HttpResponse.json({
        content: [
          {
            historyKey: "text::2026-03-22",
            query: "早上好",
            normalizedQuery: "早上好",
            resultType: "TEXT_TRANSLATION",
            summary: "Good morning",
            sourceApi: "TEXT_TRANSLATIONS_V1",
            latestSearchTime: [2026, 3, 22, 9, 10, 0],
            searchCount: 1,
            searchTimes: [[2026, 3, 22, 9, 10, 0]],
          },
        ],
      });
    }),
    http.options("http://localhost:8080/api/v1/history/:historyKey", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history/:historyKey", ({ params }) => {
      detailRequests.push(String(params.historyKey));
      return HttpResponse.json({
        historyKey: String(params.historyKey),
        query: "早上好",
        resultType: "TEXT_TRANSLATION",
        response: {
          text: "早上好",
          normalizedText: "早上好",
          sourceLanguage: "zh",
          targetLanguage: "en",
          translatedText: "Good morning",
          segments: [],
          keyPhrases: [],
          notes: ["常见问候语"],
        },
      });
    }),
    http.options("http://localhost:8080/api/v1/text-translations", () => new HttpResponse(null, { status: 204 })),
    http.post("http://localhost:8080/api/v1/text-translations", ({ request }) => {
      throw new Error(`Unexpected history reopen replay to /text-translations: ${request.url}`);
    }),
    http.options("http://localhost:8080/api/v1/entries", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/entries", ({ request }) => {
      throw new Error(`Unexpected history reopen replay to /entries: ${request.url}`);
    }),
  );

  renderHistoryScreen();

  expect(await screen.findByText("早上好")).toBeInTheDocument();
  await userEvent.click(await screen.findByRole("button", { name: "打开历史记录 早上好" }));

  await waitFor(() => {
    expect(detailRequests).toEqual(["text::2026-03-22"]);
  });
  expect(await screen.findByRole("heading", { name: "翻译" })).toBeInTheDocument();
  expect(screen.getByTestId("translation-route-state-result-type")).toHaveTextContent("TEXT_TRANSLATION");
  expect(screen.getByTestId("translation-route-state-history-key")).toHaveTextContent("text::2026-03-22");
  expect(screen.getByTestId("translation-route-state-translated-text")).toHaveTextContent("Good morning");
});
