# Translation Result Area Design

Date: 2026-04-03
Status: Approved in chat
Target: Existing CoDict desktop client translation page UI
Tech Stack: React, TypeScript, shadcn/ui, Tailwind, Vitest, Testing Library

## 1. Overview

The current translation page renders a standalone `结果` card above the actual translation result. That card only shows `当前内容：{text}`. The `译文` card below it then repeats the same source text again as `原文：{text}`.

This duplication adds vertical weight without adding meaning. On the translation page, the standalone `结果` card does not summarize the result type, does not expose actions, does not indicate staleness, and does not group multiple result variants. It is therefore not serving the same purpose that the `结果` wrapper still serves on the query workspace.

This pass removes the redundant standalone `结果` card from the translation page and replaces the repeated full source-text display inside `译文` with a more compact, user-friendly source preview:

- default to a 3-line source preview
- fade the tail visually when collapsed
- show a lightweight inline trigger `查看完整原文` only when the source actually overflows
- expand and collapse inline within the same card

The result should feel lighter, more readable, and more intentional without changing translation data flow or the rest of the translation result sections.

## 2. Goals

- Remove redundant source-text duplication on the translation page.
- Preserve a clear connection between the translation result and its source text.
- Keep the translation result focused on the translated output first.
- Make long source text readable without forcing a modal, drawer, or navigation jump.
- Keep interaction light and keyboard-accessible.
- Keep the change narrowly scoped to the translation page.

## 3. Non-Goals

- No redesign of the query workspace result area.
- No change to translation request behavior, history restore behavior, or API contracts.
- No changes to the `分段对照`, `关键词`, or `备注` layouts beyond any spacing needed after removing the standalone `结果` card.
- No new global state for expansion or result presentation.
- No modal or drawer pattern for viewing source text in this pass.

## 4. Current State Analysis

### 4.1 Translation page

`src/modules/translations/screens/translations-screen.tsx` currently renders:

- the translation workspace
- recent translation history
- inline error alerts
- a standalone `结果` card with `当前内容：{currentResult.text}`
- `TextTranslationResult`

`src/modules/translations/ui/text-translation-result.tsx` currently renders:

- a `译文` card
- a full inline source line: `原文：{result.text}`
- the translated text
- optional `分段对照`
- optional `关键词`
- optional `备注`

This means the same source text is shown twice in immediate succession.

### 4.2 Query workspace

`src/modules/query/screens/workspace-screen.tsx` still uses a standalone `结果` wrapper before dispatching into `ResultSwitch`.

That wrapper still has value because the query workspace is a mixed-result screen:

- English word lookup
- Chinese-to-English term lookup
- sentence translation

It acts as a lightweight common entry point across multiple result surfaces. The translation page, by contrast, has only one result surface and no result-type switching within the page.

## 5. Options Considered

### 5.1 Option A: Remove the standalone `结果` card and keep a compact source preview inside `译文`

This keeps the translation page lean while preserving enough source context to avoid ambiguity.

Pros:

- removes the redundant card entirely
- reduces vertical clutter
- keeps source and translation in one coherent result surface
- works well for both short and long source text

Cons:

- requires a small amount of local UI logic for overflow detection and expand/collapse state

### 5.2 Option B: Keep a compressed standalone result-context row above `译文`

This would preserve a separate context layer, but it still introduces an extra block above the primary translation content.

Pros:

- makes result context explicit

Cons:

- still consumes vertical space
- still splits source context from the actual translation surface
- adds complexity for limited benefit on a single-result page

### 5.3 Option C: Remove both the standalone card and the source preview

This would be the lightest layout, but it would make it harder for users to confirm which source text the current result belongs to, especially after editing the textarea or reopening history.

Pros:

- most compact layout

Cons:

- weakens source/result association
- increases ambiguity for long-lived result states

## 6. Chosen Approach

Choose Option A.

The translation page should:

- remove the standalone `结果` card entirely
- keep the `译文` card as the single entry point to translation output
- render a source-text preview at the top of the `译文` card
- show at most 3 lines by default
- use a soft bottom fade when collapsed
- show a lightweight inline trigger styled like a text link below the preview: `查看完整原文`
- expand inline within the same card
- switch the trigger text to `收起原文` when expanded

The trigger style should follow the approved A3 direction from chat:

- visually lighter than a standard secondary button
- placed below the collapsed preview rather than on the right edge
- presented as a quiet inline action, closer to a reading affordance than a command button

