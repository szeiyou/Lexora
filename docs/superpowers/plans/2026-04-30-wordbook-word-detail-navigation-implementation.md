# Wordbook Word Detail Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users click a saved word in a wordbook, return to the lookup workspace, and re-run a fresh English-word lookup for that word.

**Architecture:** The wordbook page sends a small route-state payload to `/`. `WorkspaceScreen` consumes that payload once per location key and reuses `useQueryStore.reopenRecentSearch(query, "ENGLISH_WORD")` so existing query loading, success, failure, refresh, and cache behavior stays unchanged. Wordbook rows stay as list items, with a full-width native button for keyboard and screen-reader access.

**Tech Stack:** React, TypeScript, React Router, Zustand, TanStack Query, MSW, Vitest, Testing Library, Playwright.

---

## File Structure

- Modify `src/modules/query/screens/workspace-screen.tsx`
  - Add a local route-state type for wordbook lookups.
  - Read `wordbookWordLookup.query` from `location.state`.
  - Trigger `reopenRecentSearch(query, "ENGLISH_WORD")` once per location key.

- Modify `src/modules/query/ui/workspace-screen.test.tsx`
  - Let the test renderer pass custom `MemoryRouter` initial entries.
  - Add coverage for route-state lookup and duplicate-effect protection.

- Modify `src/modules/wordbooks/ui/wordbooks-screen.tsx`
  - Add `useNavigate()`.
  - Pass an `onOpenWord` callback into `WordbookDetailPane`.

- Modify `src/modules/wordbooks/ui/wordbook-detail-pane.tsx`
  - Add an `onOpenWord` prop.
  - Render each saved word as an `<li>` containing a full-width `<button type="button">`.

- Modify `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
  - Mock `useNavigate`.
  - Add coverage for clicking a saved word.

- Modify `tests/e2e/history-and-wordbooks.spec.ts`
  - Seed an authenticated web session.
  - Add API handlers for auth restore and session verification.
  - Add an acceptance flow for wordbook word click-to-lookup.

---

### Task 1: Workspace Route-State Lookup

**Files:**
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`
- Modify: `src/modules/query/screens/workspace-screen.tsx`

- [ ] **Step 1: Write the failing workspace tests**

In `src/modules/query/ui/workspace-screen.test.tsx`, change the imports at the top from:

```ts
import { HttpResponse, http } from "msw";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
```

to:

```ts
import { StrictMode } from "react";
import { HttpResponse, http } from "msw";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
```

Then replace the existing `renderWorkspace` helper:

```ts
function renderWorkspace(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <WorkspaceScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
```

with:

```ts
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
```

Add these tests after the existing `beforeEach` block:

```ts
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
```

- [ ] **Step 2: Run the workspace tests and verify they fail**

Run:

```bash
npm run test -- src/modules/query/ui/workspace-screen.test.tsx
```

Expected: FAIL. The new route-state tests should fail because `WorkspaceScreen` does not yet read `wordbookWordLookup` from `location.state`, so no live entry request is made and the result text is not rendered.

- [ ] **Step 3: Implement route-state lookup in `WorkspaceScreen`**

In `src/modules/query/screens/workspace-screen.tsx`, add this type near the existing imports and helper function:

```ts
type WordbookWordLookupLocationState = {
  wordbookWordLookup?: {
    query?: string;
  };
};

type WorkspaceLocationState = HistoryLocationState & WordbookWordLookupLocationState;
```

Add the `reopenRecentSearch` store selector next to the existing query-store selectors:

```ts
  const reopenRecentSearch = useQueryStore((state) => state.reopenRecentSearch);
```

Add a new ref next to `lastAppliedRestoreRef`:

```ts
  const lastAppliedWordbookLookupRef = useRef<string | null>(null);
```

In the protected-state reset effect, add this line next to the existing ref resets:

```ts
    lastAppliedWordbookLookupRef.current = null;
```

In the history restore effect, change:

```ts
    const state = location.state as HistoryLocationState | null;
```

to:

```ts
    const state = location.state as WorkspaceLocationState | null;
```

Add this new effect immediately after the history restore effect:

```ts
  useEffect(() => {
    const state = location.state as WorkspaceLocationState | null;
    const query = state?.wordbookWordLookup?.query?.trim();

    if (!query) {
      return;
    }

    const lookupKey = `${location.key}:${query}`;
    if (lastAppliedWordbookLookupRef.current === lookupKey) {
      return;
    }

    lastAppliedWordbookLookupRef.current = lookupKey;
    reopenRecentSearch(query, "ENGLISH_WORD");
    setFeedback(null);
  }, [location.key, location.state, reopenRecentSearch]);
```

- [ ] **Step 4: Run the workspace tests and verify they pass**

Run:

```bash
npm run test -- src/modules/query/ui/workspace-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the workspace route-state change**

Run:

```bash
git add src/modules/query/screens/workspace-screen.tsx src/modules/query/ui/workspace-screen.test.tsx
git commit -m "feat: open wordbook lookup route state"
```

---

### Task 2: Clickable Wordbook Word Rows

**Files:**
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.tsx`
- Modify: `src/modules/wordbooks/ui/wordbook-detail-pane.tsx`

