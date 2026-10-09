# Translation Result Area Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the translation result surface by removing the redundant page-level `结果` card and replacing the repeated full source text with a collapsible inline source preview inside `译文`.

**Architecture:** Keep translation-page data flow unchanged. Remove the wrapper card in `src/modules/translations/screens/translations-screen.tsx`, then move all source-context behavior into `TextTranslationResult` with local `isExpanded` and `isOverflowing` state driven by rendered height and window resize. Cover the change with one adjusted screen integration test and one new focused component test file.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library, MSW

---

## File Map

- Modify: `src/modules/translations/screens/translations-screen.tsx`
  Remove the standalone translation-page `结果` card and render `TextTranslationResult` directly.
- Modify: `src/modules/translations/ui/translations-screen.test.tsx`
  Extend the existing submit-flow test so it fails until the redundant `结果` shell is removed.
- Modify: `src/modules/translations/ui/text-translation-result.tsx`
  Replace the static `原文：{result.text}` line with a 3-line collapsible source preview, fade overlay, and inline expand/collapse trigger.
- Create: `src/modules/translations/ui/text-translation-result.test.tsx`
  Add focused tests for overflow detection, inline expand/collapse, and reset-on-new-result behavior.

### Task 1: Remove the redundant translation-page result shell

**Files:**
- Modify: `src/modules/translations/ui/translations-screen.test.tsx`
- Modify: `src/modules/translations/screens/translations-screen.tsx`
- Test: `src/modules/translations/ui/translations-screen.test.tsx`

- [ ] **Step 1: Write the failing integration assertion in the existing submit test**

In `src/modules/translations/ui/translations-screen.test.tsx`, update the test `it("submits valid text to POST /api/v1/text-translations and renders the response fields", ...)` so it also asserts that the page no longer renders the standalone `结果` heading or the duplicated `当前内容` copy.

```tsx
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
```

- [ ] **Step 2: Run the screen test to verify it fails**

Run:

```bash
npm run test -- src/modules/translations/ui/translations-screen.test.tsx
```

Expected: FAIL with a Testing Library assertion showing that heading `结果` or text `当前内容：今天天气真好!!! 适合出去走走。` is still present.

- [ ] **Step 3: Remove the wrapper card and unused icon import**

In `src/modules/translations/screens/translations-screen.tsx`, remove `SearchCheck` from the `lucide-react` import and replace the `currentResult` render block with a direct `TextTranslationResult` render.

```tsx
import { Languages } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchHistoryDetail } from "@/modules/history/api/fetch-history-detail";
import {
  type HistoryLocationState,
  parseHistoryDetail,
} from "@/modules/history/model/history-restore";
import {
  fetchRecentTranslationHistory,
  getRecentTranslationHistoryQueryKey,
  type RecentTranslationHistoryItem,
} from "@/modules/translations/api/fetch-recent-translation-history";
import { fetchTextTranslation } from "@/modules/translations/api/fetch-text-translation";
import {
  getTranslationDirectionFromLanguages,
  resolveTranslationLanguages,
  TRANSLATION_DIRECTION_OPTIONS,
  type TranslationDirection,
} from "@/modules/translations/model/translation-direction";
import type { TextTranslationResultViewModel } from "@/modules/translations/model/text-translation-result-view-model";
import { getTextTranslationValidationMessage } from "@/modules/translations/model/text-translation-validation";
import { RecentTranslationList } from "@/modules/translations/ui/recent-translation-list";
import { TextTranslationResult } from "@/modules/translations/ui/text-translation-result";
import { useSettingsStore } from "@/modules/settings/model/settings.store";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { StatusView } from "@/shared/ui/status-view";
import { Textarea } from "@/shared/ui/textarea";

// ...existing component code above stays unchanged...

          {currentResult ? <TextTranslationResult result={currentResult} /> : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run the screen test to verify it passes**

Run:

```bash
npm run test -- src/modules/translations/ui/translations-screen.test.tsx
```

Expected: PASS for the translation screen test file.

- [ ] **Step 5: Commit the shell-removal change**

Run:

```bash
git add src/modules/translations/screens/translations-screen.tsx src/modules/translations/ui/translations-screen.test.tsx
git commit -m "refactor: remove redundant translation result shell"
```

Expected: a commit containing only the translation-page shell removal and its test update.

### Task 2: Add the inline source preview with expand/collapse behavior

**Files:**
- Create: `src/modules/translations/ui/text-translation-result.test.tsx`
- Modify: `src/modules/translations/ui/text-translation-result.tsx`
- Test: `src/modules/translations/ui/text-translation-result.test.tsx`
- Test: `src/modules/translations/ui/translations-screen.test.tsx`

- [ ] **Step 1: Write the failing component tests first**

Create `src/modules/translations/ui/text-translation-result.test.tsx` with focused tests for:

- long source text: show `查看完整原文`, fade overlay, and inline expand/collapse
- short source text: show no trigger
- new result text: reset back to the collapsed state

```tsx
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TextTranslationResultViewModel } from "@/modules/translations/model/text-translation-result-view-model";
import { textTranslationResult } from "@/modules/translations/model/__fixtures__/text-translation-responses";
import { TextTranslationResult } from "@/modules/translations/ui/text-translation-result";

