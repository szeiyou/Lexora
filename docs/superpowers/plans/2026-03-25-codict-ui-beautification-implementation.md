# CoDict UI Beautification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate CoDict to a macOS Settings-inspired dark UI using Tailwind v4 and shadcn/ui without changing existing product behavior.

**Architecture:** Implement the redesign in five safe phases. First establish the shared design system and dark tokens, then migrate the app shell and query workflow, then settings, then history and wordbooks, and finally add restrained motion plus legacy CSS cleanup. Preserve the current route structure, query/store architecture, and backend integrations while swapping the UI layer underneath them.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Radix UI primitives, React Hook Form, Zod, TanStack Query, Zustand, Vitest, Testing Library, MSW

---

## Implementation Notes Locked Up Front

- Execute this plan in a dedicated worktree before touching files.
- Keep dark theme only for this iteration. Do not introduce a full light/dark toggle.
- Prefer thin local wrappers in `src/shared/ui/` over importing shadcn components directly everywhere. This keeps app-level control and avoids re-deciding wrapper policy file by file.
- Preserve current text labels and interaction semantics unless a test must be updated for deliberate structure changes.
- Use TDD for each phase: add or update tests first, verify failures where practical, then implement the minimum change.
- Keep motion subtle and respect reduced-motion preferences in the final motion phase.

## Planned File Map

### Tooling and Styling Foundation

- Modify: `package.json` — add shadcn-compatible UI dependencies and animation helper packages
- Modify: `src/shared/styles/globals.css` — import Tailwind and define base dark-theme application rules
- Modify: `src/shared/styles/tokens.css` — replace current light tokens with semantic dark tokens
- Modify: `src/shared/lib/cn.ts` — upgrade class merging to use `clsx` + `tailwind-merge`
- Create: `components.json` — shadcn/ui configuration for the repo

### Shared UI System

- Modify: `src/shared/ui/button.tsx` — replace handcrafted button with shadcn-style variant-driven button
- Modify: `src/shared/ui/input.tsx` — replace handcrafted input with dark-theme shadcn-style input
- Modify: `src/shared/ui/panel.tsx` — either narrow its role or rebase it on card semantics
- Modify: `src/shared/ui/status-view.tsx` — split toward semantic status/empty-state styling
- Create: `src/shared/ui/select.tsx` — shared Select wrapper built on Radix/shadcn pattern
- Create: `src/shared/ui/card.tsx` — card primitives for grouped surfaces
- Create: `src/shared/ui/dialog.tsx` — shared dialog primitives
- Create: `src/shared/ui/alert-dialog.tsx` — destructive confirmation dialog primitives
- Create: `src/shared/ui/alert.tsx` — inline feedback/status surface
- Create: `src/shared/ui/accordion.tsx` — collapsible disclosure primitive
- Create: `src/shared/ui/separator.tsx` — section separator primitive
- Create: `src/shared/ui/scroll-area.tsx` — scrollable collection wrapper
- Create: `src/shared/ui/form.tsx` — RHF-friendly form wrappers if needed by settings migration

### App Shell + Query Workflow

- Modify: `src/app/layouts/app-shell.tsx` — macOS Settings-style sidebar and content frame
- Modify: `src/modules/query/ui/query-toolbar.tsx` — grouped query card with Select and refined action hierarchy
- Modify: `src/modules/query/screens/workspace-screen.tsx` — semantic status surfaces and structured content layout
- Modify: `src/modules/recent-searches/ui/recent-searches-panel.tsx` — subordinate card/list styling
- Modify: `src/modules/query/ui/result-switch.tsx` — result container composition if needed
- Modify: `src/modules/query/ui/english-word-card.tsx` — card styling and action layout
- Modify: `src/modules/query/ui/zh-to-en-term-card.tsx` — card styling and action layout
- Modify: `src/modules/query/ui/sentence-translation-card.tsx` — card styling and action layout
- Modify: `src/modules/audio/ui/audio-button.tsx` — shared button/icon styling compatibility

### Settings

- Modify: `src/modules/settings/ui/settings-form.tsx` — shadcn form controls, select, diagnostics accordion, inline alerts
- Modify: `src/modules/settings/screens/settings-screen.tsx` — grouped settings page layout
- Modify: `src/modules/desktop-shell/ui/close-behavior-dialog.tsx` — align dialog styling with new shared dialog primitives

