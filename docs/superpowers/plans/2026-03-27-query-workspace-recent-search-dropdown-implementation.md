# Query Workspace Recent Search Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the workspace's standalone recent-search card with an input-attached dropdown that opens on focus, filters locally while typing, refills query text and result type on selection, and never auto-submits.

**Architecture:** Keep `/api/v1/history?page=1&size=5` as the recent-search data source, but move the UI interaction into `QueryToolbar` so the query input owns focus state, filtering, keyboard navigation, and dropdown animation. Split query-store behavior into two explicit flows: one draft-only refill action for the workspace dropdown and one immediate replay action for history-page reopen.

**Tech Stack:** React, TypeScript, Zustand, TanStack Query, shadcn/ui, Tailwind, Vitest, Testing Library, MSW

---

## Planned File Map

- `src/modules/query/model/query-store.ts`: keep the existing immediate replay action, add a draft-only refill action that updates `draftQuery` and `forcedType` without mutating `activeQuery`.
- `src/modules/query/model/query-store.test.ts`: new store-level regression coverage for the draft-only refill behavior and the existing immediate replay behavior.
- `src/modules/query/screens/workspace-screen.tsx`: fetch recent-search items once at the workspace level, remove the old standalone panel, and pass recent-search data plus refill callbacks into `QueryToolbar`.
- `src/modules/query/ui/query-toolbar.tsx`: render the input-attached dropdown, derive filtered matches, manage open/highlight state, handle keyboard and pointer selection, and apply short open/close motion classes.
- `src/modules/query/ui/workspace-screen.test.tsx`: cover focus-to-open behavior, local filtering, draft refill without `/entries` calls, keyboard behavior, and the absence of the old standalone card.
- `src/modules/recent-searches/api/fetch-recent-searches.ts`: stay as the shared `/history?page=1&size=5` query adapter used by the workspace.
- `src/modules/recent-searches/ui/recent-searches-panel.tsx`: delete the obsolete standalone card component once the toolbar dropdown is live.
- `src/modules/recent-searches/ui/recent-searches-panel.test.tsx`: delete obsolete card-specific tests after equivalent coverage exists in workspace tests.
- `src/modules/history/ui/history-screen.test.tsx`: keep this file unchanged unless store changes regress history reopen behavior; use it in verification.

### Task 1: Lock the New Draft-Only Behavior with Failing Tests

**Files:**
- Create: `src/modules/query/model/query-store.test.ts`
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`

- [ ] **Step 1: Write a failing store test for draft-only refill**

Add a new `query-store` test file with a case like:

```ts
it("fills draft state from a recorded query without starting a request", () => {
  useQueryStore.getState().fillDraftFromRecordedQuery("visible", "ENGLISH_WORD");

  const state = useQueryStore.getState();
  expect(state.draftQuery).toBe("visible");
  expect(state.forcedType).toBe("ENGLISH_WORD");
  expect(state.activeQuery).toBeNull();
  expect(state.requestIdCounter).toBe(0);
});
```

- [ ] **Step 2: Run the new store test and verify it fails**

Run:

```bash
npm run test -- src/modules/query/model/query-store.test.ts
```

Expected: FAIL because `fillDraftFromRecordedQuery` does not exist yet.

- [ ] **Step 3: Write failing workspace tests for dropdown behavior**

In `workspace-screen.test.tsx`, add tests that:

- focus `screen.getByLabelText("搜索内容")` and expect a recent-search dropdown to appear
- type `"vi"` and expect only matching recent-search items to remain visible
- select a recent-search option and assert:
  - the input value becomes `"visible"`
  - the result-type control shows `"英文单词"`
  - `/api/v1/entries` has not been called yet
- assert the old standalone "最近搜索" card title is no longer rendered in the workspace

Use accessible roles for the new surface in the test expectations:

```ts
expect(screen.getByRole("listbox", { name: "最近搜索建议" })).toBeInTheDocument();
expect(screen.getByRole("option", { name: /visible/i })).toBeInTheDocument();
```

- [ ] **Step 4: Run the workspace test slice and verify it fails for the expected reasons**

Run:

```bash
npm run test -- src/modules/query/ui/workspace-screen.test.tsx
```

Expected: FAIL because the current workspace still renders the standalone card and has no dropdown interaction.

### Task 2: Implement the Store Split First

**Files:**
- Modify: `src/modules/query/model/query-store.ts`
- Modify: `src/modules/query/model/query-store.test.ts`

- [ ] **Step 1: Add the new draft-only store action**

Extend the store type and implementation with a dedicated refill action:

```ts
fillDraftFromRecordedQuery: (query: string, resultType: EntryResultType) => void;
```

Implementation shape:

```ts
fillDraftFromRecordedQuery: (query, resultType) => {
  const trimmed = query.trim();
  if (!trimmed) {
    return;
  }

  set({
    draftQuery: trimmed,
    forcedType: resultType,
  });
},
```

Do not increment `requestIdCounter` and do not touch `activeQuery`.

- [ ] **Step 2: Keep `openRecordedQuery` as the immediate replay path**

Leave `openRecordedQuery` intact for history-page reopen flows. Add or keep one test proving it still increments the request id and updates `activeQuery`.

- [ ] **Step 3: Run the store tests and verify green**

Run:

```bash
npm run test -- src/modules/query/model/query-store.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit the store split**

