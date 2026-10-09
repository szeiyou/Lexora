# Responsive Sidebar Layout Design

Date: 2026-03-30
Status: Approved in interactive brainstorming
Target Platform: Desktop app
Tech Stack Context: Tauri v2, React, TypeScript, Tailwind v4, shadcn/ui
Design Goal: Preserve the app's desktop two-column structure on lower-resolution laptops by replacing the current hard layout collapse with a responsive, compactable sidebar and later content breakpoints.

## 1. Overview

The current desktop shell collapses from a left-sidebar layout into a top-and-bottom stacked layout once the viewport drops below the `lg` breakpoint. This is the main reason the app only looks balanced when the window is kept unusually large on lower-resolution laptops. The fixed `272px` sidebar width makes the problem worse by consuming too much horizontal space before the shell collapses.

This design keeps the app in a desktop-style left-navigation layout across a wider range of window sizes. Instead of switching the whole shell to a vertical layout early, the sidebar will shrink progressively. The main content area and feature screens will then use their own, later breakpoints for local rearrangement.

The user explicitly prefers a compact-sidebar approach over a top navigation or drawer navigation approach.

## 2. Goals

### Primary Goals

- Keep the shell in a left-sidebar layout across typical lower-resolution laptop widths.
- Replace the current hard shell breakpoint with a progressive sidebar compression strategy.
- Reduce sidebar width pressure on the main workspace.
- Preserve the current overall information architecture and page structure.
- Make the query page, translation page, and wordbook page degrade more gracefully as width decreases.

### Non-Goals

- No navigation model rewrite.
- No mobile-first redesign.
- No broad visual redesign beyond what is required for responsive balance.
- No new backend or state-management behavior.
- No major content restructuring inside result cards.

## 3. Current State Summary

### Shell Behavior

Reference: `src/app/layouts/app-shell.tsx`

- The shell is `flex-col` by default and only becomes `flex-row` at `lg`.
- The sidebar is `w-full` until `lg`, then jumps to a fixed `272px` width.
- This means that any width below the `lg` threshold stops being a desktop sidebar layout at all.

### Downstream Page Behavior

References:

- `src/modules/query/ui/query-toolbar.tsx`
- `src/modules/translations/screens/translations-screen.tsx`
- `src/modules/wordbooks/ui/wordbooks-screen.tsx`

These screens already contain their own responsive grids, but they are currently forced to react inside an outer shell that gives up horizontal layout too early. The result is that the shell collapses before inner layouts have a chance to adapt gracefully.

## 4. Considered Approaches

### Option A: Narrower Fixed Sidebar

Reduce the current sidebar width but keep the same shell breakpoint behavior.

Pros:

- Small implementation scope.
- Minimal behavioral change.

Cons:

- Does not solve the main problem because the shell still collapses below `lg`.
- Only delays the issue slightly.

### Option B: Progressive Compact Sidebar

Keep the left-sidebar shell and let the sidebar shrink across multiple width bands, ending in an icon-only rail before any full shell collapse.

Pros:

- Best match for desktop expectations.
- Preserves the current mental model and route structure.
- Frees space for the main content before forcing any stacked layout.

Cons:

- Requires more careful sidebar state styling and accessibility handling.
- Requires follow-up tuning on several screens.

### Option C: Narrow-Width Drawer Navigation

Switch the sidebar to a hidden drawer once width is reduced.

Pros:

- Maximizes workspace width.

Cons:

- Changes navigation interaction significantly.
- Feels more mobile-like than desktop-like.
- Conflicts with the user's stated preference to preserve the original layout.

## 5. Recommended Design

The recommended solution is Option B: progressive compact sidebar.

### 5.1 Shell Layout Strategy

The app shell should stay in a left-navigation layout through typical laptop widths instead of collapsing to a top-and-bottom stack below `lg`.

Proposed width bands:

- Wide desktop: full sidebar, approximately `240px`
- Mid-width desktop: compact sidebar, approximately `200px`
- Narrow desktop: icon rail, approximately `72px` to `84px`

These ranges are approximate design targets rather than hard product requirements. The implementation can use Tailwind breakpoints plus width classes so long as the behavior matches the design intent.

### 5.2 Compact Sidebar Behavior

In compact and icon-rail states:

- The navigation remains vertically persistent on the left.
- The active route remains visually obvious.
- Icon buttons retain the current focus and hover treatment.
- Text labels collapse in the icon-rail state.
- Accessible names remain available through visible semantics, `aria-label`, and tooltip or `title` support.

The brand area must shrink together with the sidebar. It must not keep a wide text block that defeats the point of the compact state.

### 5.3 Main Content Area

The content region should be allowed to reclaim the space freed by the sidebar:

- Preserve `min-w-0` through the shell and page containers.
- Revisit overly restrictive max-width choices so the workspace can use the available width more effectively.
- Prefer local content rearrangement over shell-level stacking.

## 6. Screen-Specific Responsive Rules

### 6.1 Query Page

Reference: `src/modules/query/screens/workspace-screen.tsx`

The page should keep its current high-level structure:

- page header
- query card
- result summary and result content

The query card should be split into two stable sections:

- input section
- control section

Responsive behavior:

- The input field keeps a full-row presentation.
- The type selector and action buttons stay on one row for longer than they do today.
- Buttons should only stack when the available width is truly insufficient.
- Button minimum widths may be reduced slightly to prevent premature wrapping.

This preserves the existing interaction model while making the query area feel balanced on narrower windows.

### 6.2 Translation Page

Reference: `src/modules/translations/screens/translations-screen.tsx`

The translation workspace should keep the current main-content-plus-recent-history split for longer:

- The recent-history column should become somewhat narrower than it is today.
- The main translation area should be favored when horizontal space is tight.
- The page should fall back to a single column later than it does now.

### 6.3 Wordbooks Page

Reference: `src/modules/wordbooks/ui/wordbooks-screen.tsx`

The wordbook list and detail view should remain a two-column layout for longer:

- The left list column should move from a rigid wide width toward a narrower `minmax(...)` range.
- The detail pane should remain the width priority.
- The page should collapse to one column only when readability would otherwise suffer.

### 6.4 History and Settings Pages

These pages do not need major layout redesign. They mainly benefit from the shell freeing more space.

Required follow-up:

- Ensure local flex and grid containers can shrink cleanly.
- Prevent button groups or form controls from causing horizontal overflow.

## 7. Accessibility and Interaction Requirements

- The icon-rail sidebar must remain keyboard navigable.
- Focus-visible treatment must remain obvious in all sidebar states.
- Route names must remain available to assistive technology when visible text is collapsed.
- Hover or tooltip text for icon-only navigation must reuse the existing route labels to avoid duplicate naming schemes.
- Active-state styling must remain legible at a glance in both full and icon-only sidebar modes.

## 8. Implementation Boundaries

This work should stay focused on responsive layout stability.

In scope:

- `AppShell` responsive structure
- sidebar width and label-collapse behavior
- main content width constraints
- query page control-row responsiveness
- translation page and wordbooks page column tuning
- narrow accessibility additions for icon-only navigation

Out of scope:

- new routes or navigation items
- route-level state changes
- new dialogs or drawers for navigation
- full redesign of card visuals or typography

## 9. Testing and Acceptance Criteria

### Acceptance Criteria

- On common lower-resolution laptop widths, the shell remains a left-sidebar layout.
- The sidebar can shrink into a compact or icon-rail state without losing route clarity.
- The query page no longer falls into an undesirable stacked shell layout simply because the window is below the old `lg` threshold.
- The translation and wordbooks pages preserve their two-column compositions longer than in the current implementation.
- No obvious horizontal overflow, clipped controls, or unreadable active navigation states are introduced.

### Verification Focus

- Manual resize testing across several desktop widths.
- Keyboard navigation of the sidebar in full and icon-only states.
- Regression checks on query, translation, history, wordbooks, and settings routes.
- Existing test coverage should be updated where class-based layout expectations are intentionally changed.

## 10. Risks and Mitigations

### Risk: Compact Sidebar Makes Navigation Ambiguous

Mitigation:

- Keep icons consistent and recognizable.
- Preserve clear active styling.
- Add accessible naming and hover text in icon-only mode.

### Risk: Inner Screens Still Collapse Too Early

Mitigation:

- Tune each affected page independently after the shell is fixed.
- Use later breakpoints and more flexible `minmax(...)` grid definitions.

### Risk: Content Width Becomes Too Loose on Large Screens

Mitigation:

- Rebalance max-width values instead of removing all width limits.
- Keep workspace content centered and visually contained.
