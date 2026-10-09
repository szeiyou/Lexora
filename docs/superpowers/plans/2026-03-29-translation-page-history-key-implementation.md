# Translation Page With History Key Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new top-level "翻译" page backed by `POST /api/v1/text-translations`, render recent translation history in a right-side list, and switch history reopen to `historyKey`-based saved-response restore for both query results and translation results.

**Architecture:** Keep the existing query workspace responsible for `/api/v1/entries`, and add a separate `translations` module for `TextTranslationResponse`, textarea-centric UI, and translation-specific validation. Move history reopen to a typed two-step flow: fetch grouped summaries from `/api/v1/history`, resolve a selected summary via `/api/v1/history/{historyKey}`, then hand the saved response to the destination page through route state instead of replaying live requests.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Zustand, shadcn/ui, Tailwind, Vitest, Testing Library, MSW

---

## Planned File Map

- `src/app/router.tsx`: add the `/translations` route to the shell router.
- `src/app/layouts/app-shell.tsx`: add the "翻译" navigation item and icon.
- `src/app/router.test.tsx`: verify the shell shows the new top-level navigation entry.
- `src/shared/ui/textarea.tsx`: add a shared textarea primitive styled consistently with the existing `Input`.
- `src/modules/history/model/history-types.ts`: define grouped history result types, `historyKey`, and Jackson time-array types without depending on the query module's `EntryResultType`.
- `src/modules/history/model/history-time.ts`: format Jackson numeric-array timestamps and centralize stable list-key rules around `historyKey`.
- `src/modules/history/model/history-restore.ts`: convert history detail payloads into a discriminated route-state restore payload for query and translation destinations.
- `src/modules/history/model/history-restore.test.ts`: lock parsing, branching, and time handling with focused unit tests.
- `src/modules/history/api/fetch-history-page.ts`: switch the summary contract to `historyKey` and Jackson time arrays.
- `src/modules/history/api/fetch-history-detail.ts`: fetch details by `historyKey` and return typed grouped detail payloads with `response`.
- `src/modules/history/screens/history-screen.tsx`: fetch history detail on open, route by `resultType`, and keep failures on the history page.
- `src/modules/history/ui/history-list.tsx`: use `historyKey`-based identity rather than timestamp-derived keys.
- `src/modules/history/ui/history-list.test.tsx`: update fixtures to the grouped-history shape.
- `src/modules/history/ui/history-screen.test.tsx`: verify detail fetch, route-state restore, `TEXT_TRANSLATION` routing, and the absence of live replay requests during history reopen.
- `src/modules/recent-searches/api/fetch-recent-searches.ts`: expose `historyKey` and the widened history result type so both pages can reuse the grouped summary feed.
- `src/modules/query/model/query-restore-state.ts`: optional focused type alias if route-state imports would otherwise couple `WorkspaceScreen` directly to history internals.
- `src/modules/query/screens/workspace-screen.tsx`: consume query restore route state and render restored results without firing `/api/v1/entries`.
- `src/modules/query/ui/query-toolbar.tsx`: keep the existing workspace dropdown entry-only and switch recent-item row keys from timestamp strings to `historyKey`.
- `src/modules/query/ui/workspace-screen.test.tsx`: add regression coverage proving restored query history does not issue a fresh request.
- `src/modules/translations/model/text-translation-response.ts`: define the API response and request body types for `/api/v1/text-translations`.
- `src/modules/translations/model/text-translation-result-view-model.ts`: define the UI-facing translation result shape.
- `src/modules/translations/model/text-translation-input-validation.ts`: enforce trimmed emptiness, trimmed 3000-character limit, and same-language blocking.
- `src/modules/translations/model/text-translation-result-mapper.ts`: map `TextTranslationResponse` into the UI view model.
- `src/modules/translations/model/text-translation-result-mapper.test.ts`: verify mapping and validation behavior.
- `src/modules/translations/model/__fixtures__/text-translation-responses.ts`: sample translation API payloads for mapper and screen tests.
- `src/modules/translations/api/fetch-text-translation.ts`: send the JSON POST request to `/api/v1/text-translations`.
- `src/modules/translations/ui/translation-composer.tsx`: render the language controls, textarea, submit button, and validation/error text.
- `src/modules/translations/ui/recent-translation-list.tsx`: render the right-side "最近查询" panel and its row interactions.
- `src/modules/translations/ui/text-translation-result-card.tsx`: render translated text, segments, key phrases, and notes.
- `src/modules/translations/screens/translations-screen.tsx`: own local translation page state, request flow, recent-history restore, and route-state restore.
- `src/modules/translations/ui/translations-screen.test.tsx`: verify live translation, restore from recent history, layout landmarks, and failure retention.