Run:

```bash
git add src/modules/query/model/query-store.ts src/modules/query/model/query-store.test.ts
git commit -m "feat: split recorded-query draft refill from replay"
```

### Task 3: Rebuild the Workspace Interaction Around the Query Input

**Files:**
- Modify: `src/modules/query/screens/workspace-screen.tsx`
- Modify: `src/modules/query/ui/query-toolbar.tsx`
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`
- Delete: `src/modules/recent-searches/ui/recent-searches-panel.tsx`
- Delete: `src/modules/recent-searches/ui/recent-searches-panel.test.tsx`

- [ ] **Step 1: Move recent-search data ownership into `WorkspaceScreen`**

Use `useRecentSearchesQuery()` in `WorkspaceScreen`, remove the `RecentSearchesPanel` render, and pass these new props into `QueryToolbar`:

```ts
recentSearches={recentSearchesQuery.data ?? []}
onRecordedQueryFill={fillDraftFromRecordedQuery}
```

Do not let recent-search fetch failures block the main query form. If the hook errors or returns no data, the toolbar should simply render without dropdown content.

- [ ] **Step 2: Add combobox-style props and state to `QueryToolbar`**

Expand `QueryToolbarProps` to accept recent-search items and the draft-only refill callback. Inside the component, add focused dropdown state, highlighted-option state, and filtered-item derivation:

```ts
const filteredRecentSearches = useMemo(() => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return recentSearches;
  }

  return recentSearches.filter((item) => item.query.toLowerCase().includes(needle));
}, [query, recentSearches]);
```

Reset the highlighted index when the dropdown closes or the filtered list changes.

- [ ] **Step 3: Render the dropdown under the input**

Wrap the input in a positioned container and render a dropdown panel when:

- the input is focused
- there are recent-search records

Accessibility contract:

- input: `role="combobox"` plus `aria-expanded`, `aria-controls`, and `aria-activedescendant` when applicable
- list container: `role="listbox"` with label `"最近搜索建议"`
- item rows: `role="option"` with `aria-selected`

Suggested row content:

```tsx
<button type="button" role="option" aria-selected={isActive}>
  <span>{item.query}</span>
  <span>{resultTypeLabel}</span>
</button>
```

- [ ] **Step 4: Implement reliable selection and dismissal behavior**

Add a `selectRecentSearch(item)` helper that:

- calls `onRecordedQueryFill(item.query, item.resultType)`
- closes the dropdown
- returns focus to the input

Use `onMouseDown` or `onPointerDown` for the option selection path so a click does not lose the race to input blur. Also wire:

- input focus -> open dropdown
- `Escape` -> close dropdown
- outside click / blur -> close dropdown

- [ ] **Step 5: Implement keyboard navigation without breaking submit**

Handle:

- `ArrowDown` / `ArrowUp` to move the active option
- `Enter` with an active option to refill draft state only
- `Enter` with no active option to fall through to the existing submit flow

Keep the existing form submit handler untouched for the no-highlight path.

- [ ] **Step 6: Apply restrained motion and scrolling**

Use existing tokens and classes such as:

```tsx
className="transition-[opacity,transform] duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-reduce:transition-none"
```

Add:

- short fade + translate motion
- max-height and internal overflow for the dropdown
- automatic scroll-into-view for the active option if keyboard navigation moves it out of view

- [ ] **Step 7: Run the focused workspace tests and verify green**

Run:

```bash
npm run test -- src/modules/query/ui/workspace-screen.test.tsx src/modules/query/model/query-store.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the workspace dropdown interaction**

Run:

```bash
git add src/modules/query/screens/workspace-screen.tsx src/modules/query/ui/query-toolbar.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/recent-searches/ui/recent-searches-panel.tsx src/modules/recent-searches/ui/recent-searches-panel.test.tsx
git commit -m "feat: add recent-search dropdown to query input"
```

### Task 4: Verify History Replay Still Works and Close the Regression Loop

**Files:**
- No new file edits expected unless a regression is exposed.

- [ ] **Step 1: Run the main regression slice for touched behavior**

Run:

```bash
npm run test -- src/modules/query/model/query-store.test.ts src/modules/query/ui/workspace-screen.test.tsx src/modules/history/ui/history-screen.test.tsx
```

Expected: PASS. In particular, `history-screen.test.tsx` should prove that history-page "打开" still runs a live query instead of only refilling draft state.

- [ ] **Step 2: If a regression appears, fix only the minimal affected file and rerun the same slice**

Most likely failure mode: `openRecordedQuery` or workspace wiring accidentally changes the history-page behavior. Fix that path without reintroducing auto-submit in the workspace dropdown.

- [ ] **Step 3: Commit the verified final state**

Run:

```bash
git add src/modules/query/model/query-store.test.ts src/modules/query/model/query-store.ts src/modules/query/screens/workspace-screen.tsx src/modules/query/ui/query-toolbar.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/history/ui/history-screen.test.tsx
git commit -m "test: verify recent-search dropdown and history replay flows"
```
