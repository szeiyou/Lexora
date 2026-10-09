# Responsive Sidebar Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the desktop app in a stable left-sidebar layout on lower-resolution laptops by introducing a progressive compact sidebar and later page-level collapse points.

**Architecture:** The implementation should keep the existing route structure and page composition intact while moving the shell from a hard `lg` collapse to a multi-band sidebar width strategy. Screen-level work should stay local: query toolbar controls get a later wrap point, while translation and wordbook split layouts move to narrower side columns and later single-column fallbacks. All behavior changes should be covered first by targeted layout/accessibility tests, then by minimal class-only implementation updates.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS v4, Vitest, Testing Library, MSW

---

## File Structure

### Files to create
- `src/app/layouts/app-shell.test.tsx` — focused shell-layout and navigation-accessibility regression test for the new compact sidebar classes

### Files to modify
- `src/shared/styles/tokens.css` — responsive shell width tokens for rail, compact, and full sidebar states
- `src/app/layouts/app-shell.tsx` — shell breakpoint strategy, sidebar width classes, brand collapse behavior, and icon-rail navigation labeling
- `src/modules/query/ui/query-toolbar.tsx` — later control-row collapse point, tighter select width, smaller action-button minimum widths
- `src/modules/query/ui/workspace-screen.test.tsx` — query-toolbar responsive layout assertions
- `src/modules/translations/screens/translations-screen.tsx` — later two-column breakpoint and narrower recent-history side pane
- `src/modules/translations/ui/translations-screen.test.tsx` — translation layout class assertions aligned to the new split behavior
- `src/modules/wordbooks/ui/wordbooks-screen.tsx` — flexible two-column wordbook layout and sticky behavior aligned to the new breakpoint
- `src/modules/wordbooks/ui/wordbooks-screen.test.tsx` — wordbook layout assertions for the narrowed list column and later single-column fallback

### Files to verify but not modify
- `docs/superpowers/specs/2026-03-30-responsive-sidebar-layout-design.md` — approved design source of truth
- `src/app/router.test.tsx` — route smoke test that should continue to pass after shell changes

## Task 1: Lock down the shell layout before changing the sidebar

**Files:**
- Create: `src/app/layouts/app-shell.test.tsx`
- Modify: `src/shared/styles/tokens.css`
- Modify: `src/app/layouts/app-shell.tsx`
- Verify: `src/app/router.test.tsx`

- [ ] **Step 1: Write the failing shell-layout regression test**

Create `src/app/layouts/app-shell.test.tsx` with a focused route render that asserts the new responsive shell contract:

```tsx
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/layouts/app-shell";

it("keeps desktop navigation in a responsive left rail with preserved accessible names", () => {
  render(
    <MemoryRouter initialEntries={["/translations"]}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<div>lookup</div>} />
          <Route path="translations" element={<div>translation</div>} />
          <Route path="history" element={<div>history</div>} />
          <Route path="wordbooks" element={<div>wordbooks</div>} />
          <Route path="settings" element={<div>settings</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  const navigation = screen.getByRole("navigation", { name: "主导航" });
  const sidebar = navigation.closest("aside");
  const shell = sidebar?.parentElement;
  const translationLink = within(navigation).getByRole("link", { name: "翻译" });

  expect(shell?.className).toContain("md:flex-row");
  expect(shell?.className).not.toContain("lg:flex-row");
  expect(sidebar?.className).toContain("md:w-[var(--sidebar-rail-width)]");
  expect(sidebar?.className).toContain("min-[960px]:w-[var(--sidebar-compact-width)]");
  expect(sidebar?.className).toContain("min-[1280px]:w-[var(--sidebar-full-width)]");
  expect(translationLink).toHaveAttribute("title", "翻译");
  expect(translationLink).toHaveAttribute("aria-current", "page");
  expect(within(translationLink).getByText("翻译").className).toContain("md:sr-only");
  expect(within(navigation).getByRole("link", { name: "设置" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the new shell test to verify it fails**

Run: `npm run test -- src/app/layouts/app-shell.test.tsx`
Expected: FAIL because `AppShell` still uses `lg:flex-row`, the sidebar still jumps directly to `lg:w-[272px]`, and the links do not yet expose the new compact-sidebar class contract.

- [ ] **Step 3: Implement the shell width tokens and compact sidebar layout**

In `src/shared/styles/tokens.css`, add dedicated width tokens so the shell does not scatter magic numbers:

```css
:root {
  --sidebar-rail-width: 5rem;
  --sidebar-compact-width: 12.5rem;
  --sidebar-full-width: 15rem;
  --app-shell-max-width: 88rem;
}
```

In `src/app/layouts/app-shell.tsx`, move the shell to a persistent desktop split from `md` upward and make the sidebar progressively wider:

```tsx
<div className="mx-auto flex min-h-screen w-full max-w-[var(--app-shell-max-width)] flex-col gap-5 px-4 py-4 md:flex-row md:items-start md:px-5 md:py-5 min-[1280px]:gap-6 min-[1280px]:px-8 min-[1280px]:py-8">
```

```tsx
<Panel
  as="aside"
  className="w-full shrink-0 overflow-hidden border-white/5 bg-[linear-gradient(180deg,hsl(var(--sidebar))/0.96,hsla(224,14%,11%,0.9))] md:sticky md:top-5 md:w-[var(--sidebar-rail-width)] min-[960px]:w-[var(--sidebar-compact-width)] min-[1280px]:top-8 min-[1280px]:w-[var(--sidebar-full-width)]"
