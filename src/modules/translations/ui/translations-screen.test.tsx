import { HttpResponse, delay, http } from "msw";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter } from "react-router-dom";
import { AppProviders } from "@/app/providers/app-providers";
import { appRoutes } from "@/app/router";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { defaultSettingsValues } from "@/modules/settings/model/settings.schema";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import {
  textTranslationApiResponse,
  textTranslationResult,
} from "@/modules/translations/model/__fixtures__/text-translation-responses";
import type { TextTranslationResponse } from "@/modules/translations/model/text-translation-response";
import { server } from "@/test/msw/server";

type TextTranslationExpectation = {
  text: string;
  normalizedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  segments: ReadonlyArray<{
    text: string;
    translatedText: string;
  }>;
  keyPhrases: ReadonlyArray<{
    phrase: string;
    translation: string;
    note: string;
  }>;
  notes: ReadonlyArray<string>;
};

function createRestoredHistory(overrides?: Partial<TextTranslationExpectation>) {
  const merged = {
    ...textTranslationResult,
    ...overrides,
  };
  const restoredResult: TextTranslationResponse = {
    text: merged.text,
    normalizedText: merged.normalizedText,
    sourceLanguage: merged.sourceLanguage,
    targetLanguage: merged.targetLanguage,
    translatedText: merged.translatedText,
    segments: merged.segments.map((segment) => ({
      text: segment.text,
      translatedText: segment.translatedText,
    })),
    keyPhrases: merged.keyPhrases.map((phrase) => ({
      phrase: phrase.phrase,
      translation: phrase.translation,
      note: phrase.note,
    })),
    notes: [...merged.notes],
  };

  return {
    historyKey: "text::restored::2026-03-30",
    resultType: "TEXT_TRANSLATION" as const,
    restoredResult: {
      kind: "text-translation" as const,
      ...restoredResult,
    },
  };
}

async function renderTranslationsRoute(
  options?: {
    restoredHistory?: ReturnType<typeof createRestoredHistory>;
  },
) {
  const memoryRouter = createMemoryRouter(appRoutes, {
    initialEntries: [
      options?.restoredHistory
        ? {
            pathname: "/translations",
            state: {
              restoredHistory: options.restoredHistory,
            },
          }
        : "/translations",
    ],
  });
  const view = render(<AppProviders router={memoryRouter} />);

  return view;
}

async function chooseTranslationDirection(directionLabel: "中译英" | "英译中" | "自动检测") {
  await userEvent.click(screen.getByRole("combobox", { name: "翻译方向" }));
  await userEvent.click(await screen.findByRole("option", { name: directionLabel }));
}

function expectTextTranslationResult(response: TextTranslationExpectation) {
  expect(screen.getAllByText(response.translatedText).length).toBeGreaterThan(0);
  expect(screen.getByText("原文")).toBeInTheDocument();
  expect(screen.getByTestId("translation-source-preview")).toHaveTextContent(response.text);
  expect(screen.queryByText(`原文：${response.text}`)).not.toBeInTheDocument();

  for (const segment of response.segments) {
    expect(screen.getAllByText(segment.text).length).toBeGreaterThan(0);
    expect(screen.getAllByText(segment.translatedText).length).toBeGreaterThan(0);
  }

  for (const phrase of response.keyPhrases) {
    expect(screen.getAllByText(phrase.phrase).length).toBeGreaterThan(0);
    expect(screen.getAllByText(phrase.translation).length).toBeGreaterThan(0);
    expect(screen.getAllByText(phrase.note).length).toBeGreaterThan(0);
  }

  for (const note of response.notes) {
    expect(screen.getAllByText(note).length).toBeGreaterThan(0);
  }
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
  useSettingsStore.setState({
    isHydrated: true,
    values: {
      ...defaultSettingsValues,
      baseUrl: "http://localhost:8080",
    },
  });
  server.use(
    http.options("http://localhost:8080/api/v1/auth/me", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/auth/me", () =>
      HttpResponse.json({ id: 1, username: "tester" }),
    ),
  );
});