## 7. Detailed Design

### 7.1 Page-level structure

In `src/modules/translations/screens/translations-screen.tsx`:

- keep the workspace area unchanged
- keep recent translation history unchanged
- keep inline error alerts unchanged
- when `currentResult` exists, render `TextTranslationResult` directly
- remove the standalone `结果` card entirely

This makes `TextTranslationResult` the only translation result container on the page.

### 7.2 `译文` card structure

In `src/modules/translations/ui/text-translation-result.tsx`, the `译文` card should render in this order:

1. Source preview block
2. Inline expand/collapse trigger when needed
3. Main translated text

The source preview block should:

- keep the label `原文`
- show the full text when it fits within 3 lines
- collapse to 3 lines when it exceeds 3 lines
- avoid repeating the full source text anywhere else in the immediate vicinity

The translated text remains the visual focal point and should continue to use stronger typography than the source preview.

### 7.3 Collapse and expand behavior

Collapsed state:

- source preview is visually limited to 3 lines
- a bottom fade indicates more content exists
- the trigger reads `查看完整原文`

Expanded state:

- source preview shows full text
- no fade overlay is shown
- the trigger reads `收起原文`

This interaction should happen inline inside the same card. No modal, popover, drawer, tooltip, or route change is used.

### 7.4 When the trigger appears

The expand/collapse trigger and fade should appear only if the source text truly exceeds the 3-line collapsed height.

If the source text fits within 3 lines:

- show the full source text
- do not show fade
- do not show `查看完整原文`

This avoids adding dead controls to short translations.

### 7.5 Overflow detection

Overflow should be determined from the rendered source preview element rather than estimated from character count.

Preferred implementation:

- render the source preview in collapsed styling by default
- measure whether the element overflows its collapsed height
- update a local boolean such as `isOverflowing`
- re-check when the source text changes

The detection should be resilient to:

- different source lengths
- viewport width changes
- history restore rendering a different text payload

Using rendered overflow instead of string heuristics ensures the control appears only when the UI actually needs it.

### 7.6 Expansion state lifecycle

Expansion state should be local to `TextTranslationResult`.

Default behavior:

- new live translation result arrives -> collapsed
- restored history result arrives -> collapsed

The user may then expand or collapse the source preview for the currently shown result. State should not persist across different results.

### 7.7 Accessibility

The trigger should use button semantics, even if visually styled as an inline text action.

Requirements:

- keyboard focusable
- operable by Enter and Space
- expose `aria-expanded`
- retain visible focus styling

The source preview itself remains plain readable text. No special ARIA region is required for the preview content in this pass.

### 7.8 Visual direction

The source preview should read as supporting context, not as a competing headline.

Recommended visual treatment:

- muted foreground color
- smaller text than the translated text
- slightly relaxed line height for paragraph readability
- a fade overlay that is subtle rather than dramatic
- inline trigger styled like a low-emphasis text affordance, not a pill button

The translated text should remain the strongest typographic element in the card.

## 8. Implementation Boundaries

This pass should remain narrow:

- update `src/modules/translations/screens/translations-screen.tsx`
- update `src/modules/translations/ui/text-translation-result.tsx`
- add or update tests covering the new behavior

Do not:

- refactor the query workspace result area
- move translation result state into a store
- redesign history layout
- revise the translation response model

## 9. Testing Strategy

### 9.1 Translation screen integration coverage

Update translation-page tests to verify:

- the page still renders translation results correctly
- the standalone translation-page `结果` card is no longer rendered
- the translated text remains visible after submit and after history restore

### 9.2 `TextTranslationResult` interaction coverage

Add focused UI tests to verify:

- long source text shows `查看完整原文`
- clicking the trigger expands the full source text and swaps the label to `收起原文`
- clicking again collapses the preview
- short source text shows no trigger

Where layout measurement is involved, tests may stub element sizing as needed so overflow behavior can be asserted deterministically.

## 10. Acceptance Criteria

- The translation page no longer renders a standalone `结果` card above `TextTranslationResult`.
- The `译文` card contains a source preview labeled `原文`.
- Long source text is collapsed to 3 lines by default with a subtle bottom fade.
- `查看完整原文` appears only when the source preview truly overflows.
- Expanding happens inline within the same card and changes the trigger to `收起原文`.
- New results and restored history results both start in the collapsed state.
- Short source text remains fully visible and does not show a redundant trigger.
- The query workspace result area remains unchanged in this pass.