### Task 1: Lock the New History Contract With Failing Tests

**Files:**
- Create: `src/modules/history/model/history-restore.test.ts`
- Modify: `src/modules/history/ui/history-screen.test.tsx`
- Modify: `src/modules/history/ui/history-list.test.tsx`

- [ ] **Step 1: Write failing unit tests for grouped history parsing and time arrays**

Create `history-restore.test.ts` with cases like:

```ts
it("parses TEXT_TRANSLATION detail payloads into a translation restore result", () => {
  const restore = parseHistoryDetail({
    historyKey: "hk-1",
    resultType: "TEXT_TRANSLATION",
    query: "你好",
    normalizedQuery: "你好",
    latestSearchTime: [2026, 3, 29, 18, 0],
    searchCount: 1,
    searchTimes: [[2026, 3, 29, 18, 0]],
    response: textTranslationResponse,
  });

  expect(restore.destination).toBe("/translations");
  expect(restore.result.kind).toBe("text-translation");
});

it("formats Jackson time arrays without relying on ISO strings", () => {
  expect(formatHistoryTime([2026, 3, 29, 18, 0])).toContain("2026");
});
```

- [ ] **Step 2: Write failing history-screen tests for `historyKey` detail fetch and route split**

Replace the current history reopen assumption in `history-screen.test.tsx` with tests that:

- render summary items containing `historyKey`
- click "打开"
- expect a `GET /api/v1/history/{historyKey}` request
- expect `SENTENCE_TRANSLATION` details to restore in the workspace without a new `/api/v1/entries` call
- expect `TEXT_TRANSLATION` details to navigate to `/translations` without a new `POST /api/v1/text-translations` call

Use expectations like:

```ts
expect(entryRequests).toHaveLength(0);
expect(translationRequests).toHaveLength(0);
expect(await screen.findByRole("heading", { name: "翻译" })).toBeInTheDocument();
```

- [ ] **Step 3: Update the history-list test fixture to the grouped-summary shape**

Change the existing `HistoryList` test fixture to include `historyKey` and remove `id`/`searchTime` assumptions. Keep the test focused on truncation, but make it fail until the production list props accept the new grouped item shape cleanly.

- [ ] **Step 4: Run the focused history tests and verify they fail for the expected reasons**

Run:

```bash
npm run test -- src/modules/history/model/history-restore.test.ts src/modules/history/ui/history-screen.test.tsx src/modules/history/ui/history-list.test.tsx
```

Expected: FAIL because the current history contract still expects string timestamps, lacks `historyKey`, and replays live requests instead of restoring saved responses.

### Task 2: Implement Grouped History Types, Time Adapters, and Restore Parsing

**Files:**
- Create: `src/modules/history/model/history-types.ts`
- Create: `src/modules/history/model/history-time.ts`
- Create: `src/modules/history/model/history-restore.ts`
- Modify: `src/modules/history/api/fetch-history-page.ts`
- Modify: `src/modules/history/api/fetch-history-detail.ts`
- Modify: `src/modules/history/ui/history-list.tsx`
- Modify: `src/modules/history/model/history-restore.test.ts`
- Modify: `src/modules/history/ui/history-list.test.tsx`