it("asks the user to log in before using protected translation features", async () => {
  const historyRequests: URL[] = [];

  server.use(
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      historyRequests.push(new URL(request.url));
      return HttpResponse.json({ content: [] });
    }),
  );

  useAuthStore.setState(useAuthStore.getInitialState());
  await renderTranslationsRoute();

  expect(await screen.findByText("请先完成设置并登录")).toBeInTheDocument();
  expect(historyRequests).toHaveLength(0);
});

it("clears translated content after the session changes on the same mount", async () => {
  server.use(
    http.get("http://localhost:8080/api/v1/history", () => HttpResponse.json({ content: [] })),
    http.post("http://localhost:8080/api/v1/text-translations", () =>
      HttpResponse.json(textTranslationApiResponse),
    ),
  );

  await renderTranslationsRoute();

  await chooseTranslationDirection("中译英");
  await userEvent.type(screen.getByRole("textbox"), textTranslationResult.text);
  await userEvent.click(screen.getByRole("button", { name: "翻译" }));

  expect(await screen.findByText(textTranslationResult.translatedText)).toBeInTheDocument();

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
    expect(screen.queryByText(textTranslationResult.translatedText)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

it("renders the translation workspace with a separate recent-history pane instead of an input dropdown", async () => {
  const historyRequests: URL[] = [];

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", ({ request }) => {
      historyRequests.push(new URL(request.url));
      return HttpResponse.json({
        content: [
          {
            historyKey: "text::2026-03-30",
            query: "今天天气真好",
            normalizedQuery: "今天天气真好",
            resultType: "TEXT_TRANSLATION",
            summary: "The weather is great today",
            sourceApi: "TEXT_TRANSLATIONS_V1",
            latestSearchTime: [2026, 3, 30, 9, 0, 0],
            searchCount: 1,
            searchTimes: [[2026, 3, 30, 9, 0, 0]],
          },
        ],
      });
    }),
  );

  await renderTranslationsRoute();

  expect(await screen.findByRole("heading", { name: "翻译" })).toBeInTheDocument();
  const recentHistoryRegion = screen.getByRole("region", { name: "最近查询" });
  expect(recentHistoryRegion).toBeVisible();
  const layout = screen.getByTestId("translations-layout");
  expect(layout.className).toContain("grid");
  expect(layout.className).toContain("gap-5");
  expect(layout.className).toContain("min-[900px]:grid-cols-[minmax(0,1.65fr)_minmax(13.5rem,0.8fr)]");
  expect(layout.className).not.toContain("lg:grid-cols-[minmax(0,1.75fr)_minmax(18rem,0.95fr)]");
  expect(layout.className).not.toContain("xl:grid-cols-[minmax(0,1.75fr)_minmax(18rem,0.95fr)]");
  expect(layout).toContainElement(recentHistoryRegion);
  expect(within(recentHistoryRegion).getByText("最近查询")).toBeVisible();
  expect(await within(recentHistoryRegion).findByText("今天天气真好")).toBeInTheDocument();
  expect(within(recentHistoryRegion).queryByRole("textbox")).not.toBeInTheDocument();
  expect(within(recentHistoryRegion).queryByRole("combobox")).not.toBeInTheDocument();
  expect(within(recentHistoryRegion).queryByRole("listbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("listbox", { name: "最近记录" })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "最近记录" })).not.toBeInTheDocument();

  const textInput = screen.getByRole("textbox");
  expect(textInput.tagName).toBe("TEXTAREA");
  expect(recentHistoryRegion).not.toContainElement(textInput);
  expect(screen.getByRole("combobox", { name: "翻译方向" })).toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "源语言" })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "目标语言" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "翻译" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("combobox", { name: "翻译方向" }));
  const directionOptions = await screen.findAllByRole("option");
  expect(directionOptions.map((option) => option.textContent?.trim() ?? "")).toEqual([
    "中译英",
    "英译中",
    "自动检测",
  ]);
  await userEvent.click(directionOptions[2] ?? directionOptions[0]!);

  await waitFor(() => {
    expect(historyRequests).toHaveLength(1);
    expect(historyRequests[0]?.searchParams.get("page")).toBe("1");
    expect(historyRequests[0]?.searchParams.get("size")).toBe("5");
  });
});

