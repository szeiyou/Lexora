import { HttpResponse, delay, http } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { useAuthStore } from "@/modules/auth/model/auth.store";
import { WordbooksScreen } from "@/modules/wordbooks/ui/wordbooks-screen";
import { defaultSettingsValues } from "@/modules/settings/model/settings.schema";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { server } from "@/test/msw/server";
import { vi } from "vitest";

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => routerMocks.navigate,
  };
});

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

function renderWordbooksScreen() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <WordbooksScreen />
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
  routerMocks.navigate.mockReset();
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

it("does not fetch wordbooks when the session is anonymous", async () => {
  const requests = vi.fn();

  server.use(
    http.get("http://localhost:8080/api/v1/wordbooks", () => {
      requests();
      return HttpResponse.json([]);
    }),
  );

  useAuthStore.setState(useAuthStore.getInitialState());
  renderWordbooksScreen();

  expect(await screen.findByText("请先完成设置并登录")).toBeInTheDocument();
  expect(requests).not.toHaveBeenCalled();
});

it("creates a new wordbook and opens its detail pane", async () => {
  let wordbooks = [
    {
      id: 1,
      name: "重要单词",
      createTime: "2026-03-21T10:00:00",
    },
  ];

  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", () => HttpResponse.json(wordbooks)),
    http.post("http://localhost:8080/api/v1/wordbooks", ({ request }) => {
      const url = new URL(request.url);
      const name = url.searchParams.get("name") ?? "未命名单词本";
      const created = {
        id: 2,
        name,
        createTime: "2026-03-21T10:05:00",
      };
      wordbooks = [...wordbooks, created];
      return HttpResponse.json(created);
    }),
    http.options("http://localhost:8080/api/v1/wordbooks/2/words", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.get("http://localhost:8080/api/v1/wordbooks/2/words", () => HttpResponse.json([])),
  );

  renderWordbooksScreen();

  expect(await screen.findByText("收藏并整理你想记住的词")).toBeInTheDocument();
  const layout = screen.getByTestId("wordbooks-layout");
  expect(layout.className).toContain("grid");
  expect(layout.className).toContain("gap-6");
  expect(layout.className).toContain("min-[880px]:grid-cols-[minmax(12.5rem,14.5rem)_minmax(0,1fr)]");
  expect(layout.className).not.toContain("xl:grid-cols-[280px_minmax(0,1fr)]");
  const wordbooksListHeading = screen.getByRole("heading", { name: "我的单词本" });
  expect(wordbooksListHeading).toBeInTheDocument();
  const wordbooksListCard = wordbooksListHeading.closest('[class*="rounded-[var(--radius-lg)]"]');
  expect(wordbooksListCard).not.toBeNull();
  expect(wordbooksListCard?.className).toContain("min-[880px]:sticky");
  expect(wordbooksListCard?.className).toContain("min-[880px]:top-0");
  expect(wordbooksListCard?.className).toContain("min-[880px]:self-start");
  expect(wordbooksListCard?.className).not.toContain("xl:sticky");
  expect(wordbooksListCard?.className).not.toContain("xl:top-0");
  expect(wordbooksListCard?.className).not.toContain("xl:self-start");
  expect(screen.getByText("选择一个单词本查看内容")).toBeInTheDocument();
  await screen.findByText("重要单词");
  await userEvent.click(screen.getByRole("button", { name: "新建单词本" }));
  await userEvent.type(screen.getByLabelText("单词本名称"), "考试词汇");
  await userEvent.click(screen.getByRole("button", { name: "保存单词本" }));

  expect(await screen.findByRole("heading", { name: "考试词汇" })).toBeInTheDocument();
});

it("opens a saved word in the lookup workspace", async () => {
  const wordbooks = [
    {
      id: 1,
      name: "重要单词",
      createTime: "2026-03-21T10:00:00",
    },
  ];

  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", () => HttpResponse.json(wordbooks)),
    http.options("http://localhost:8080/api/v1/wordbooks/1/words", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.get("http://localhost:8080/api/v1/wordbooks/1/words", () =>
      HttpResponse.json([
        {
          word: "phenomenon",
          partOfSpeech: "n.",
          meaning: "旧的简略释义",
          createTime: "2026-03-21T10:10:00",
        },
      ]),
    ),
  );

  renderWordbooksScreen();

  await userEvent.click(await screen.findByRole("button", { name: "打开单词本 重要单词" }));
  const openWordButton = await screen.findByRole("button", {
    name: "打开单词 phenomenon 的详情",
  });

  expect(openWordButton.className).toContain("cursor-pointer");
  await userEvent.click(openWordButton);

  expect(routerMocks.navigate).toHaveBeenCalledWith("/", {
    state: {
      wordbookWordLookup: {
        query: "phenomenon",
      },
    },
  });
});

