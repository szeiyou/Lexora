# CoDict Translation Page With History Key Design

Date: 2026-03-29
Status: Approved in chat
Target: Existing CoDict desktop client
Tech Stack: React, TypeScript, TanStack Query, Zustand, shadcn/ui, Tailwind, Vitest, MSW

## 1. Overview

The backend now exposes `POST /api/v1/text-translations` as a dedicated short-text translation entry point. This capability is separate from `/api/v1/entries`, which still serves English word lookup, Chinese-to-English term lookup, and sentence translation under the existing `EntryQueryResponse` envelope.

The client should match that split by adding a new top-level "翻译" page instead of extending the existing "查词" page. The new page will own the `TextTranslationResponse` contract, translation-specific inputs, and translation-specific recent-history affordances. The existing workspace remains focused on dictionary-style lookups and sentence translation.

The backend also introduced `historyKey` and restored a history detail API: `GET /api/v1/history/{historyKey}`. This removes the main ambiguity in translation history replay. The client can now reopen saved history by first reading the grouped summary list from `/api/v1/history`, then resolving the selected summary into a full saved response via `historyKey`, instead of re-running a live translation request.

## 2. Goals

- Add a new top-level "翻译" page alongside "查词", "历史", "单词本", and "设置".
- Use `POST /api/v1/text-translations` exclusively for the new page.
- Keep the existing "查词" page behavior unchanged, including `SENTENCE_TRANSLATION` support via `/api/v1/entries`.
- Support source-language and target-language selection on the translation page.
- Show translation-only recent history as a dedicated side list in the translation workspace.
- Use `historyKey` to reopen saved translation history precisely.
- Route history reopen actions to the correct page based on `resultType`.

## 3. Non-Goals

- No redesign of the existing "查词" workflow.
- No removal of `SENTENCE_TRANSLATION` from `/api/v1/entries`.
- No backend API changes.
- No attempt to unify query-page and translation-page state into one global store during this pass.
- No new caching or persistence layer beyond the APIs already provided by the backend.

## 4. Current State

### 4.1 Navigation and routes

The app shell currently exposes four top-level destinations:

- `/` -> 查词
- `/history` -> 历史
- `/wordbooks` -> 单词本
- `/settings` -> 设置

There is no dedicated translation page yet.

### 4.2 Query and history assumptions

The current client assumes:

- all query-like results are owned by the query workspace
- history reopen for query results means navigating back to the workspace and running a fresh query
- history result types reuse the query module's `EntryResultType`
- history timestamps arrive as strings

Those assumptions are now incomplete because:

- `TEXT_TRANSLATION` is a new history-only result type from the client's perspective
- translation results come from `TextTranslationResponse`, not `EntryQueryResponse`
- `/api/v1/history/{historyKey}` now returns the latest saved full response for a grouped history item
- `latestSearchTime` and `searchTimes` now arrive as variable-length Jackson numeric arrays

## 5. Chosen Approach

Use a dedicated `translations` module with its own page, request types, result mapping, and UI. Keep its state local to the page. Let the history module own grouped history summaries and `historyKey` detail resolution, then hand the resolved result to either the query workspace or the translation page based on `resultType`.

This approach is preferred because it mirrors the backend contract split without forcing an unnecessary refactor of the existing query workspace. It also uses the new history detail API the way the backend intends: grouped summaries for browsing, `historyKey` for precise reopen.

## 6. Design

### 6.1 Routing and navigation

Add a new top-level route:

- `/translations` -> 翻译

Add a corresponding navigation item in the left sidebar between "查词" and "历史" or immediately adjacent to "查词". The placement detail is not functionally important as long as the page is clearly a peer destination.

### 6.2 Module boundaries

Introduce a new module tree:

- `src/modules/translations/api/**`
- `src/modules/translations/model/**`
- `src/modules/translations/screens/**`
- `src/modules/translations/ui/**`

Responsibilities:

- `query` module continues to own `/api/v1/entries` and `/api/v1/entries/refresh`
- `translations` module owns `/api/v1/text-translations`
- `history` module owns grouped history summaries and `historyKey` detail fetches

The history module should no longer depend directly on the query module's `EntryResultType` for its list item type, because the history API can now return `TEXT_TRANSLATION`.

### 6.3 Translation page interaction model

The translation page should provide:

- a dual-pane translation workspace on desktop, stacked vertically on smaller screens
- a multiline text input
- source-language selection: `auto`, `zh`, `en`
- target-language selection: `zh`, `en`
- a translation-only recent-history list sourced from `/api/v1/history?page=1&size=5`
- a primary submit action
- a result surface that renders the saved or freshly fetched translation response