it("backfills translation history from later pages when page 1 has no TEXT_TRANSLATION items", async () => {
  const historyRequests: URL[] = [];
  const pageOneResponse = {
    content: [
      {
        historyKey: "entry::1",
        query: "visible entry 1",
        normalizedQuery: "visible entry 1",
        resultType: "ENGLISH_WORD",
        summary: "entry summary 1",
        sourceApi: "ENTRIES_V1",
        latestSearchTime: [2026, 3, 30, 10, 0, 0],
        searchCount: 1,
        searchTimes: [[2026, 3, 30, 10, 0, 0]],
      },
      {
        historyKey: "entry::2",
        query: "visible entry 2",
        normalizedQuery: "visible entry 2",
        resultType: "ENGLISH_WORD",
        summary: "entry summary 2",
        sourceApi: "ENTRIES_V1",
        latestSearchTime: [2026, 3, 30, 9, 59, 0],
        searchCount: 1,
        searchTimes: [[2026, 3, 30, 9, 59, 0]],
      },
      {
        historyKey: "entry::3",
        query: "visible entry 3",
        normalizedQuery: "visible entry 3",
        resultType: "SENTENCE_TRANSLATION",
        summary: "entry summary 3",
        sourceApi: "ENTRIES_V1",
        latestSearchTime: [2026, 3, 30, 9, 58, 0],
        searchCount: 1,
        searchTimes: [[2026, 3, 30, 9, 58, 0]],
      },
      {
        historyKey: "entry::4",
        query: "visible entry 4",
        normalizedQuery: "visible entry 4",
        resultType: "ZH_TO_EN_TERM",
        summary: "entry summary 4",
        sourceApi: "ENTRIES_V1",
        latestSearchTime: [2026, 3, 30, 9, 57, 0],
        searchCount: 1,
        searchTimes: [[2026, 3, 30, 9, 57, 0]],
      },
      {
        historyKey: "entry::5",
        query: "visible entry 5",
        normalizedQuery: "visible entry 5",
        resultType: "ENGLISH_WORD",
        summary: "entry summary 5",
        sourceApi: "ENTRIES_V1",
        latestSearchTime: [2026, 3, 30, 9, 56, 0],
        searchCount: 1,
        searchTimes: [[2026, 3, 30, 9, 56, 0]],
      },
    ],
  };
  const pageTwoResponse = {
    content: [
      {
        historyKey: "text::2026-03-30::later",
        query: "晚一点出现的翻译记录",
        normalizedQuery: "晚一点出现的翻译记录",
        resultType: "TEXT_TRANSLATION",
        summary: "A later translation history item",
        sourceApi: "TEXT_TRANSLATIONS_V1",
        latestSearchTime: [2026, 3, 30, 9, 55, 0],
        searchCount: 1,
        searchTimes: [[2026, 3, 30, 9, 55, 0]],
      },
    ],
  };

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
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

  await renderTranslationsRoute();

  const recentHistoryRegion = await screen.findByRole("region", { name: "最近查询" });
  expect(await within(recentHistoryRegion).findByText("晚一点出现的翻译记录")).toBeInTheDocument();
  expect(within(recentHistoryRegion).queryByText("visible entry 1")).not.toBeInTheDocument();

  await waitFor(() => {
    expect(historyRequests.map((url) => url.searchParams.get("page"))).toEqual(["1", "2"]);
    expect(historyRequests.map((url) => url.searchParams.get("size"))).toEqual(["5", "5"]);
  });
});