it("keeps delete confirmation open and shows an error when delete fails", async () => {
  const wordbooks = [
    {
      id: 1,
      name: "重要单词",
      createTime: "2026-03-21T10:00:00",
    },
  ];

  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", () => HttpResponse.json(wordbooks)),
    http.options("http://localhost:8080/api/v1/wordbooks/1/words", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.get("http://localhost:8080/api/v1/wordbooks/1/words", () => HttpResponse.json([])),
    http.delete("http://localhost:8080/api/v1/wordbooks/1", async () => {
      await delay(50);
      return HttpResponse.json({ message: "delete failed" }, { status: 500 });
    }),
  );

  renderWordbooksScreen();

  await userEvent.click(await screen.findByRole("button", { name: "打开单词本 重要单词" }));
  await userEvent.click(screen.getByRole("button", { name: "删除单词本" }));

  expect(screen.getByRole("alertdialog", { name: "删除单词本" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "删除单词本" }));

  await waitFor(() => {
    expect(screen.getByRole("alertdialog", { name: "删除单词本" })).toBeInTheDocument();
  });
  await waitFor(() => {
    expect(screen.getByText("删除失败")).toBeInTheDocument();
    expect(screen.getAllByText("删除失败，请稍后重试。").length).toBeGreaterThan(0);
  });
  expect(screen.getByRole("button", { name: "打开单词本 重要单词", hidden: true })).toBeInTheDocument();
});

it("shows the loading-state copy while fetching wordbooks", async () => {
  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", async () => {
      await delay(100);
      return HttpResponse.json([]);
    }),
  );

  renderWordbooksScreen();

  expect(await screen.findByText("正在加载单词本")).toBeInTheDocument();
  expect(await screen.findByText("暂无单词本")).toBeInTheDocument();
});

it("shows the error-state copy when loading wordbooks fails", async () => {
  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", () =>
      HttpResponse.json({ message: "load failed" }, { status: 500 }),
    ),
  );

  renderWordbooksScreen();

  expect(await screen.findByText("单词本加载失败")).toBeInTheDocument();
});

it("keeps the editor open and shows an error when create fails", async () => {
  const wordbooks = [
    {
      id: 1,
      name: "重要单词",
      createTime: "2026-03-21T10:00:00",
    },
  ];

  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", () => HttpResponse.json(wordbooks)),
    http.post("http://localhost:8080/api/v1/wordbooks", async () => {
      await delay(50);
      return HttpResponse.json({ message: "create failed" }, { status: 500 });
    }),
  );

  renderWordbooksScreen();

  const wordbookButton = await screen.findByRole("button", { name: "打开单词本 重要单词" });
  expect(wordbookButton.className).toContain("cursor-pointer");
  await userEvent.click(screen.getByRole("button", { name: "新建单词本" }));
  await userEvent.type(screen.getByLabelText("单词本名称"), "考试词汇");
  await userEvent.click(screen.getByRole("button", { name: "保存单词本" }));

  await waitFor(() => {
    expect(screen.getByRole("dialog", { name: "新建单词本" })).toBeInTheDocument();
  });
  expect(screen.getByDisplayValue("考试词汇")).toBeInTheDocument();
  expect(await screen.findByText("保存失败，请稍后重试。")).toBeInTheDocument();
});

it("keeps the editor open and shows an error when rename fails", async () => {
  const wordbooks = [
    {
      id: 1,
      name: "重要单词",
      createTime: "2026-03-21T10:00:00",
    },
  ];

  server.use(
    http.options("http://localhost:8080/api/v1/wordbooks", () => new HttpResponse(null, { status: 204 })),
    http.get("http://localhost:8080/api/v1/wordbooks", () => HttpResponse.json(wordbooks)),
    http.options("http://localhost:8080/api/v1/wordbooks/1/words", () =>
      new HttpResponse(null, { status: 204 }),
    ),
    http.get("http://localhost:8080/api/v1/wordbooks/1/words", () => HttpResponse.json([])),
    http.put("http://localhost:8080/api/v1/wordbooks/1", async () => {
      await delay(50);
      return HttpResponse.json({ message: "rename failed" }, { status: 500 });
    }),
  );

  renderWordbooksScreen();

  await userEvent.click(await screen.findByRole("button", { name: "打开单词本 重要单词" }));
  await userEvent.click(screen.getByRole("button", { name: "重命名" }));
  const nameInput = screen.getByLabelText("单词本名称");
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, "考试词汇");
  await userEvent.click(screen.getByRole("button", { name: "保存单词本" }));

  await waitFor(() => {
    expect(screen.getByRole("dialog", { name: "重命名单词本" })).toBeInTheDocument();
  });
  expect(screen.getByDisplayValue("考试词汇")).toBeInTheDocument();
  expect(await screen.findByText("保存失败，请稍后重试。")).toBeInTheDocument();
});