>
```

```tsx
<div className="flex items-center gap-3 border-b border-white/5 px-5 py-5 md:justify-center md:px-3 min-[960px]:justify-start min-[960px]:px-5">
  <div className="flex size-10 items-center justify-center rounded-2xl ...">L</div>
  <div className="min-w-0 md:sr-only min-[960px]:not-sr-only">
    <p className="truncate text-base font-semibold tracking-[0.18em] text-[hsl(var(--foreground))]">Lexora</p>
  </div>
</div>
```

For each `NavLink`, keep the accessible route name while visually collapsing labels in rail mode:

```tsx
<NavLink
  ...
  title={item.label}
  className={({ isActive }) =>
    cn(
      "group flex items-center gap-3 rounded-[calc(var(--radius-md)+2px)] px-3 py-3 text-sm font-medium ... md:justify-center md:px-2 min-[960px]:justify-start min-[960px]:px-3",
      isActive && "bg-[linear-gradient(135deg,hsl(var(--accent))/0.24,hsl(var(--accent))/0.1)] ..."
    )
  }
>
```

```tsx
<span className="md:sr-only min-[960px]:not-sr-only">{item.label}</span>
```

Keep `main` as `min-w-0 flex-1` and widen the inner workspace container if the old `max-w-5xl` still leaves too much unused width after the shell changes.

- [ ] **Step 4: Run the shell tests again and verify route smoke still passes**

Run: `npm run test -- src/app/layouts/app-shell.test.tsx src/app/router.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the shell responsiveness update**

```bash
git add src/shared/styles/tokens.css src/app/layouts/app-shell.tsx src/app/layouts/app-shell.test.tsx
git commit -m "feat: add responsive compact sidebar shell"
```

## Task 2: Keep the query controls horizontal longer

**Files:**
- Modify: `src/modules/query/ui/query-toolbar.tsx`
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`

- [ ] **Step 1: Add failing responsive assertions to the workspace test**

Extend `src/modules/query/ui/workspace-screen.test.tsx` with an assertion that the query toolbar now waits longer before stacking controls:

```tsx
it("keeps query controls in a wider horizontal layout band", async () => {
  const queryClient = createTestQueryClient();

  renderWorkspace(queryClient);

  await screen.findByRole("heading", { name: "查词" });

  const typeSelect = screen.getByLabelText("内容类型");
  const queryButton = screen.getByRole("button", { name: "查看结果" });
  const refreshButton = screen.getByRole("button", { name: "重新获取结果" });
  const buttonGroup = queryButton.parentElement;
  const controlsRow = buttonGroup?.parentElement;

  expect(typeSelect.className).toContain("min-[900px]:max-w-[220px]");
  expect(controlsRow?.className).toContain("min-[900px]:grid-cols-[minmax(0,1fr)_auto]");
  expect(buttonGroup?.className).toContain("min-[900px]:justify-end");
  expect(queryButton.className).toContain("min-w-[108px]");
  expect(refreshButton.className).toContain("min-w-[108px]");
});
```

- [ ] **Step 2: Run the workspace test file to verify it fails**

Run: `npm run test -- src/modules/query/ui/workspace-screen.test.tsx`
Expected: FAIL because `QueryToolbar` still uses the earlier `lg:` collapse point and the buttons still require `min-w-[120px]`.

- [ ] **Step 3: Update the query toolbar layout classes**

In `src/modules/query/ui/query-toolbar.tsx`, keep the input on its own row and delay the control-row wrap point:

```tsx
<div className="grid gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_auto] min-[900px]:items-end">
```

Tighten the select width so it does not consume unnecessary space:

```tsx
<SelectTrigger id="workspace-type-select" aria-label="内容类型" className="w-full min-[900px]:max-w-[220px]">
```

Keep the action buttons horizontal for longer and slightly reduce their minimum widths:

```tsx
<div className="flex flex-col gap-3 sm:flex-row min-[900px]:justify-end">
```

```tsx
<Button type="submit" ... className="min-w-[108px]">
```

```tsx
<Button type="button" variant="secondary" ... className="min-w-[108px]">
```

Do not change any query behavior, labels, or result rendering in this task.

- [ ] **Step 4: Run the workspace test file again**

Run: `npm run test -- src/modules/query/ui/workspace-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the query-toolbar layout tuning**

```bash
git add src/modules/query/ui/query-toolbar.tsx src/modules/query/ui/workspace-screen.test.tsx
git commit -m "refactor: delay query toolbar stacking"
```