it("submits valid text to POST /api/v1/text-translations and renders the response fields", async () => {
  const postBodies: Array<Record<string, unknown>> = [];

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", () => HttpResponse.json({ content: [] })),
    http.options("http://localhost:8080/api/v1/text-translations", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.post("http://localhost:8080/api/v1/text-translations", async ({ request }) => {
      postBodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(textTranslationApiResponse);
    }),
  );

  await renderTranslationsRoute();

  await screen.findByRole("heading", { name: "翻译" });
  await chooseTranslationDirection("中译英");
  await userEvent.type(screen.getByRole("textbox"), "今天天气真好!!! 适合出去走走。");
  await userEvent.click(screen.getByRole("button", { name: "翻译" }));

  await waitFor(() => {
    expect(postBodies).toHaveLength(1);
    expect(postBodies[0]).toEqual({
      text: "今天天气真好!!! 适合出去走走。",
      sourceLanguage: "zh",
      targetLanguage: "en",
    });
  });

  expect(await screen.findByText(textTranslationResult.translatedText)).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "结果" })).not.toBeInTheDocument();
  expect(screen.queryByText(`当前内容：${textTranslationResult.text}`)).not.toBeInTheDocument();
  expectTextTranslationResult(textTranslationResult);
});

it("maps 自动检测 to the opposite language based on the input text", async () => {
  const postBodies: Array<Record<string, unknown>> = [];

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", () => HttpResponse.json({ content: [] })),
    http.options("http://localhost:8080/api/v1/text-translations", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.post("http://localhost:8080/api/v1/text-translations", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      postBodies.push(body);

      if (body.text === "Good morning") {
        return HttpResponse.json({
          ...textTranslationApiResponse,
          text: "Good morning",
          normalizedText: "good morning",
          sourceLanguage: "en",
          targetLanguage: "zh",
          translatedText: "早上好",
          segments: [{ sourceText: "Good morning", translatedText: "早上好" }],
          keyPhrases: [{ sourceText: "good morning", translatedText: "早上好", note: "常见晨间问候。" }],
          notes: "适用于早晨见面时。",
        });
      }

      return HttpResponse.json(textTranslationApiResponse);
    }),
  );

  await renderTranslationsRoute();

  await screen.findByRole("heading", { name: "翻译" });
  await chooseTranslationDirection("自动检测");
  const textInput = screen.getByRole("textbox");
  await userEvent.type(textInput, "早上好");
  await userEvent.click(screen.getByRole("button", { name: "翻译" }));

  await waitFor(() => {
    expect(postBodies[0]).toEqual({
      text: "早上好",
      sourceLanguage: "zh",
      targetLanguage: "en",
    });
  });

  await userEvent.clear(textInput);
  await userEvent.type(textInput, "Good morning");
  await userEvent.click(screen.getByRole("button", { name: "翻译" }));

  await waitFor(() => {
    expect(postBodies[1]).toEqual({
      text: "Good morning",
      sourceLanguage: "en",
      targetLanguage: "zh",
    });
  });
});