function renderTranslationResult(overrides: Partial<TextTranslationResultViewModel> = {}) {
  const result: TextTranslationResultViewModel = {
    ...textTranslationResult,
    ...overrides,
  };

  return render(<TextTranslationResult result={result} />);
}

function setPreviewHeights({
  clientHeight,
  scrollHeight,
}: {
  clientHeight: number;
  scrollHeight: number;
}) {
  const preview = screen.getByTestId("translation-source-preview");

  Object.defineProperty(preview, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(preview, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });

  act(() => {
    window.dispatchEvent(new Event("resize"));
  });

  return preview;
}

it("shows a collapsed source preview and toggles inline expansion for long text", async () => {
  renderTranslationResult({
    text: "今天天气真好，风很轻，阳光也很舒服。我们吃完午饭以后，可以去附近的公园走一走。".repeat(4),
  });

  const preview = setPreviewHeights({ clientHeight: 72, scrollHeight: 168 });

  expect(screen.getByRole("button", { name: "查看完整原文" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  expect(preview).toHaveStyle({ maxHeight: "72px" });
  expect(screen.getByTestId("translation-source-fade")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "查看完整原文" }));

  expect(screen.getByRole("button", { name: "收起原文" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.queryByTestId("translation-source-fade")).not.toBeInTheDocument();
  expect(preview.style.maxHeight).toBe("");
});

it("renders short source text without a preview toggle", () => {
  renderTranslationResult();
  setPreviewHeights({ clientHeight: 72, scrollHeight: 48 });

  expect(screen.queryByRole("button", { name: "查看完整原文" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "收起原文" })).not.toBeInTheDocument();
  expect(screen.queryByTestId("translation-source-fade")).not.toBeInTheDocument();
});

it("resets back to the collapsed state when a new result arrives", async () => {
  const { rerender } = render(
    <TextTranslationResult
      result={{
        ...textTranslationResult,
        text: "第一段原文很长，需要先展开查看。".repeat(8),
      }}
    />,
  );

  setPreviewHeights({ clientHeight: 72, scrollHeight: 176 });
  await userEvent.click(screen.getByRole("button", { name: "查看完整原文" }));
  expect(screen.getByRole("button", { name: "收起原文" })).toHaveAttribute("aria-expanded", "true");

  rerender(
    <TextTranslationResult
      result={{
        ...textTranslationResult,
        text: "第二段原文同样很长，但重新进入结果时应该默认收起。".repeat(8),
        translatedText: "A different translated result.",
      }}
    />,
  );

  setPreviewHeights({ clientHeight: 72, scrollHeight: 176 });

  expect(screen.getByRole("button", { name: "查看完整原文" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
```

- [ ] **Step 2: Run the new component test file to verify it fails**

Run:

```bash
npm run test -- src/modules/translations/ui/text-translation-result.test.tsx
```

Expected: FAIL because `TextTranslationResult` still renders a static `原文：...` paragraph, has no `translation-source-preview` test id, no fade overlay, and no toggle button.

- [ ] **Step 3: Implement the inline source preview in `TextTranslationResult`**

Replace `src/modules/translations/ui/text-translation-result.tsx` with the following implementation. This keeps the `分段对照`, `关键词`, and `备注` cards unchanged and only upgrades the top `译文` card.

```tsx
import { ArrowRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TextTranslationResultViewModel } from "@/modules/translations/model/text-translation-result-view-model";
import { cn } from "@/shared/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type TextTranslationResultProps = {
  result: TextTranslationResultViewModel;
};

const COLLAPSED_SOURCE_PREVIEW_HEIGHT = 72;

export function TextTranslationResult({ result }: TextTranslationResultProps) {
  const sourcePreviewRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [result.text]);

  useLayoutEffect(() => {
    const preview = sourcePreviewRef.current;
    if (!preview) {
      return;
    }

    const measureOverflow = () => {
      setIsOverflowing(preview.scrollHeight > COLLAPSED_SOURCE_PREVIEW_HEIGHT + 1);
    };

    measureOverflow();
    window.addEventListener("resize", measureOverflow);

    return () => {
      window.removeEventListener("resize", measureOverflow);
    };
  }, [result.text]);

  return (
    <div className="space-y-4">
      <Card className="border-[hsl(var(--border))]/80 bg-[hsl(var(--surface))/0.55] shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">译文</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="space-y-2" aria-label="原文预览">
            <p className="text-xs font-medium tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
              原文
            </p>
            <div className="relative">
              <p
                ref={sourcePreviewRef}
                data-testid="translation-source-preview"
                className={cn(
                  "whitespace-pre-wrap text-sm leading-6 text-[hsl(var(--muted-foreground))]",
                  isOverflowing && !isExpanded ? "overflow-hidden" : undefined,
                )}
                style={
                  isOverflowing && !isExpanded
                    ? { maxHeight: `${COLLAPSED_SOURCE_PREVIEW_HEIGHT}px` }
                    : undefined
                }
              >
                {result.text}
              </p>

              {isOverflowing && !isExpanded ? (
                <div
                  data-testid="translation-source-fade"
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[hsl(var(--surface))]"
                />
              ) : null}
            </div>

            {isOverflowing ? (
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => setIsExpanded((value) => !value)}
                className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:text-[hsl(var(--foreground))] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
              >
                <span>{isExpanded ? "收起原文" : "查看完整原文"}</span>
                <ArrowRight
                  aria-hidden="true"
                  className={cn(
                    "size-3.5 transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)]",
                    isExpanded ? "-rotate-90" : undefined,
                  )}
                />
              </button>
            ) : null}
          </section>

          <p className="text-xl font-semibold text-[hsl(var(--foreground))]">{result.translatedText}</p>
        </CardContent>
      </Card>

      {result.segments.length > 0 ? (
        <Card className="border-[hsl(var(--border))]/80 bg-[hsl(var(--surface))/0.55] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">分段对照</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.segments.map((segment, index) => (
              <div
                key={`${segment.text}-${segment.translatedText}-${index}`}
                className="rounded-[var(--radius-sm)] border border-[hsl(var(--border))]/70 bg-black/10 p-3"
              >
                <p className="text-sm text-[hsl(var(--foreground))]">{segment.text}</p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {segment.translatedText}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {result.keyPhrases.length > 0 ? (
        <Card className="border-[hsl(var(--border))]/80 bg-[hsl(var(--surface))/0.55] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">关键词</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {result.keyPhrases.map((phrase, index) => (
              <div
                key={`${phrase.phrase}-${phrase.translation}-${index}`}
                className="rounded-[var(--radius-sm)] border border-[hsl(var(--border))]/70 bg-black/10 p-3"
              >
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">{phrase.phrase}</p>
                <p className="mt-1 text-sm text-[hsl(var(--foreground))]">{phrase.translation}</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{phrase.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {result.notes.length > 0 ? (
        <Card className="border-[hsl(var(--border))]/80 bg-[hsl(var(--surface))/0.55] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">备注</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.notes.map((note, index) => (
                <li
                  key={`${note}-${index}`}
                  className="rounded-[var(--radius-sm)] border border-[hsl(var(--border))]/70 bg-black/10 px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]"
                >
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run the focused regression tests to verify the UI passes**

Run:

```bash
npm run test -- src/modules/translations/ui/text-translation-result.test.tsx src/modules/translations/ui/translations-screen.test.tsx
```

Expected: PASS for both translation UI test files, including the new expand/collapse coverage and the screen-level shell-removal assertion.

- [ ] **Step 5: Commit the source-preview behavior**

Run:

```bash
git add src/modules/translations/ui/text-translation-result.tsx src/modules/translations/ui/text-translation-result.test.tsx src/modules/translations/ui/translations-screen.test.tsx
git commit -m "feat: add expandable translation source preview"
```

Expected: a commit containing the source-preview UI, its focused tests, and the updated screen assertions.

## Self-Review

- Spec coverage:
  - Task 1 removes the standalone translation-page `结果` card.
  - Task 2 adds the 3-line source preview, fade, inline `查看完整原文` / `收起原文` trigger, keyboard-accessible button semantics, and reset-on-new-result behavior.
  - Existing `分段对照`, `关键词`, and `备注` sections remain unchanged.
- Placeholder scan:
  - No placeholder markers or vague deferred-work instructions remain in the plan.
- Type consistency:
  - `translation-source-preview`, `translation-source-fade`, `isExpanded`, `isOverflowing`, and `COLLAPSED_SOURCE_PREVIEW_HEIGHT` are named consistently between plan steps and tests.