## Task 3: Retune the split layouts for translation and wordbooks

**Files:**
- Modify: `src/modules/translations/screens/translations-screen.tsx`
- Modify: `src/modules/translations/ui/translations-screen.test.tsx`
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.tsx`
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`

- [ ] **Step 1: Update the layout assertions in the translation and wordbook tests**

In `src/modules/translations/ui/translations-screen.test.tsx`, replace the old shell-coupled grid assertion with the new later two-column breakpoint:

```tsx
const layout = screen.getByTestId("translations-layout");
expect(layout.className).toContain("min-[1120px]:grid-cols-[minmax(0,1.7fr)_minmax(15rem,0.85fr)]");
expect(layout.className).not.toContain("lg:grid-cols-[minmax(0,1.75fr)_minmax(18rem,0.95fr)]");
```

In `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`, add a layout assertion after the screen renders:

```tsx
const layout = screen.getByTestId("wordbooks-layout");
expect(layout.className).toContain("min-[1100px]:grid-cols-[minmax(13.75rem,15.5rem)_minmax(0,1fr)]");
expect(layout.className).not.toContain("xl:grid-cols-[280px_minmax(0,1fr)]");
```

- [ ] **Step 2: Run the translation and wordbook test files to verify they fail**

Run: `npm run test -- src/modules/translations/ui/translations-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
Expected: FAIL because the current implementation still uses the older `lg:` / `xl:` split classes and does not yet expose the new test IDs.

- [ ] **Step 3: Update the page grid breakpoints and list-column widths**

In `src/modules/translations/screens/translations-screen.tsx`, add a stable test target and move the split layout to a later breakpoint with a narrower side column:

```tsx
<div
  data-testid="translations-layout"
  className="grid gap-5 min-[1120px]:grid-cols-[minmax(0,1.7fr)_minmax(15rem,0.85fr)]"
>
```

In `src/modules/wordbooks/ui/wordbooks-screen.tsx`, add a stable test target and shift the list/detail split to a more flexible width band:

```tsx
<div
  data-testid="wordbooks-layout"
  className="grid gap-6 min-[1100px]:grid-cols-[minmax(13.75rem,15.5rem)_minmax(0,1fr)]"
>
```

Update the sticky behavior to match the new breakpoint:

```tsx
<Card className="shadow-none min-[1100px]:sticky min-[1100px]:top-0 min-[1100px]:self-start">
```

Do not rewrite the contents of the translation recent-history card or the wordbook detail pane.

- [ ] **Step 4: Run the translation and wordbook test files again**

Run: `npm run test -- src/modules/translations/ui/translations-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the split-layout breakpoint tuning**

```bash
git add src/modules/translations/screens/translations-screen.tsx src/modules/translations/ui/translations-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx
git commit -m "refactor: retune narrow desktop split layouts"
```

## Task 4: Verify the full responsive layout contract

**Files:**
- Verify only

- [ ] **Step 1: Run the targeted automated verification suite**

Run:

```bash
npm run test -- src/app/layouts/app-shell.test.tsx src/app/router.test.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/translations/ui/translations-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx
```

Expected:

- all five targeted test files pass
- the shell test confirms `md:flex-row` plus the new sidebar width classes
- the query test confirms the later control-row collapse point
- the translation and wordbook tests confirm later split-layout breakpoints

- [ ] **Step 2: Run a manual resize check in the dev app**

Run: `npm run dev`

Manually verify these viewport widths in the browser or Tauri dev window:

- around `1366px`: full text sidebar, content remains balanced
- around `1024px`: compact text sidebar, query controls still look intentional
- around `800px`: icon rail remains on the left instead of turning into a top layout

Expected:

- the shell never drops into a stacked top-and-bottom layout in these desktop widths
- the query page keeps the search input and controls visually grouped
- the translation page keeps its recent-history side pane longer than before
- the wordbooks page keeps list/detail split longer than before
- in icon-rail mode, Tab and Shift+Tab still move through the nav cleanly and the focus-visible ring remains obvious
- the history and settings routes still render without overflow or clipped primary controls after navigating to them
- no obvious horizontal overflow appears

- [ ] **Step 3: Review the final diff against the approved spec**

Check the implementation against `docs/superpowers/specs/2026-03-30-responsive-sidebar-layout-design.md`:

- sidebar progresses through rail, compact, and full-width states
- route names remain accessible in icon-only mode
- the query toolbar wraps later without changing behavior
- translation and wordbooks keep two-column layouts longer
- no route or copy changes slipped into the responsive work

- [ ] **Step 4: Commit any remaining verification-only fixes**

If the earlier task commits were skipped, commit the finished responsive layout work with:

```bash
git add src/shared/styles/tokens.css src/app/layouts/app-shell.tsx src/app/layouts/app-shell.test.tsx src/modules/query/ui/query-toolbar.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/translations/screens/translations-screen.tsx src/modules/translations/ui/translations-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx
git commit -m "feat: stabilize desktop layout on narrow screens"
```