it("preserves the previous successful translation result when a later request fails", async () => {
  const postBodies: Array<Record<string, unknown>> = [];
  let failedRequestSettled = false;

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", () => HttpResponse.json({ content: [] })),
    http.options("http://localhost:8080/api/v1/text-translations", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.post("http://localhost:8080/api/v1/text-translations", async ({ request }) => {
      postBodies.push((await request.json()) as Record<string, unknown>);

      if (postBodies.length === 1) {
        return HttpResponse.json(textTranslationApiResponse);
      }

      await delay(20);
      failedRequestSettled = true;
      return HttpResponse.json({ message: "translate failed" }, { status: 500 });
    }),
  );

  await renderTranslationsRoute();

  await screen.findByRole("heading", { name: "翻译" });
  await chooseTranslationDirection("中译英");
  const textInput = screen.getByRole("textbox");
  await userEvent.type(textInput, textTranslationResult.text);
  await userEvent.click(screen.getByRole("button", { name: "翻译" }));
  expect(await screen.findByText(textTranslationResult.translatedText)).toBeInTheDocument();
  expectTextTranslationResult(textTranslationResult);

  await userEvent.clear(textInput);
  await userEvent.type(textInput, "再见");
  await userEvent.click(screen.getByRole("button", { name: "翻译" }));

  await waitFor(() => {
    expect(postBodies).toHaveLength(2);
    expect(postBodies[0]).toEqual(
      expect.objectContaining({
        text: textTranslationResult.text,
        sourceLanguage: expect.any(String),
        targetLanguage: expect.any(String),
      }),
    );
    expect(postBodies[1]).toEqual(
      expect.objectContaining({
        text: "再见",
        sourceLanguage: expect.any(String),
        targetLanguage: expect.any(String),
      }),
    );
    expect(postBodies[0]?.sourceLanguage).toBe(postBodies[1]?.sourceLanguage);
    expect(postBodies[0]?.targetLanguage).toBe(postBodies[1]?.targetLanguage);
    expect(postBodies[0]?.sourceLanguage).not.toBe(postBodies[0]?.targetLanguage);
    expect(failedRequestSettled).toBe(true);
  });
  expectTextTranslationResult(textTranslationResult);
});

it("shows only TEXT_TRANSLATION recent history and restores a saved detail result without reposting", async () => {
  const detailRequests: string[] = [];
  const postBodies: Array<Record<string, unknown>> = [];
  let allowTranslationPost = false;
  const restoredHistoryDetailResponse = {
    ...textTranslationApiResponse,
    text: "Good morning",
    normalizedText: "good morning",
    sourceLanguage: "en",
    targetLanguage: "zh",
    translatedText: "早上好",
    segments: [
      {
        sourceText: "Good morning",
        translatedText: "早上好",
      },
    ],
    keyPhrases: [
      {
        sourceText: "good morning",
        translatedText: "早上好",
        note: "常见晨间问候。",
      },
    ],
    notes: "适用于早晨见面时。",
  };
  const restoredHistoryDetailResult = {
    ...textTranslationResult,
    text: "Good morning",
    normalizedText: "good morning",
    sourceLanguage: "en",
    targetLanguage: "zh",
    translatedText: "早上好",
    segments: [
      {
        text: "Good morning",
        translatedText: "早上好",
      },
    ],
    keyPhrases: [
      {
        phrase: "good morning",
        translation: "早上好",
        note: "常见晨间问候。",
      },
    ],
    notes: ["适用于早晨见面时。"],
  };

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", () =>
      HttpResponse.json({
        content: [
          {
            historyKey: "entry::2026-03-29",
            query: "entry-only-query",
            normalizedQuery: "entry-only-query",
            resultType: "ENGLISH_WORD",
            summary: "Entry-only summary should stay hidden",
            sourceApi: "ENTRIES_V1",
            latestSearchTime: [2026, 3, 29, 10, 0, 0],
            searchCount: 1,
            searchTimes: [[2026, 3, 29, 10, 0, 0]],
          },
          {
            historyKey: "text::2026-03-30",
            query: "Good morning",
            normalizedQuery: "good morning",
            resultType: "TEXT_TRANSLATION",
            summary: "早上好",
            sourceApi: "TEXT_TRANSLATIONS_V1",
            latestSearchTime: [2026, 3, 30, 8, 0, 0],
            searchCount: 1,
            searchTimes: [[2026, 3, 30, 8, 0, 0]],
          },
        ],
      }),
    ),
    http.options("http://localhost:8080/api/v1/history/:historyKey", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history/:historyKey", ({ params }) => {
      detailRequests.push(String(params.historyKey));
      return HttpResponse.json({
        historyKey: String(params.historyKey),
        query: "Good morning",
        resultType: "TEXT_TRANSLATION",
        response: restoredHistoryDetailResponse,
      });
    }),
    http.options("http://localhost:8080/api/v1/text-translations", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.post("http://localhost:8080/api/v1/text-translations", async ({ request }) => {
      if (!allowTranslationPost) {
        throw new Error(`Unexpected restore replay to /text-translations: ${request.url}`);
      }

      postBodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(textTranslationApiResponse);
    }),
  );

  await renderTranslationsRoute();

  const recentHistoryRegion = await screen.findByRole("region", { name: "最近查询" });
  expect(await within(recentHistoryRegion).findByText("Good morning")).toBeInTheDocument();
  expect(within(recentHistoryRegion).queryByText("entry-only-query")).not.toBeInTheDocument();
  expect(within(recentHistoryRegion).queryByText("Entry-only summary should stay hidden")).not.toBeInTheDocument();

  await userEvent.click(within(recentHistoryRegion).getByText("Good morning"));

  await waitFor(() => {
    expect(detailRequests).toEqual(["text::2026-03-30"]);
  });
  expect(screen.getByDisplayValue("Good morning")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "翻译方向" })).toHaveTextContent("英译中");
  expectTextTranslationResult(restoredHistoryDetailResult);

  allowTranslationPost = true;
  await userEvent.clear(screen.getByRole("textbox"));
  await userEvent.type(screen.getByRole("textbox"), "晚上好");
  await userEvent.click(screen.getByRole("button", { name: "翻译" }));

  await waitFor(() => {
    expect(postBodies).toEqual([
      {
        text: "晚上好",
        sourceLanguage: "en",
        targetLanguage: "zh",
      },
    ]);
  });
});