### History + Wordbooks

- Modify: `src/modules/history/screens/history-screen.tsx` — page header, alert/status surfaces, layout cleanup
- Modify: `src/modules/history/ui/history-list.tsx` — list row styling, pagination controls, grouped collection surface
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.tsx` — replace inline styles with systemized layout and collection styling
- Modify: `src/modules/wordbooks/ui/wordbook-detail-pane.tsx` — grouped detail card styling
- Modify: `src/modules/wordbooks/ui/wordbook-editor-dialog.tsx` — shared dialog primitives
- Modify: `src/modules/wordbooks/ui/add-to-wordbook-dialog.tsx` — shared dialog + select styling

### Tests

- Modify: `src/modules/query/ui/workspace-screen.test.tsx`
- Modify: `src/modules/settings/ui/settings-screen.test.tsx`
- Modify: `src/modules/history/ui/history-screen.test.tsx`
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
- Modify: `src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`
- Modify: `src/app/router.test.tsx` — shell/navigation assertions if visual semantics affect structure
- Optionally Create: `src/shared/ui/button.test.tsx` if wrapper behavior becomes non-trivial

## Task 1: Build the dark-theme UI foundation

**Files:**
- Modify: `package.json`
- Modify: `src/shared/styles/globals.css`
- Modify: `src/shared/styles/tokens.css`
- Modify: `src/shared/lib/cn.ts`
- Create: `components.json`
- Create: `src/shared/ui/select.tsx`
- Create: `src/shared/ui/card.tsx`
- Create: `src/shared/ui/dialog.tsx`
- Create: `src/shared/ui/alert-dialog.tsx`
- Create: `src/shared/ui/alert.tsx`
- Create: `src/shared/ui/accordion.tsx`
- Create: `src/shared/ui/separator.tsx`
- Create: `src/shared/ui/scroll-area.tsx`
- Create: `src/shared/ui/form.tsx`
- Modify: `src/shared/ui/button.tsx`
- Modify: `src/shared/ui/input.tsx`
- Modify: `src/shared/ui/panel.tsx`
- Modify: `src/shared/ui/status-view.tsx`
- Test: `npm test -- --runInBand`

- [ ] **Step 1: Add/update a failing shared-UI smoke assertion if wrapper behavior changes**

Use an existing UI-facing test or add a minimal wrapper test if needed. For example:

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@/shared/ui/button";

it("renders shared button with accessible text", () => {
  render(<Button>保存设置</Button>);
  expect(screen.getByRole("button", { name: "保存设置" })).toBeInTheDocument();
});
```

If no dedicated wrapper test is added, use one of the downstream screen tests in Step 2 instead of inventing placeholder coverage.

- [ ] **Step 2: Run the targeted test before foundation changes**

Run one of these commands based on the chosen test shape:
- `npm test -- src/shared/ui/button.test.tsx`
- `npm test -- src/modules/query/ui/workspace-screen.test.tsx src/modules/settings/ui/settings-screen.test.tsx`

Expected: FAIL if a new wrapper test was added before implementation, or PASS/unchanged if you are using downstream screen tests as the safety net before rebuilding shared primitives.

- [ ] **Step 3: Add the UI dependencies and shadcn config**

Add only the packages needed for the planned primitives. Expected additions include:

```json
{
  "dependencies": {
    "@radix-ui/react-accordion": "...",
    "@radix-ui/react-alert-dialog": "...",
    "@radix-ui/react-dialog": "...",
    "@radix-ui/react-label": "...",
    "@radix-ui/react-scroll-area": "...",
    "@radix-ui/react-select": "...",
    "@radix-ui/react-slot": "...",
    "class-variance-authority": "...",
    "clsx": "...",
    "lucide-react": "...",
    "tailwind-merge": "..."
  },
  "devDependencies": {
    "tailwindcss-animate": "..."
  }
}
```

Create `components.json` with aliases that point at `src/shared/ui` and `src/shared/lib`.

- [ ] **Step 4: Replace the current light tokens with the full semantic dark token set**