- [ ] **Step 1: Write the failing wordbook navigation test**

In `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`, add this mock block after the existing imports:

```ts
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
```

In the existing `beforeEach`, add:

```ts
  routerMocks.navigate.mockReset();
```

Add this test after `creates a new wordbook and opens its detail pane`:

```ts
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
```

- [ ] **Step 2: Run the wordbook tests and verify they fail**

Run:

```bash
npm run test -- src/modules/wordbooks/ui/wordbooks-screen.test.tsx
```

Expected: FAIL. The new test should fail because saved words are static list items and there is no `useNavigate` call.

- [ ] **Step 3: Add wordbook navigation callback**

In `src/modules/wordbooks/ui/wordbooks-screen.tsx`, add this import:

```ts
import { useNavigate } from "react-router-dom";
```

Inside `WordbooksScreen`, add this near the top of the component:

```ts
  const navigate = useNavigate();
```

Add this handler after `selectedWordbook`:

```ts
  const handleOpenWord = (word: string) => {
    const query = word.trim();

    if (!query) {
      return;
    }

    navigate("/", {
      state: {
        wordbookWordLookup: {
          query,
        },
      },
    });
  };
```

Pass the handler into `WordbookDetailPane`:

```tsx
          <WordbookDetailPane
            wordbook={selectedWordbook}
            onOpenWord={handleOpenWord}
            onRename={() => {
              setDeleteErrorMessage(null);
              setSaveErrorMessage(null);
              if (selectedWordbook) {
                setEditorState({ mode: "rename", wordbook: selectedWordbook });
              }
            }}
            onDelete={() => {
              setDeleteErrorMessage(null);
              if (selectedWordbook) {
                setPendingDeleteWordbook(selectedWordbook);
              }
            }}
          />
```

- [ ] **Step 4: Render saved words as accessible open buttons**

In `src/modules/wordbooks/ui/wordbook-detail-pane.tsx`, update the props type:

```ts
type WordbookDetailPaneProps = {
  wordbook: Wordbook | null;
  onOpenWord: (word: string) => void;
  onRename: () => void;
  onDelete: () => void;
};
```

Update the function parameters:

```ts
export function WordbookDetailPane({
  wordbook,
  onOpenWord,
  onRename,
  onDelete,
}: WordbookDetailPaneProps) {
```

Replace the current word-row mapping:

```tsx
              {wordsQuery.data.map((item) => (
                <li
                  key={item.word}
                  className="rounded-[var(--radius-md)] border border-[hsl(var(--border))]/70 bg-[hsl(var(--surface)/0.35)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.word}</span>
                    <span className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      {item.partOfSpeech}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{item.meaning}</p>
                </li>
              ))}
```

with:

```tsx
              {wordsQuery.data.map((item) => (
                <li key={item.word}>
                  <button
                    type="button"
                    aria-label={`打开单词 ${item.word} 的详情`}
                    onClick={() => onOpenWord(item.word)}
                    className="w-full cursor-pointer rounded-[var(--radius-md)] border border-[hsl(var(--border))]/70 bg-[hsl(var(--surface)/0.35)] px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--surface)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.word}</span>
                      <span className="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                        {item.partOfSpeech}
                      </span>
                    </span>
                    <span className="mt-2 block text-sm text-[hsl(var(--muted-foreground))]">{item.meaning}</span>
                  </button>
                </li>
              ))}
```

- [ ] **Step 5: Run the wordbook tests and verify they pass**

Run:

```bash
npm run test -- src/modules/wordbooks/ui/wordbooks-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the wordbook row change**

Run:

```bash
git add src/modules/wordbooks/ui/wordbooks-screen.tsx src/modules/wordbooks/ui/wordbook-detail-pane.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx
git commit -m "feat: open saved words from wordbooks"
```

---

### Task 3: End-to-End Acceptance Coverage

**Files:**
- Modify: `tests/e2e/history-and-wordbooks.spec.ts`

- [ ] **Step 1: Add authenticated session seeding and auth route helpers**

In `tests/e2e/history-and-wordbooks.spec.ts`, add this helper after `seedSettings`:

```ts
async function seedAuthenticatedSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "codict.auth",
      JSON.stringify({
        refreshToken: "refresh-1",
        user: { id: 1, username: "tester" },
      }),
    );
  });
}
```

Add this helper after `seedAuthenticatedSession`:

```ts
function fulfillAuthTokenEnvelope() {
  return fulfillJson({
    accessToken: "access-1",
    refreshToken: "refresh-2",
    expiresIn: 3600,
    user: { id: 1, username: "tester" },
  });
}
```

In both existing tests, add this line immediately after `await seedSettings(page);`:

```ts
  await seedAuthenticatedSession(page);