it("restores route-state TEXT_TRANSLATION history into the page without posting a new translation request", async () => {
  const postBodies: Array<Record<string, unknown>> = [];
  let allowTranslationPost = false;
  const restoredRouteStateResponse = {
    ...textTranslationResult,
    text: "Good afternoon",
    normalizedText: "good afternoon",
    sourceLanguage: "en",
    targetLanguage: "zh",
    translatedText: "午安",
    segments: [
      {
        text: "Good afternoon",
        translatedText: "午安",
      },
    ],
    keyPhrases: [
      {
        phrase: "good afternoon",
        translation: "午安",
        note: "用于下午时段问候。",
      },
    ],
    notes: ["比通用 hello 更贴近时间语境。"],
  };
  const restoredHistory = createRestoredHistory(restoredRouteStateResponse);

  server.use(
    http.options("http://localhost:8080/api/v1/history", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/history", () => HttpResponse.json({ content: [] })),
    http.options("http://localhost:8080/api/v1/text-translations", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.post("http://localhost:8080/api/v1/text-translations", async ({ request }) => {
      if (!allowTranslationPost) {
        throw new Error(`Unexpected route-state replay to /text-translations: ${request.url}`);
      }

      postBodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(textTranslationApiResponse);
    }),
  );

  await renderTranslationsRoute({ restoredHistory });

  expect(await screen.findByRole("heading", { name: "翻译" })).toBeInTheDocument();
  expect(screen.getByDisplayValue("Good afternoon")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "翻译方向" })).toHaveTextContent("英译中");
  expectTextTranslationResult(restoredRouteStateResponse);

  allowTranslationPost = true;
  await userEvent.clear(screen.getByRole("textbox"));
  await userEvent.type(screen.getByRole("textbox"), "傍晚好");
  await userEvent.click(screen.getByRole("button", { name: "翻译" }));

  await waitFor(() => {
    expect(postBodies).toEqual([
      {
        text: "傍晚好",
        sourceLanguage: "en",
        targetLanguage: "zh",
      },
    ]);
  });
});