Rework `src/shared/styles/tokens.css` so it explicitly includes every foundation token required by the spec:
- `background`
- `foreground`
- `card`
- `card-foreground`
- `surface` or an equivalent second-surface token
- `popover`
- `sidebar`
- `muted`
- `muted-foreground`
- `border`
- `input`
- `ring`
- `accent`
- `accent-foreground`
- `destructive`
- `destructive-foreground`
- large/container radius token
- standard card/field radius token
- small control radius token
- base shadow token
- elevated overlay shadow token

Use values similar to:

```css
:root {
  --background: 224 16% 10%;
  --foreground: 210 20% 96%;
  --card: 224 15% 13%;
  --card-foreground: 210 20% 96%;
  --surface: 224 14% 15%;
  --popover: 224 15% 12%;
  --sidebar: 224 14% 12%;
  --muted: 224 12% 18%;
  --muted-foreground: 215 12% 68%;
  --border: 220 10% 24%;
  --input: 220 10% 22%;
  --accent: 210 70% 58%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 70% 55%;
  --destructive-foreground: 0 0% 98%;
  --ring: 210 70% 58%;
  --radius-lg: 1.25rem;
  --radius-md: 1rem;
  --radius-sm: 0.75rem;
  --shadow-base: 0 10px 30px rgba(0, 0, 0, 0.18);
  --shadow-elevated: 0 18px 48px rgba(0, 0, 0, 0.28);
}
```

- [ ] **Step 5: Update global/base styles and class merging**

In `src/shared/styles/globals.css`, establish:
- Tailwind imports
- dark application background
- body font smoothing
- selection/focus defaults
- reduced-motion-safe defaults only where appropriate

In `src/shared/lib/cn.ts`, change to:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Rebuild shared primitives around the new system**

Implement the minimum wrappers needed now:
- `Button` with variants: default, secondary, outline, ghost, destructive
- `Input` with dark-field styling and focus ring
- `Select` with trigger/content/item wrappers
- `Card`, `Alert`, `Accordion`, `Dialog`, `AlertDialog`, `Separator`, `ScrollArea`
- `StatusView` should support empty/error/loading semantics without changing screen behavior yet

Keep wrappers thin. Do not overbuild future-only variants.

- [ ] **Step 7: Run the shared/UI test suite**

Run: `npm test -- src/modules/query/ui/workspace-screen.test.tsx src/modules/settings/ui/settings-screen.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
Expected: PASS or only fail where later tasks intentionally depend on yet-unmigrated screen structure.

- [ ] **Step 8: Commit the foundation phase**

```bash
git add package.json components.json src/shared/styles/globals.css src/shared/styles/tokens.css src/shared/lib/cn.ts src/shared/ui
git commit -m "feat: add dark theme UI foundation"
```

## Task 2: Migrate AppShell and query workflow

**Files:**
- Modify: `src/app/layouts/app-shell.tsx`
- Modify: `src/app/router.test.tsx`
- Modify: `src/modules/query/ui/query-toolbar.tsx`
- Modify: `src/modules/query/screens/workspace-screen.tsx`
- Modify: `src/modules/recent-searches/ui/recent-searches-panel.tsx`
- Modify: `src/modules/query/ui/result-switch.tsx`
- Modify: `src/modules/query/ui/english-word-card.tsx`
- Modify: `src/modules/query/ui/zh-to-en-term-card.tsx`
- Modify: `src/modules/query/ui/sentence-translation-card.tsx`
- Modify: `src/modules/audio/ui/audio-button.tsx`
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`
- Test: `src/modules/query/ui/workspace-screen.test.tsx`
- Test: `src/app/router.test.tsx`

- [ ] **Step 1: Update query workflow tests to assert the new semantic UI structure**

Add/adjust assertions for:
- query controls still discoverable by label
- refresh button still works
- shell navigation still exposes route links
- result cards still expose the same content

For example, preserve tests like:

```tsx
expect(screen.getByLabelText("搜索内容")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "查询" })).toBeEnabled();
```

- [ ] **Step 2: Run the focused tests before implementation**

Run: `npm test -- src/modules/query/ui/workspace-screen.test.tsx src/app/router.test.tsx`
Expected: FAIL only where the new planned structure or component wrappers are not implemented yet.

- [ ] **Step 3: Rebuild the shell as a macOS Settings-style sidebar layout**

