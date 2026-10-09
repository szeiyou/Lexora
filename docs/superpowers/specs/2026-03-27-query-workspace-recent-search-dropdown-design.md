# CoDict Query Workspace Recent Search Dropdown Design

Date: 2026-03-27
Status: Approved in chat
Target: Existing CoDict desktop client
Tech Stack: React, TypeScript, TanStack Query, Zustand, shadcn/ui, Tailwind, Vitest, MSW

## 1. Overview

The current workspace shows "最近搜索" as a separate card below the query form. That works functionally, but it is visually detached from the "搜索内容" input and consumes persistent vertical space even when the user is not using search history.

The new interaction should make recent searches feel like part of the input workflow. When the user focuses the "搜索内容" field, a dropdown should appear under the input. As the user types, the dropdown should filter recent-search items locally. Choosing an item should refill the query text and synchronize the result type, but it must not immediately run a query. The dropdown should close naturally on blur, outside click, selection, or `Escape`, and it should animate in a short, restrained way that matches existing motion tokens.

## 2. Goals

- Replace the standalone recent-search card in the workspace with an input-attached dropdown.
- Show recent searches as soon as the query input receives focus.
- Filter recent-search items locally as the user types in the query input.
- Refill both query text and result type from the selected history item without auto-submitting.
- Keep the interaction smooth for mouse and keyboard users.
- Reuse the existing `/api/v1/history?page=1&size=5` recent-search data source.

## 3. Non-Goals

- No backend API changes.
- No redesign of the dedicated history page.
- No change to how explicit query submission works.
- No automatic query execution when a recent-search item is selected from the dropdown.
- No fuzzy ranking, server-side filtering, or advanced search scoring for recent-search matches.

## 4. Current State

### 4.1 Workspace structure

The workspace currently renders:

- `QueryToolbar` for query input, result-type selection, submit, and refresh.
- `RecentSearchesPanel` as a separate card below the toolbar.
- Result and status blocks below those surfaces.

### 4.2 Recent-search behavior

Recent searches are already loaded from `/api/v1/history?page=1&size=5` through `useRecentSearchesQuery()`.

Selecting a recent-search item currently uses a query-store action that:

- fills the draft query
- sets the forced result type
- immediately promotes the item into the active query
- triggers `/api/v1/entries`

That "reopen immediately" behavior remains correct for history-page "打开", but it is no longer correct for the query-input dropdown interaction.

## 5. Design

### 5.1 High-level interaction model

The workspace query input becomes a lightweight combobox-style surface backed by recent-search data:

- Focusing the query input opens the dropdown when recent-search data exists.
- The dropdown remains open while the user types, unless it is explicitly dismissed.
- Filtering is local and based on the current query-input value.
- Selecting an item updates draft state only, then closes the dropdown.
- Actual querying still requires explicit submit through the existing "查询" button or form submit behavior.

The workspace should no longer render the old `RecentSearchesPanel` card once the dropdown is in place. Keeping both surfaces would duplicate the same feature and create conflicting interaction models.

### 5.2 Dropdown open and close behavior

The dropdown should open when all of the following are true:

- the workspace is hydrated and query-capable
- recent-search data contains at least one item
- the query input has focus

The dropdown should close when any of the following happens:

- the user selects an item
- the user presses `Escape`
- the user clicks outside the input-plus-dropdown region
- the input loses focus and focus does not move into the dropdown interaction path

To prevent premature collapse during pointer selection, blur handling should not hard-close the dropdown synchronously. Use one of these safe patterns:

- handle selection on `pointerdown` or `mousedown` before blur completes
- or use a minimal delayed close and cancel it when the dropdown itself receives the interaction

The implementation should choose the simpler pattern that remains stable under tests.

### 5.3 Filtering behavior

Filtering should stay intentionally simple:

- source field: `item.query`
- match rule: case-insensitive substring match
- empty input: show all recent-search items
- no matches: show a lightweight empty state such as "没有匹配的最近搜索"

The dropdown should not attempt fuzzy matching, tokenization, typo tolerance, or server refetches. The item count is small enough that local filtering is sufficient and predictable.

### 5.4 Selection behavior

Selecting a recent-search item from the dropdown must:

- set `draftQuery` to `item.query`
- set `forcedType` to `item.resultType`
- leave `activeQuery` unchanged
- avoid triggering `/api/v1/entries`
- close the dropdown
- return focus to the query input so the user can continue editing or submit immediately

This requires a dedicated store action for "refill draft from recorded query" rather than reusing the current "open and execute" action.

The existing immediate-open behavior should remain available for history-page reopen flows, because that route still expects "打开" to navigate back and run the query.

### 5.5 Keyboard and pointer interactions

The dropdown should support a complete but minimal keyboard model:

- `ArrowDown`: move active highlight to the next visible item
- `ArrowUp`: move active highlight to the previous visible item
- `Enter`:
  - if the dropdown is open and an item is highlighted, select that item and refill draft state
  - otherwise keep the current form-submit behavior and run the query
- `Escape`: close the dropdown without clearing input

Pointer behavior should match keyboard highlight semantics:

- hovering an item updates the active visual highlight
- clicking or pressing on an item selects it reliably

If keyboard navigation moves the active item outside the visible region, the list should scroll just enough to bring it back into view.

### 5.6 Visual treatment

The dropdown should visually read as an extension of the input field, not as a second full card:

- width aligns with the query input
- the container sits immediately below the input
- it uses existing popover/surface tokens instead of a new visual language
- the top label stays lightweight, for example "最近搜索" or "匹配的最近搜索"
- each row emphasizes the query text first and the result-type label second

The dropdown should have a fixed maximum height with internal scrolling. The empty state should remain subtle and low-emphasis.

### 5.7 Motion

The interaction should use restrained motion that matches the rest of the app:

- open: short fade plus slight vertical translation
- close: reverse of the open transition
- motion duration: `--motion-fast` or `--motion-base`
- easing: `--motion-ease`
- reduced motion: disable transition and animation with the existing `motion-reduce` pattern

The goal is to make the dropdown feel intentional and responsive, not decorative.

## 6. State and Component Changes

### 6.1 Query store

`query-store` should separate two concepts that are currently bundled together:

- "replay a recorded query immediately"
- "refill draft form state from a recorded query"

Recommended store actions:

- keep `openRecordedQuery(query, resultType)` for immediate execution flows
- add a new action such as `fillDraftFromRecordedQuery(query, resultType)` for the workspace dropdown

The new draft-only action should:

- trim the query
- no-op if the trimmed query is empty
- set `draftQuery`
- set `forcedType`
- not mutate `activeQuery`
- not increment request ids

### 6.2 Query toolbar

`QueryToolbar` should take responsibility for the dropdown interaction because the input, filtering, keyboard handling, and selection state are tightly coupled to the query field.

Expected additional responsibilities:

- receive recent-search items
- track dropdown open state
- derive filtered items from `query`
- track highlighted item index or key
- render the dropdown under the input
- call the new draft-only refill action on selection

### 6.3 Workspace screen

`WorkspaceScreen` should stop rendering `RecentSearchesPanel` and instead pass recent-search data plus refill callbacks into `QueryToolbar`.

Data fetching can remain at the workspace level or move into the toolbar. Prefer the option that keeps tests and ownership clear while avoiding duplicated fetches.

### 6.4 Recent-search module

The recent-search data query stays relevant, but the old panel UI becomes obsolete for the workspace. The implementation may either:

- delete `RecentSearchesPanel` if it is no longer used anywhere
- or keep it temporarily unused if removal would create unnecessary churn during the first pass

The preferred final state is removal to avoid dead UI code.

## 7. Error Handling and Edge Cases

- If recent-search data is empty, no dropdown content should render on focus.
- If the history fetch fails, the workspace should continue to function as a normal query form without the dropdown.
- If the user types after refilling from a recent-search item, the draft behaves exactly like normal manual input.
- If the selected recent-search item carries a result type different from the current form selection, the form selection should update immediately to match the item.
- If the filtered list becomes empty while the dropdown is open, the empty state replaces result rows without closing the dropdown.
- If the user presses `Enter` while the dropdown is open but no item is highlighted, the form should submit normally.

## 8. Testing Strategy

### 8.1 Workspace and toolbar tests

Add or update tests to verify:

- focusing the query input opens the dropdown when recent-search data exists
- typing filters visible recent-search items by query text
- selecting an item refills the input value
- selecting an item synchronizes the result-type control
- selecting an item does not trigger `/api/v1/entries`
- pressing `Escape` closes the dropdown
- pressing `Enter` on a highlighted item refills draft state instead of submitting
- pressing `Enter` with no highlighted item still submits the query
- outside click or blur closes the dropdown

### 8.2 Store tests

Add targeted tests for the new draft-only refill action to prove:

- it updates `draftQuery`
- it updates `forcedType`
- it leaves `activeQuery` unchanged
- it does not increment the query request counter

### 8.3 Regression coverage

Keep or update tests that prove:

- manual query submission still works
- refresh behavior is unchanged
- history-page reopen still triggers live query execution

## 9. Affected Files

- `src/modules/query/model/query-store.ts`
- `src/modules/query/ui/query-toolbar.tsx`
- `src/modules/query/screens/workspace-screen.tsx`
- `src/modules/query/ui/workspace-screen.test.tsx`
- `src/modules/recent-searches/api/fetch-recent-searches.ts` if ownership shifts
- `src/modules/recent-searches/ui/recent-searches-panel.tsx` if removed
- `src/modules/recent-searches/ui/recent-searches-panel.test.tsx` if removed or rewritten

## 10. Acceptance Criteria

- The workspace no longer shows the old standalone "最近搜索" card.
- Focusing the "搜索内容" input opens a recent-search dropdown when data exists.
- Typing filters the dropdown locally.
- Selecting a dropdown item refills both query text and result type.
- Selecting a dropdown item does not automatically run a query.
- The dropdown closes cleanly on selection, `Escape`, blur, and outside click.
- The dropdown supports keyboard navigation without breaking normal query submission.
- Motion is short, subtle, and disabled for reduced-motion users.