- [ ] **Step 1: Add grouped history types and the widened result-type union**

Move history-owned types out of `fetch-history-page.ts` so they can represent:

```ts
export type HistoryResultType =
  | "ENGLISH_WORD"
  | "ZH_TO_EN_TERM"
  | "SENTENCE_TRANSLATION"
  | "TEXT_TRANSLATION";

export type JacksonTimeArray = [number, number, number, number, number, ...number[]];
```

Also define `HistorySummaryItem` with:

```ts
historyKey: string;
latestSearchTime?: JacksonTimeArray;
searchTimes?: JacksonTimeArray[];
```

- [ ] **Step 2: Add time-format and stable-key helpers**

Create `history-time.ts` helpers such as:

```ts
export function formatHistoryTime(parts?: JacksonTimeArray) {
  if (!parts) return "";
  const [year, month, day, hour, minute, second = 0] = parts;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}${second ? `:${String(second).padStart(2, "0")}` : ""}`;
}

export function getHistorySummaryKey(item: Pick<HistorySummaryItem, "historyKey">) {
  return item.historyKey;
}
```

Update `history-list.tsx` to use the new key helper.

- [ ] **Step 3: Implement typed history-detail fetching by `historyKey`**

Change `fetch-history-detail.ts` to:

```ts
export async function fetchHistoryDetail(historyKey: string, settings: SettingsValues) {
  const { data } = await client.get<HistoryDetailResponse>(`/api/v1/history/${historyKey}`);
  return data;
}
```

Remove the old `id`, `responseSchema`, and `responseJson` assumptions.

- [ ] **Step 4: Implement the restore parser**

Create `history-restore.ts` with a discriminated result like:

```ts
type HistoryRestorePayload =
  | { destination: "/"; query: string; resultType: "ENGLISH_WORD" | "ZH_TO_EN_TERM" | "SENTENCE_TRANSLATION"; result: EntryResultViewModel }
  | { destination: "/translations"; resultType: "TEXT_TRANSLATION"; result: TextTranslationResultViewModel };
```

Branch on `resultType`, use `mapEntryResponse()` for query results, and use the new translation mapper for `TEXT_TRANSLATION`.

- [ ] **Step 5: Run the history tests and verify green**

Run:

```bash
npm run test -- src/modules/history/model/history-restore.test.ts src/modules/history/ui/history-list.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the history-contract foundation**

Run:

```bash
git add src/modules/history/model/history-types.ts src/modules/history/model/history-time.ts src/modules/history/model/history-restore.ts src/modules/history/model/history-restore.test.ts src/modules/history/api/fetch-history-page.ts src/modules/history/api/fetch-history-detail.ts src/modules/history/ui/history-list.tsx src/modules/history/ui/history-list.test.tsx
git commit -m "feat: add grouped history restore contract"
```

### Task 3: Lock the Translation Domain With Failing Tests

**Files:**
- Create: `src/modules/translations/model/text-translation-result-mapper.test.ts`
- Create: `src/modules/translations/model/__fixtures__/text-translation-responses.ts`

- [ ] **Step 1: Write failing fixtures for the new API contract**

Add a fixture like:

```ts
export const textTranslationResponse = {
  text: "你好",
  normalizedText: "你好",
  sourceLanguage: "zh",
  targetLanguage: "en",
  translatedText: "Hello there",
  segments: [{ sourceText: "你好", translatedText: "Hello there" }],
  keyPhrases: [{ sourceText: "你好", translatedText: "hello", note: "常见问候" }],
  notes: "使用自然问候表达。",
};
```

- [ ] **Step 2: Write failing mapper and validation tests**

Cover:

- mapping the API payload into a `text-translation` view model
- trimmed empty validation
- trimmed 3000-character limit
- blocking explicit same-language translation such as `zh -> zh`

Example:

```ts
expect(mapTextTranslationResponse(textTranslationResponse)).toEqual({
  kind: "text-translation",
  sourceText: "你好",
  translatedText: "Hello there",
  sourceLanguage: "zh",
  targetLanguage: "en",
  segments: textTranslationResponse.segments,
  keyPhrases: textTranslationResponse.keyPhrases,
  notes: "使用自然问候表达。",
});
```

- [ ] **Step 3: Run the translation-domain tests and verify they fail**

Run:

```bash
npm run test -- src/modules/translations/model/text-translation-result-mapper.test.ts
```

Expected: FAIL because the translations module does not exist yet.

### Task 4: Implement the Translation Domain and Shared Textarea Primitive

**Files:**
- Create: `src/shared/ui/textarea.tsx`
- Create: `src/modules/translations/model/text-translation-response.ts`
- Create: `src/modules/translations/model/text-translation-result-view-model.ts`
- Create: `src/modules/translations/model/text-translation-input-validation.ts`
- Create: `src/modules/translations/model/text-translation-result-mapper.ts`
- Create: `src/modules/translations/api/fetch-text-translation.ts`
- Modify: `src/modules/translations/model/text-translation-result-mapper.test.ts`

- [ ] **Step 1: Add the shared textarea primitive**

Mirror the style contract of `src/shared/ui/input.tsx`, but for `textarea`:

```tsx
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[180px] w-full rounded-[var(--radius-md)] border border-[hsl(var(--input))] bg-[hsl(var(--surface)/0.92)] px-4 py-4 text-sm text-[hsl(var(--foreground))] ...",
        className,
      )}
      {...props}
    />
  ),
);
```

- [ ] **Step 2: Implement the translation request/response and view-model types**

Define:

```ts
export type TextTranslationRequest = {
  text: string;
  sourceLanguage?: "auto" | "zh" | "en";
  targetLanguage: "zh" | "en";
};
```

and the full response/VM counterparts in their own files.

- [ ] **Step 3: Implement validation and response mapping**

Validation shape:

```ts
export function getTextTranslationValidationMessage(text: string, sourceLanguage: SourceLanguage, targetLanguage: TargetLanguage) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (Array.from(trimmed).length > 3000) return "输入内容最多 3000 个字符，请精简后再试。";
  if (sourceLanguage !== "auto" && sourceLanguage === targetLanguage) return "源语言和目标语言不能相同。";
  return null;
}
```

Mapper shape:

```ts
export function mapTextTranslationResponse(response: TextTranslationResponse): TextTranslationResultViewModel {
  return {
    kind: "text-translation",
    sourceText: response.text,
    normalizedText: response.normalizedText,
    sourceLanguage: response.sourceLanguage,
    targetLanguage: response.targetLanguage,
    translatedText: response.translatedText,
    segments: response.segments,
    keyPhrases: response.keyPhrases,
    notes: response.notes,
  };
}
```

- [ ] **Step 4: Implement the POST API helper**

In `fetch-text-translation.ts`, send JSON to `/api/v1/text-translations` and map the result before returning:

```ts
const { data } = await client.post<TextTranslationResponse>("/api/v1/text-translations", requestBody);
return mapTextTranslationResponse(data);
```

- [ ] **Step 5: Run the translation-domain tests and verify green**

Run:

```bash
npm run test -- src/modules/translations/model/text-translation-result-mapper.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the translation-domain foundation**

Run:

```bash
git add src/shared/ui/textarea.tsx src/modules/translations/model/text-translation-response.ts src/modules/translations/model/text-translation-result-view-model.ts src/modules/translations/model/text-translation-input-validation.ts src/modules/translations/model/text-translation-result-mapper.ts src/modules/translations/model/text-translation-result-mapper.test.ts src/modules/translations/model/__fixtures__/text-translation-responses.ts src/modules/translations/api/fetch-text-translation.ts
git commit -m "feat: add text translation domain primitives"
```

### Task 5: Build the Translation Page and the Right-Side Recent Query Pane

**Files:**
- Create: `src/modules/translations/ui/translation-composer.tsx`
- Create: `src/modules/translations/ui/recent-translation-list.tsx`
- Create: `src/modules/translations/ui/text-translation-result-card.tsx`
- Create: `src/modules/translations/screens/translations-screen.tsx`
- Create: `src/modules/translations/ui/translations-screen.test.tsx`
- Modify: `src/modules/recent-searches/api/fetch-recent-searches.ts`
- Modify: `src/modules/query/ui/query-toolbar.tsx`
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`