In `src/app/layouts/app-shell.tsx`:
- add lucide icons for each nav item
- give the sidebar its own surface
- use active rounded pills
- standardize content padding and constrained width

Sketch:

```tsx
const navItems = [
  { to: "/", label: "查询工作台", icon: Search, end: true },
  { to: "/history", label: "历史记录", icon: History },
  { to: "/wordbooks", label: "单词本", icon: BookMarked },
  { to: "/settings", label: "设置", icon: Settings }
];
```

- [ ] **Step 4: Rebuild the query toolbar with shared card/select/button primitives**

In `src/modules/query/ui/query-toolbar.tsx`:
- keep the same query/refresh behavior
- replace native `select` with shared `Select`
- group query input + type control + actions inside a refined card layout
- make “查询” the primary action and “强制刷新” the secondary action

- [ ] **Step 5: Restyle the workspace screen and result cards without changing data flow**

In `src/modules/query/screens/workspace-screen.tsx` and result card files:
- use `Card`, `Alert`, `StatusView`, `Separator`, and spacing utilities
- convert loose text statuses into semantic feedback surfaces
- keep `ResultSwitch` mapping unchanged
- keep recent searches subordinate to the main query panel
- ensure restored history results render through the same path

- [ ] **Step 6: Verify the query workflow tests**

Run: `npm test -- src/modules/query/ui/workspace-screen.test.tsx src/app/router.test.tsx`
Expected: PASS

- [ ] **Step 7: Run the full unit suite to catch style-driven regressions**

Run: `npm test`
Expected: PASS

- [ ] **Step 8: Commit the shell/query phase**

```bash
git add src/app/layouts/app-shell.tsx src/app/router.test.tsx src/modules/query src/modules/recent-searches src/modules/audio/ui/audio-button.tsx
git commit -m "feat: restyle app shell and query workspace"
```

## Task 3: Standardize the settings experience

**Files:**
- Modify: `src/modules/settings/ui/settings-form.tsx`
- Modify: `src/modules/settings/screens/settings-screen.tsx`
- Modify: `src/modules/desktop-shell/ui/close-behavior-dialog.tsx`
- Modify: `src/modules/settings/ui/settings-screen.test.tsx`
- Test: `src/modules/settings/ui/settings-screen.test.tsx`

- [ ] **Step 1: Update the settings tests for form-component migration**

Preserve assertions for:
- labels still accessible
- “测试连接” still works
- validation alert still renders
- diagnostics content still exposed when a test fails

If `details` changes to an accordion/collapsible, update the test to assert the diagnostics text by accessible content rather than native element type.

- [ ] **Step 2: Run the settings test before implementation**

Run: `npm test -- src/modules/settings/ui/settings-screen.test.tsx`
Expected: FAIL where native `select/details` assumptions no longer hold.

- [ ] **Step 3: Rebuild `settings-form` with shared form/select/alert/accordion primitives**

Implementation requirements:
- keep React Hook Form and Zod validation flow
- replace the close-behavior native `select` with shared `Select`
- replace the diagnostics `details` with `Accordion` or `Collapsible`
- group fields into card sections
- use inline `Alert`/form messaging for validation and connection feedback

Keep visible text like “服务地址”, “用户名”, “密码”, “请求超时 (ms)”, “测试连接” unchanged unless a testable UX reason requires otherwise.

- [ ] **Step 4: Align `settings-screen` and close-behavior dialog with the new surface language**

- apply card-based page grouping
- reuse shared dialog primitives in `close-behavior-dialog.tsx`
- avoid introducing extra settings not called for in the spec

- [ ] **Step 5: Verify the settings tests**

Run: `npm test -- src/modules/settings/ui/settings-screen.test.tsx`
Expected: PASS

- [ ] **Step 6: Run full unit suite after settings migration**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit the settings phase**

```bash
git add src/modules/settings src/modules/desktop-shell/ui/close-behavior-dialog.tsx
git commit -m "feat: standardize settings UI patterns"
```

## Task 4: Migrate history and wordbooks management screens

