# Clickable Cursor Pointer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make buttons, navigation links, and clickable list items show the pointer cursor on hover without changing behavior for inputs or other non-target controls.

**Architecture:** Reuse the existing styling boundaries instead of adding a new global cursor rule. Put pointer styling in the shared `Button` base classes, add it to the main navigation link classes, and patch the small number of local clickable list buttons that do not inherit from `Button`.

**Tech Stack:** React, TypeScript, Tailwind, Vitest, Testing Library

---

## Planned File Map

- `src/shared/ui/button.tsx`: add pointer cursor styling to the shared button base classes and preserve a non-pointer disabled cursor.
- `src/shared/ui/button.test.tsx`: add regression coverage for enabled and disabled shared button cursor classes.
- `src/shared/ui/accordion.tsx`: add pointer cursor styling to the shared accordion trigger.
- `src/shared/ui/accordion.test.tsx`: add regression coverage for accordion trigger pointer styling.
- `src/app/router.test.tsx`: verify main navigation links expose pointer cursor styling.
- `src/app/layouts/app-shell.tsx`: add pointer cursor styling to main navigation links.
- `src/modules/query/ui/query-toolbar.tsx`: add pointer cursor styling to recent-search dropdown options.
- `src/modules/query/ui/workspace-screen.test.tsx`: verify recent-search dropdown options expose pointer cursor styling.
- `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`: verify the custom wordbook selector button exposes pointer cursor styling.
- `src/modules/wordbooks/ui/wordbooks-screen.tsx`: add pointer cursor styling to the custom wordbook selector button.

### Task 1: Lock Cursor Expectations with Failing Tests

**Files:**
- Create: `src/shared/ui/button.test.tsx`
- Create: `src/shared/ui/accordion.test.tsx`
- Modify: `src/app/router.test.tsx`
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`

- [ ] **Step 1: Write the failing shared button cursor test**

Render `Button` and assert the enabled button includes `cursor-pointer` while a disabled button includes `disabled:cursor-not-allowed`.

- [ ] **Step 2: Run the shared button test and verify it fails**

Run: `npm run test -- src/shared/ui/button.test.tsx`
Expected: FAIL because the shared button base classes do not yet include pointer styling.

- [ ] **Step 3: Write failing navigation and clickable-list tests**

Extend:

- `src/app/router.test.tsx` to assert the "查词" link has `cursor-pointer`
- `src/shared/ui/accordion.test.tsx` to assert accordion triggers have `cursor-pointer`
- `src/modules/query/ui/workspace-screen.test.tsx` to assert the recent-search option rows have `cursor-pointer`
- `src/modules/wordbooks/ui/wordbooks-screen.test.tsx` to assert the rendered wordbook selector button has `cursor-pointer`

- [ ] **Step 4: Run the focused UI tests and verify they fail**

Run: `npm run test -- src/shared/ui/button.test.tsx src/shared/ui/accordion.test.tsx src/app/router.test.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
Expected: FAIL because the relevant class names are not present yet.

### Task 2: Implement the Minimal Styling Changes

**Files:**
- Modify: `src/shared/ui/button.tsx`
- Modify: `src/shared/ui/accordion.tsx`
- Modify: `src/app/layouts/app-shell.tsx`
- Modify: `src/modules/query/ui/query-toolbar.tsx`
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.tsx`

- [ ] **Step 1: Update the shared button base classes**

Add `cursor-pointer` to enabled shared buttons and `disabled:cursor-not-allowed` to disabled shared buttons.

- [ ] **Step 2: Update the main navigation link classes**

Add `cursor-pointer` to the `NavLink` class list in `AppShell`.

- [ ] **Step 3: Update the shared accordion trigger**

Add `cursor-pointer` to the shared accordion trigger classes.

- [ ] **Step 4: Update custom clickable list items**

Add `cursor-pointer` to the recent-search dropdown option rows and the custom wordbook selector button class list.

- [ ] **Step 5: Re-run the focused tests and verify green**

Run: `npm run test -- src/shared/ui/button.test.tsx src/shared/ui/accordion.test.tsx src/app/router.test.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
Expected: PASS.

### Task 3: Run Broader Regression Coverage

**Files:**
- No further edits expected

- [ ] **Step 1: Run adjacent regression tests**

Run: `npm run test -- src/app/app.test.tsx src/modules/history/ui/history-list.test.tsx src/modules/audio/ui/audio-button.test.tsx`
Expected: PASS.

- [ ] **Step 2: Review the diff for accidental scope creep**

Check that only cursor-related styling and the new tests changed.