```

In both existing route handlers, add these branches before the history, wordbook, or entries branches:

```ts
    if (pathname === "/api/v1/auth/refresh" && request.method() === "POST") {
      await route.fulfill(fulfillAuthTokenEnvelope());
      return;
    }

    if (pathname === "/api/v1/auth/me" && request.method() === "GET") {
      await route.fulfill(fulfillJson({ id: 1, username: "tester" }));
      return;
    }
```

- [ ] **Step 2: Add the wordbook-to-lookup e2e test**

Append this test to `tests/e2e/history-and-wordbooks.spec.ts`:

```ts
test("opens a saved wordbook word as a fresh lookup", async ({ page }) => {
  const latestWordResponse = {
    ...englishWordResponse,
    englishWord: {
      ...englishWordResponse.englishWord!,
      examples: [
        {
          sentence: "Fresh lookup detail for phenomenon is rendered.",
          translation: "phenomenon 的最新查询详情已渲染。",
        },
      ],
    },
  };

  await seedSettings(page);
  await seedAuthenticatedSession(page);
  await page.route(`**${API_PROXY_PATH}/api/v1/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.slice(API_PROXY_PATH.length) || "/";

    if (pathname === "/api/v1/auth/refresh" && request.method() === "POST") {
      await route.fulfill(fulfillAuthTokenEnvelope());
      return;
    }

    if (pathname === "/api/v1/auth/me" && request.method() === "GET") {
      await route.fulfill(fulfillJson({ id: 1, username: "tester" }));
      return;
    }

    if (pathname === "/api/v1/history" && request.method() === "GET") {
      await route.fulfill(fulfillJson({ content: [] }));
      return;
    }

    if (pathname === "/api/v1/wordbooks" && request.method() === "GET") {
      await route.fulfill(
        fulfillJson([
          {
            id: 1,
            name: "重要单词",
            createTime: "2026-03-21T10:00:00",
          },
        ]),
      );
      return;
    }

    if (pathname === "/api/v1/wordbooks/1/words" && request.method() === "GET") {
      await route.fulfill(
        fulfillJson([
          {
            word: "phenomenon",
            partOfSpeech: "n.",
            meaning: "保存在单词本里的旧释义",
            createTime: "2026-03-21T10:10:00",
          },
        ]),
      );
      return;
    }

    if (pathname === "/api/v1/entries" && request.method() === "GET") {
      expect(url.searchParams.get("q")).toBe("phenomenon");
      expect(url.searchParams.get("type")).toBe("ENGLISH_WORD");
      await route.fulfill(fulfillJson(latestWordResponse));
      return;
    }

    await route.fulfill(
      fulfillJson({ message: `Unhandled route: ${request.method()} ${pathname}` }, 404),
    );
  });

  await page.goto("/", { waitUntil: "commit" });
  await page.getByRole("link", { name: "单词本" }).click();
  await page.getByRole("button", { name: "打开单词本 重要单词" }).click();
  await page.getByRole("button", { name: "打开单词 phenomenon 的详情" }).click();

  await expect(page.getByRole("heading", { name: "查词" })).toBeVisible();
  await expect(page.getByLabel("输入内容")).toHaveValue("phenomenon");
  await expect(page.getByText("Fresh lookup detail for phenomenon is rendered.")).toBeVisible();
  await expect(page.getByText("保存在单词本里的旧释义")).not.toBeVisible();
});
```

- [ ] **Step 3: Run the focused e2e test**

Run:

```bash
npm run test:e2e -- tests/e2e/history-and-wordbooks.spec.ts
```

Expected: PASS. The new test should prove that the displayed detail comes from the live `/api/v1/entries` response, not the saved wordbook summary.

- [ ] **Step 4: Commit the e2e coverage**

Run:

```bash
git add tests/e2e/history-and-wordbooks.spec.ts
git commit -m "test: cover opening saved word lookups"
```

---

### Task 4: Final Verification

**Files:**
- No source changes expected.

- [ ] **Step 1: Run the targeted unit tests**

Run:

```bash
npm run test -- src/modules/query/ui/workspace-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run the focused e2e suite**

Run:

```bash
npm run test:e2e -- tests/e2e/history-and-wordbooks.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Check git status**

Run:

```bash
git status --short
```

Expected: no modified tracked files. The pre-existing untracked `.codex` entry may still appear and should not be added for this feature.

---

## Self-Review

- Spec coverage: Task 1 covers route-state lookup, fresh `ENGLISH_WORD` query, duplicate-effect protection, and existing query behavior reuse. Task 2 covers accessible clickable rows and navigation state from wordbooks. Task 3 covers the full acceptance flow and proves the live lookup response is rendered instead of the saved summary. Task 4 covers final verification.
- Placeholder scan: The plan contains no placeholder work items. Every code-changing step includes the exact code to add or replace.
- Type consistency: The route-state key is consistently `wordbookWordLookup`, the payload key is consistently `query`, and the forced lookup type is consistently `"ENGLISH_WORD"`.
