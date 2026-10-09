# Wordbook Word Detail Navigation Design

Date: 2026-04-30
Status: Approved in chat
Target: Existing CoDict desktop client wordbook detail pane
Tech Stack: React, TypeScript, React Router, Zustand, TanStack Query, Tailwind, Vitest, Testing Library, Playwright

## 1. Overview

The wordbook page currently lets users select a wordbook and review each saved word's compact summary. A saved word row shows the word, part of speech, and meaning, but it does not provide a direct way to open the full dictionary detail. Users must manually copy or retype the word into the main lookup workspace.

The app already has a strong pattern for opening existing data in the correct workspace: the history page fetches or resolves a selected item, navigates to the destination route, and lets that destination own the final rendering. Wordbook word navigation should follow the same model.

## 2. Goals

- Let users open a saved word from the wordbook detail pane with one click.
- Navigate to the existing `查词` workspace and re-run a fresh lookup for the clicked word.
- Keep the wordbook page focused on collection management rather than duplicating dictionary detail UI.
- Preserve existing query loading, error, refresh, and result rendering behavior.
- Make the clickable row discoverable and keyboard accessible.
- Cover the navigation path with focused component tests and at least one e2e flow.

## 3. Non-Goals

- No new standalone word detail route in this pass.
- No word detail drawer or modal inside the wordbook page.
- No use of the wordbook row's saved `meaning` as the full detail source.
- No backend API changes.
- No changes to add-to-wordbook behavior from the query result page.

## 4. Current State

### 4.1 Wordbook page

`WordbooksScreen` owns the selected wordbook and renders `WordbookDetailPane`. `WordbookDetailPane` fetches words through `fetchWordbookWords(wordbook.id, settings)` and renders each item as a static `<li>`.

The rendered word item has enough data to identify the lookup query:

- `word`
- `partOfSpeech`
- `meaning`
- `createTime`

Only `word` is needed to reopen the full detail.

### 4.2 Query workspace

`WorkspaceScreen` owns live entry lookup through the global `useQueryStore`. The store already exposes methods that can start a lookup from outside a typed submit flow:

- `reopenRecentSearch(query, resultType)`
- `restoreHistoryResult(query, resultType, result)`

For wordbook navigation, the desired behavior is closest to `reopenRecentSearch`: set the draft, set the result type, clear any restored result, and create a new active query request.

### 4.3 Existing navigation precedent

`HistoryScreen` uses `useNavigate()` and route state to reopen previous work in the destination page. `WorkspaceScreen` already reads `location.state` for history restoration and applies it once per location key to avoid repeated effects.

Wordbook navigation can extend this route-state pattern with a new state shape for live word lookup.

## 5. Options Considered

### 5.1 Recommended: Click row, navigate to `/`, and re-run lookup

The word row becomes an accessible clickable control. Clicking it navigates to `/` with route state containing the word. `WorkspaceScreen` consumes that state and starts a live `ENGLISH_WORD` lookup.

Pros:

- reuses the existing detail page and query API
- returns current data from the server
- matches the history reopen architecture
- keeps implementation small and well bounded

Cons:

- users leave the wordbook page after opening a word

### 5.2 Add an explicit "打开" button inside each row

Each word row stays mostly static, with an extra button to open the lookup workspace.

Pros:

- very explicit affordance
- avoids accidental row clicks

Cons:

- adds visual noise to a compact list
- creates two possible interaction targets inside a small row

### 5.3 Show a word detail panel inside the wordbook page

Clicking a row would fetch and render the full dictionary result in the wordbook page.

Pros:

- keeps the user on the wordbook page

Cons:

- duplicates query workspace responsibilities
- requires pulling result rendering, loading, error, refresh, and add-to-wordbook behavior into a second surface
- increases future maintenance cost

## 6. Chosen Approach

Choose Option 5.1.

Each wordbook word item becomes a clickable row that opens the existing query workspace and triggers a fresh `ENGLISH_WORD` lookup for the saved word. The saved summary remains only a preview; it is not treated as authoritative detail content.

## 7. Detailed Design

### 7.1 Route state contract

Add a small route-state contract for wordbook word lookup, conceptually:

```ts
type WordbookWordLookupLocationState = {
  wordbookWordLookup?: {
    query: string;
  };
};
```

The state only needs the word text. The query workspace will supply the result type as `ENGLISH_WORD` because wordbook entries are saved words.

### 7.2 Wordbook detail interaction

`WordbookDetailPane` receives a new callback prop such as:

```ts
onOpenWord: (word: string) => void;
```

`WordbooksScreen` implements that callback with `useNavigate()`:

```ts
navigate("/", {
  state: {
    wordbookWordLookup: { query: word },
  },
});
```

Each word row remains an `<li>`, and the row content becomes a full-width `<button type="button">` inside that list item. This keeps list semantics while giving the interactive target native keyboard behavior. It should keep the current compact visual style while adding:

- pointer cursor
- hover background
- focus-visible ring
- `aria-label`, for example `打开单词 phenomenon 的详情`
- stable spacing so the list does not shift on hover

### 7.3 Query workspace behavior

`WorkspaceScreen` extends its existing route-state effect. When it sees `wordbookWordLookup.query`, it should:

1. trim the query
2. ignore empty values
3. avoid applying the same location state more than once
4. call `reopenRecentSearch(query, "ENGLISH_WORD")`
5. clear any transient feedback

This starts a fresh live entry query through the existing TanStack Query path. Existing loading, success, error, timeout, refresh, recent-search invalidation, and failure logging behavior remains unchanged.

### 7.4 Error handling

The wordbook page does not need special error handling for the lookup. After navigation, the query workspace already displays:

- loading state while `/api/v1/entries` is pending
- timeout-specific copy
- generic fetch failure copy
- previous result clearing through the query store's live lookup flow

If a wordbook word is somehow empty after trimming, the click handler should do nothing.

### 7.5 Accessibility

The row must be reachable with keyboard navigation and operable via Enter/Space. It should expose a clear accessible name based on the word text.

The static part of speech and meaning remain visible as preview content. The clickable row should not hide or replace those values.

## 8. Testing

### 8.1 Unit and component tests

Update `WordbookDetailPane` or `WordbooksScreen` tests to verify:

- saved words render as accessible open controls
- clicking a saved word requests navigation to the query workspace
- empty wordbook and loading/error states remain unchanged

Update `WorkspaceScreen` coverage to verify:

- route state with `wordbookWordLookup.query` starts an `ENGLISH_WORD` lookup
- repeated effects for the same location key do not duplicate the request

### 8.2 E2E test

Extend `tests/e2e/history-and-wordbooks.spec.ts` with a flow:

1. seed settings and authenticated state as the existing wordbook tests do
2. open the wordbook page
3. select a wordbook that contains a saved word
4. click the saved word row
5. verify the app is on the `查词` workspace
6. verify the input contains the clicked word
7. verify the live `/api/v1/entries` response renders the latest detail

## 9. Implementation Notes

- Keep the change scoped to the wordbook UI, query workspace route-state handling, and tests.
- Prefer reusing `useQueryStore.reopenRecentSearch` over adding a new query-store action unless the existing method name becomes confusing in tests.
- Keep route-state type definitions near the consuming module, similar to the existing history restore state.
- Do not introduce a new route unless a future design requires word detail URLs.