The page is responsible for two distinct entry paths:

- live translation: user submits text and the page calls `POST /api/v1/text-translations`
- history restore: user opens a grouped translation record and the page restores the saved response fetched through `historyKey`

The page should keep its state local rather than introducing a global translation store in the first pass. This keeps the boundary clean and avoids entangling translation-specific data with the query workspace store.

### 6.4 Translation page layout

The translation page should not copy the query workspace's combobox-like recent-search pattern. The translation input is intentionally taller and reads more like an editor surface than a single-line query field. A dropdown attached to the bottom of that surface would make the top of the page feel heavy and visually unstable.

Use this layout instead:

- desktop and large tablet:
  - left primary pane for controls and the large text input
  - right secondary pane for recent translation history
- smaller screens:
  - stack the recent-history pane below the input pane

Recommended composition:

- page header with title and a short explanation
- top workspace row:
  - left pane:
    - compact control row for source language, target language, and primary action
    - large multiline translation input panel below it
  - right pane:
    - titled "最近查询"
    - fixed-height or naturally bounded list with 4 to 6 recent `TEXT_TRANSLATION` items
    - each row emphasizes source text first and translation summary second
- result section below the workspace row

This makes the translation page feel like a writing and review workspace instead of a narrow search form. It also keeps recent history visible without visually colliding with the input panel.

### 6.5 Translation data model

Add a dedicated translation response model matching the backend contract:

- `text`
- `normalizedText`
- `sourceLanguage`
- `targetLanguage`
- `translatedText`
- `segments`
- `keyPhrases`
- `notes`

Add a translation result view model that can be rendered directly by the translation page UI. The page should preserve both the current input state and the last successful result, so a failed request does not wipe a previously displayed success.

### 6.6 Recent translation history

The existing recent-history data source remains `/api/v1/history?page=1&size=5`, but the translation page should filter it to `TEXT_TRANSLATION` items only.

Each recent-history item for the translation page should carry:

- `historyKey`
- `query`
- `resultType`
- `summary`
- `latestSearchTime`

The translation page should render these items in the right-hand recent-history pane rather than behind an input-attached dropdown. On smaller screens this pane can collapse into a stacked card below the input area, but it should still be a visible list, not a dropdown.

Selecting a recent translation item should use `historyKey` to fetch `/api/v1/history/{historyKey}` and restore the saved latest translation result. Restoration should update:

- the multiline input value from `response.text`
- the source-language control from `response.sourceLanguage`
- the target-language control from `response.targetLanguage`
- the rendered translation result from the saved `TextTranslationResponse`

It should not merely refill the input and re-run `POST /api/v1/text-translations`.

This is the key design change enabled by the new backend contract.

### 6.7 History browsing and reopen behavior

History browsing continues to use `/api/v1/history` for the paginated grouped summary list. The client should update the history summary model to include `historyKey` and accept `resultType = TEXT_TRANSLATION`.

When the user clicks "打开" on a history item:

1. Fetch `GET /api/v1/history/{historyKey}` using the exact `historyKey` from the summary.
2. Inspect the returned `resultType`.
3. Route by type:
   - `ENGLISH_WORD`, `ZH_TO_EN_TERM`, `SENTENCE_TRANSLATION` -> navigate to `/`
   - `TEXT_TRANSLATION` -> navigate to `/translations`
4. Pass the resolved restore payload through route state during navigation.
5. Restore the returned `response` on the destination page instead of replaying a live network query.

This replaces the current reopen behavior that re-runs `/api/v1/entries`.

If the history detail fetch fails, the client should stay on the history page and show a recoverable error there. It should not navigate first and then fail on the destination page.

### 6.8 Query workspace compatibility

The existing query workspace should remain behaviorally unchanged for direct user queries. It still supports:

- auto classification through `/api/v1/entries`
- explicit `ENGLISH_WORD`
- explicit `ZH_TO_EN_TERM`
- explicit `SENTENCE_TRANSLATION`

The only required compatibility work on the query side is history restore. When history detail returns an `EntryQueryResponse`, the workspace should be able to accept the restored response and render it without issuing a fresh query.

The workspace restore path should hydrate from route state on navigation from the history screen, initialize the visible draft query from the restored result's query fields, and render the restored mapped result as the current result until the user submits a new live query.

### 6.9 History detail parsing

Replace the old history detail assumptions:

- old shape: `id`, `responseSchema`, `responseJson`
- new shape: grouped detail object with `historyKey`, grouped metadata, `resultType`, and typed `response`

The parser should branch on `resultType`:

- `ENGLISH_WORD`, `ZH_TO_EN_TERM`, `SENTENCE_TRANSLATION` -> parse `response` as `EntryQueryResponse`, then map through the existing query result mapper
- `TEXT_TRANSLATION` -> parse `response` as `TextTranslationResponse`, then map through the new translation result mapper

The parsing layer should return a discriminated restore result so the history screen can route without guessing.

### 6.10 Time handling

History timestamps are now returned as Jackson numeric arrays rather than ISO strings. The history module should normalize these arrays into displayable text and stable internal values.

Recommended approach:

- keep the raw numeric-array shape in API types
- add a small adapter in the history module to format those arrays for UI
- stop assuming that `latestSearchTime` and `searchTimes` are strings anywhere in list keys or display logic

Keys for recent-history and history-list items should prefer `historyKey`, not timestamp serialization.

## 7. Error Handling and Edge Cases

- Translation submit should block when trimmed text is empty.
- Translation submit should block when trimmed text exceeds 3000 characters.
- Translation submit should block when source and target languages are explicitly the same.
- If the translation request fails, the page should show an error state while preserving the last successful result.
- If recent translation history fails to load, the page should still support direct manual translation.
- If history detail fetch fails during reopen, the current page should show a recoverable error message instead of silently falling back to a live query.
- If history detail returns malformed or incompatible `response`, treat it as a recoverable history-open failure.
- If `historyKey` is missing from a summary item, the open action should fail fast with a recoverable UI error.
- If recent translation history detail fetch fails from the translation page recent-history pane, the page should keep the current input and current rendered result unchanged, then show a recoverable inline error on the translation page.

## 8. Testing Strategy

### 8.1 Translation page tests

Add tests to verify:

- the new route renders the translation page
- submitting valid text calls `POST /api/v1/text-translations` with the correct JSON body
- source and target language controls behave correctly
- same-language validation blocks submission
- 3000-character validation uses trimmed length
- successful translation renders `translatedText`, `segments`, `keyPhrases`, and `notes`
- request failure preserves the previous successful result

### 8.2 Recent translation history tests

Add tests to verify:

- the translation page recent-history pane shows only `TEXT_TRANSLATION` items
- the translation page uses a desktop two-pane layout and a stacked mobile layout
- selecting a recent item fetches `/api/v1/history/{historyKey}`
- selecting a recent item restores the saved translation response instead of re-posting to `/api/v1/text-translations`

### 8.3 History screen tests

Update tests to verify:

- history summaries include and use `historyKey`
- opening an `EntryQueryResponse` history item fetches history detail and routes to `/`
- opening a `TEXT_TRANSLATION` history item fetches history detail and routes to `/translations`
- both paths restore saved responses without issuing fresh live query requests

### 8.4 Query workspace regression tests

Keep regression coverage for:

- direct `/api/v1/entries` requests still working from the workspace
- `SENTENCE_TRANSLATION` still rendering through the existing query result path
- refresh behavior on the workspace remaining unchanged for live query results

### 8.5 History time-format tests

Add tests to verify:

- Jackson numeric-array times are accepted from `/api/v1/history`
- list rendering remains stable
- key generation uses `historyKey` instead of stringified timestamps

## 9. Affected Files

- `src/app/router.tsx`
- `src/app/layouts/app-shell.tsx`
- `src/modules/history/api/fetch-history-page.ts`
- `src/modules/history/api/fetch-history-detail.ts`
- `src/modules/history/screens/history-screen.tsx`
- `src/modules/history/ui/history-screen.test.tsx`
- `src/modules/history/model/history-response.parser.ts` or a replacement typed restore parser
- `src/modules/recent-searches/api/fetch-recent-searches.ts`
- `src/modules/query/screens/workspace-screen.tsx`
- `src/modules/query/model/query-store.ts` or adjacent restore plumbing if needed
- `src/modules/translations/api/fetch-text-translation.ts`
- `src/modules/translations/model/text-translation-response.ts`
- `src/modules/translations/model/text-translation-result-mapper.ts`
- `src/modules/translations/screens/translations-screen.tsx`
- `src/modules/translations/ui/**`
- `src/modules/translations/ui/recent-translation-list.tsx`

## 10. Open Implementation Notes

- Use route state as the restore handoff mechanism from the history screen to the destination page. Do not introduce a new global persisted restore cache in this pass.
- The destination page should consume route-state restore data on first render, initialize its local visible state from that payload, and still tolerate direct navigation without restore state as a normal fresh-entry page.
- The translation page can share low-level UI primitives with the workspace, but should not be forced into the query module's state model.