**Files:**
- Modify: `src/modules/history/screens/history-screen.tsx`
- Modify: `src/modules/history/ui/history-list.tsx`
- Modify: `src/modules/history/ui/history-screen.test.tsx`
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.tsx`
- Modify: `src/modules/wordbooks/ui/wordbook-detail-pane.tsx`
- Modify: `src/modules/wordbooks/ui/wordbook-editor-dialog.tsx`
- Modify: `src/modules/wordbooks/ui/add-to-wordbook-dialog.tsx`
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
- Modify: `src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`
- Test: `src/modules/history/ui/history-screen.test.tsx`
- Test: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
- Test: `src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`

- [ ] **Step 1: Update history/wordbook tests to match the new component structure**

Preserve behavior assertions for:
- opening history restores results
- recoverable history errors still surface as alerts
- creating a wordbook still opens its detail pane
- add-to-wordbook still allows selecting a target and confirming

- [ ] **Step 2: Run the focused tests before implementation**

Run: `npm test -- src/modules/history/ui/history-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`
Expected: FAIL only where current structure conflicts with the target management UI.

- [ ] **Step 3: Rebuild the history page and list surfaces**

Implementation requirements:
- use page header + content card composition
- use inline alerts for recoverable errors
- replace plain pagination controls/list rows with styled grouped collection controls
- keep route restore behavior unchanged

- [ ] **Step 4: Rebuild the wordbooks management UI with shared layout/dialog primitives**

Implementation requirements:
- remove inline `style={{ ... }}` layout blocks from `wordbooks-screen.tsx`
- make the left collection a navigable list/rail rather than a stack of generic buttons
- rebase create/rename/delete flows on `Dialog` / `AlertDialog`
- keep API mutations and optimistic updates intact

- [ ] **Step 5: Verify the focused management tests**

Run: `npm test -- src/modules/history/ui/history-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`
Expected: PASS

- [ ] **Step 6: Run full unit suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit the management-screen phase**

```bash
git add src/modules/history src/modules/wordbooks
git commit -m "feat: restyle history and wordbook screens"
```

## Task 5: Add restrained motion and remove legacy handcrafted styling

**Files:**
- Modify: `src/shared/styles/globals.css`
- Modify: `src/shared/styles/tokens.css`
- Modify: `src/shared/ui/button.tsx`
- Modify: `src/shared/ui/input.tsx`
- Modify: `src/shared/ui/status-view.tsx`
- Modify: any migrated screen still depending on obsolete `ui-*` classes
- Test: `npm test`

- [ ] **Step 1: Add reduced-motion-safe test coverage only if behavior changes need it**

If motion classes or visibility timing changes affect tests, update tests to assert stable semantic outcomes rather than animation internals.

- [ ] **Step 2: Add subtle motion to the approved surfaces**

Apply only the motion from the spec:
- button hover/pressed transitions
- sidebar active-state transitions
- dialog/accordion open-close motion
- small query-result refresh transitions

Add reduced-motion handling similar to:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Remove obsolete handcrafted CSS and dead utility classes**

Delete or stop referencing old classes such as:
- `.ui-button`
- `.ui-input`
- `.ui-panel`
- old screen/layout classes that no longer drive the migrated UI

Do not leave compatibility shims unless a live file still needs them.

- [ ] **Step 4: Run the full verification loop**

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: Vite/TypeScript build succeeds

Run the existing Playwright smoke suite and require it to cover the key redesigned screens. At minimum, the smoke verification must exercise:
- app shell navigation rendering
- query workspace rendering
- settings screen rendering
- one management screen (`/history` or `/wordbooks`)

Run: `npm run test:e2e`
Expected: PASS for the smoke suite covering the redesigned dark-theme screens

- [ ] **Step 5: Commit the polish/cleanup phase**

```bash
git add src/shared/styles src/shared/ui src/app src/modules
git commit -m "feat: polish motion and remove legacy UI styles"
```

## Final Verification Checklist

- [ ] Query input, refresh, and result rendering still work
- [ ] History restore still navigates back to the workspace with restored content
- [ ] Settings validation and connection diagnostics still work
- [ ] Wordbook create/rename/add flows still work
- [ ] No native `select` remains in migrated screens
- [ ] No native `details` remains in settings diagnostics
- [ ] App visually reads as macOS Settings-inspired dark UI, not generic Tailwind admin
- [ ] Reduced-motion behavior is respected
- [ ] `npm test` passes
- [ ] `npm run build` passes

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-25-codict-ui-beautification-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**