- [ ] **Step 1: Write failing screen tests for the dual-pane layout and live POST flow**

Add tests that:

- render a heading `"翻译"`
- assert the page has a large text input plus a `"最近查询"` side pane
- submit valid text and capture a `POST /api/v1/text-translations` request body
- verify the page renders translated text, segments, key phrases, and notes
- verify the screen preserves the last successful result when a subsequent request fails

Use expectations like:

```ts
expect(screen.getByRole("heading", { name: "翻译" })).toBeInTheDocument();
expect(screen.getByRole("region", { name: "最近查询" })).toBeInTheDocument();
expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
```

- [ ] **Step 2: Extend recent-history items to carry `historyKey`**

Update `fetch-recent-searches.ts` so `RecentSearchItem` includes:

```ts
historyKey: string;
resultType: HistoryResultType;
searchTime: JacksonTimeArray;
```

Map directly from the new grouped summary payload; do not coerce time arrays to strings in the adapter.

- [ ] **Step 3: Keep the query workspace recent dropdown entry-only**

Because `/api/v1/history?page=1&size=5` can now return `TEXT_TRANSLATION`, update the query workspace path to filter the shared recent-history data before passing it into `QueryToolbar`. Keep `QueryToolbar` focused on entry-compatible records and use `historyKey` for row identity:

```ts
const queryRecentSearches = (recentSearchesQuery.data ?? []).filter((item) =>
  item.resultType === "ENGLISH_WORD" ||
  item.resultType === "ZH_TO_EN_TERM" ||
  item.resultType === "SENTENCE_TRANSLATION",
);
```

and in `query-toolbar.tsx`:

```tsx
key={item.historyKey}
```

- [ ] **Step 4: Implement the translation composer and the recent-history side pane**

In `translation-composer.tsx`, render:

- source-language `Select`
- target-language `Select`
- primary submit button
- shared `Textarea`
- validation / helper copy

In `recent-translation-list.tsx`, render 4-6 recent `TEXT_TRANSLATION` items in a visible side panel:

```tsx
<section aria-label="最近查询" className="grid gap-3 rounded-[var(--radius-lg)] border ...">
  {items.map((item) => (
    <button key={item.historyKey} type="button" onClick={() => onOpen(item.historyKey)}>
      <span>{item.query}</span>
      <span>{item.summary}</span>
    </button>
  ))}
</section>
```

- [ ] **Step 5: Implement the translation screen state flow**

In `translations-screen.tsx`:

- keep local state for `text`, `sourceLanguage`, `targetLanguage`, `result`, and `inlineError`
- use `useRecentSearchesQuery()` and filter to `TEXT_TRANSLATION`
- live submit -> call `fetchTextTranslation`
- side-pane click -> fetch `historyKey` detail and restore locally
- route-state restore -> initialize the screen from navigation state on first render

Use a layout root such as:

```tsx
<div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
```

and let small screens stack naturally.

- [ ] **Step 6: Run the translation-screen tests and verify green**

Run:

```bash
npm run test -- src/modules/translations/ui/translations-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the translation page UI**

Run:

```bash
git add src/modules/recent-searches/api/fetch-recent-searches.ts src/modules/query/ui/query-toolbar.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/translations/ui/translation-composer.tsx src/modules/translations/ui/recent-translation-list.tsx src/modules/translations/ui/text-translation-result-card.tsx src/modules/translations/screens/translations-screen.tsx src/modules/translations/ui/translations-screen.test.tsx
git commit -m "feat: add translation workspace page"
```

### Task 6: Wire the Router, Shell, and Destination Restore Flow

**Files:**
- Modify: `src/app/router.tsx`
- Modify: `src/app/layouts/app-shell.tsx`
- Modify: `src/app/router.test.tsx`
- Modify: `src/app/app.test.tsx`
- Modify: `src/modules/history/screens/history-screen.tsx`
- Modify: `src/modules/history/ui/history-screen.test.tsx`
- Modify: `src/modules/query/screens/workspace-screen.tsx`
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`

- [ ] **Step 1: Add the top-level translation route and shell navigation**

Update `router.tsx`:

```tsx
{ path: "translations", element: <TranslationsScreen /> },
```

Update `app-shell.tsx` with a new nav item:

```ts
{ to: "/translations", label: "翻译", icon: Languages },
```

Adjust router/app tests to expect the new navigation link.

- [ ] **Step 2: Change `HistoryScreen` to fetch detail before navigation**

Replace the current `reopenRecentSearch(query, resultType)` behavior with:

```ts
const detail = await fetchHistoryDetail(item.historyKey, settings);
const restore = parseHistoryDetail(detail);
navigate(restore.destination, { state: { restoredHistory: restore } });
```

If the detail fetch or parse fails, leave the user on `/history` and set a recoverable error.

- [ ] **Step 3: Consume route-state restore in `WorkspaceScreen`**

Read `useLocation()` and apply the restore payload on first render:

```ts
useEffect(() => {
  if (location.state?.restoredHistory?.destination !== "/") return;
  restoreHistoryResult(location.state.restoredHistory.query, location.state.restoredHistory.resultType, location.state.restoredHistory.result);
  navigate(location.pathname, { replace: true, state: null });
}, [...]);
```

The workspace test should assert that restored query history appears without any `/api/v1/entries` network request.

- [ ] **Step 4: Verify history-to-translation restore end to end**

Update `history-screen.test.tsx` so a `TEXT_TRANSLATION` item:

- fetches `/api/v1/history/{historyKey}`
- lands on the translation page
- shows the saved translated result
- does not issue a live `POST /api/v1/text-translations`

- [ ] **Step 5: Run the router/history/workspace regression slice**

Run:

```bash
npm run test -- src/app/router.test.tsx src/app/app.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/query/ui/workspace-screen.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the navigation and restore integration**

Run:

```bash
git add src/app/router.tsx src/app/layouts/app-shell.tsx src/app/router.test.tsx src/app/app.test.tsx src/modules/history/screens/history-screen.tsx src/modules/history/ui/history-screen.test.tsx src/modules/query/screens/workspace-screen.tsx src/modules/query/ui/workspace-screen.test.tsx
git commit -m "feat: route translation and history restore by history key"
```

### Task 7: Final Verification and Cleanup

**Files:**
- No new file edits expected unless verification exposes regressions.

- [ ] **Step 1: Run the full targeted implementation suite**

Run:

```bash
npm run test -- src/modules/history/model/history-restore.test.ts src/modules/history/ui/history-list.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/query/model/query-store.test.ts src/modules/query/ui/workspace-screen.test.tsx src/modules/translations/model/text-translation-result-mapper.test.ts src/modules/translations/ui/translations-screen.test.tsx src/app/router.test.tsx src/app/app.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run a broader smoke test for app-level regressions**

Run:

```bash
npm run test -- src/modules/settings/ui/settings-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx
```

Expected: PASS, proving the route and shell changes did not destabilize adjacent modules.

- [ ] **Step 3: Review the working tree for unintended churn**

Run:

```bash
git status --short
```

Expected: only the planned implementation files remain changed.

- [ ] **Step 4: Commit final cleanup if any verification-driven edits were needed**

Run:

```bash
git add <any verification-fix files>
git commit -m "fix: close translation restore regressions"
```

Leave this step empty if no follow-up fixes were required after the main task commits.
