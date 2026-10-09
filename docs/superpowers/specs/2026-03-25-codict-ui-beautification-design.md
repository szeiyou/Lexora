# CoDict UI Beautification Design

Date: 2026-03-25
Status: Approved in interactive brainstorming
Target Platform: Desktop app
Tech Stack Context: Tauri v2, React, TypeScript, React Query, Zustand, Tailwind v4
Design Goal: Introduce shadcn/ui + Tailwind, replace native HTML controls, add restrained motion, and move the product to a macOS Settings-inspired dark theme

## 1. Overview

This design defines a phased UI beautification plan for the current CoDict desktop client. The work is not a product redesign or workflow rewrite. It is a presentation-layer modernization that standardizes the component system, styling primitives, and interaction polish across the existing app.

The desired visual direction is a macOS-native-feeling dark theme, specifically closer to the macOS Settings aesthetic than a dense pro-app interface. The app should feel calm, structured, and desktop-native: dark but not pure black, layered with soft surfaces, restrained accent color, rounded containers, light translucency, and subtle motion.

The user explicitly wants the design to include both:

- a clear component replacement inventory
- a phased rollout order that prioritizes safety over a full one-shot rewrite

## 2. Goals

### Primary Goals

- Standardize the UI layer on Tailwind v4 and shadcn/ui.
- Replace remaining native form and interaction elements with consistent semantic components.
- Establish a reusable dark-theme design token system.
- Improve the visual quality of the app shell, query workspace, settings, history, and wordbooks.
- Add subtle transitions and motion where they improve state clarity.
- Keep the rollout incremental and low-risk.

### Non-Goals

- No product-scope expansion.
- No new backend capabilities.
- No domain-model redesign.
- No major navigation model rewrite.
- No animation-heavy or highly expressive visual language.
- No attempt to imitate macOS pixel-for-pixel at the expense of usability in the current codebase.

## 3. Current State Summary

The current app already has a small shared UI layer and early tokenization, but it is still mostly a handcrafted CSS system rather than a standardized component system.

### Current Shared Primitives

- `src/shared/ui/button.tsx:6` wraps a native `button` with the `ui-button` class.
- `src/shared/ui/input.tsx:6` wraps a native `input` with the `ui-input` class.
- `src/shared/ui/panel.tsx:9` provides a generic surface wrapper via `ui-panel`.
- `src/shared/ui/status-view.tsx:10` renders simple empty/error/loading-style messaging.

### Current Styling Foundation

- `src/shared/styles/tokens.css:1` defines a light, handcrafted token set.
- `src/shared/styles/globals.css:1` contains only minimal reset rules.

### Current Native / Ad-hoc UI Usage Worth Replacing

- Native `select` is still used in `src/modules/query/ui/query-toolbar.tsx:44`.
- Native `select` is still used in `src/modules/settings/ui/settings-form.tsx:91`.
- Native `details` / `summary` is still used in `src/modules/settings/ui/settings-form.tsx:113`.
- Multiple screens still use loose `p`, inline `div style`, and generic `Panel` composition rather than semantic list, card, feedback, and form patterns, e.g. `src/modules/history/screens/history-screen.tsx:60` and `src/modules/wordbooks/ui/wordbooks-screen.tsx:78`.

## 4. Visual Direction

The target visual style is “macOS Settings-inspired dark desktop UI.”

### Visual Characteristics

- Dark layered background, but not absolute black.
- Sidebar visually distinct from the main content area.
- Soft cards and grouped panels instead of flat webpage sections.
- Low-contrast borders and subtle depth.
- Restrained accent color usage.
- Rounded corners used consistently across inputs, cards, dialogs, and navigation pills.
- Strong hierarchy through spacing, typography, and grouping instead of hard separators.

### What It Should Feel Like

- Calm, native, and desktop-oriented.
- More polished than the current handcrafted CSS system.
- More structured than a generic Tailwind admin dashboard.
- More understated than a “glassmorphism showcase.”

### What It Should Not Become

- A bright accent-heavy SaaS dashboard.
- A dense Xcode-like professional tool UI.
- A highly animated interface with decorative transitions.

## 5. Recommended Architecture for the UI Layer

The recommended approach is a design-system-first migration. Tailwind and shadcn/ui should become the foundation before broad page-by-page replacement begins.

### 5.1 Styling Stack

- Tailwind v4 becomes the primary styling layer.
- Existing CSS token files are reworked into a semantic token system compatible with the new dark theme.
- Tailwind utility classes should handle most component styling.
- Residual CSS should be limited to tokens, base rules, and narrow cases where utilities are not the right tool.

### 5.2 Component Stack

- shadcn/ui becomes the semantic primitive layer.
- Existing shared UI wrappers should either be:
  - replaced by shadcn exports directly, or
  - retained as thin local wrappers around shadcn primitives where local ergonomics or API stability matters.

### 5.3 Motion Layer

- Use lightweight Tailwind transitions for hover, focus, active, open/close, and state updates.
- Use `tailwindcss-animate` for dialog/popover/accordion/toast-style microinteractions if needed.
- Avoid introducing a broad animation framework unless a later implementation phase proves it necessary.

## 6. Design Token Plan

The current token set is oriented around the present handcrafted light theme. The redesign should introduce semantic tokens for a dark system.

### Required Semantic Color Tokens

- `background`
- `foreground`
- `card`
- `card-foreground`
- `surface` or equivalent secondary surface token
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

### Required Shape / Elevation Tokens

- Large container radius
- Standard card / field radius
- Small control radius
- Base shadow
- Elevated overlay shadow

### Material / Texture Rules

- Mild translucency is acceptable on major surfaces.
- Borders should stay low-contrast.
- Elevation should come from layering and mild shadow, not heavy blur or dramatic drop shadows.

## 7. Component Replacement Inventory

This inventory defines what should be replaced or migrated during implementation.

### 7.1 Core Native Element Replacements

- Native `button` → `Button`
- Native `input` → `Input`
- Native `select` → `Select`
- Ad-hoc field layout → `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`
- Native `details` / `summary` → `Accordion` or `Collapsible`
- Generic status copy blocks → `Alert`, dedicated empty-state blocks, or toast/inline feedback components
- Generic section containers → `Card`, `ScrollArea`, `Separator`, and more specific layout containers
- Destructive confirmations → `AlertDialog`
- Data-entry overlays → `Dialog` or `Sheet`

### 7.2 Existing Shared Component Mapping

#### `src/shared/ui/button.tsx:6`

Target state:
- Convert to a shadcn-style button implementation or a thin local wrapper over it.
- Add variant support for primary, secondary, ghost, outline, destructive, and small icon usage.

#### `src/shared/ui/input.tsx:6`

Target state:
- Convert to a shadcn-style input implementation or thin wrapper.
- Standardize focus ring, dark surface styling, disabled state, and placeholder tone.

#### `src/shared/ui/panel.tsx:9`

Target state:
- Reduce generic `Panel` usage over time.
- Replace with semantically clearer containers such as `Card`, layout sections, sidebar wrappers, and content groups.
- Keep a local container helper only if it still serves a clear role after migration.

#### `src/shared/ui/status-view.tsx:10`

Target state:
- Migrate toward semantically distinct empty, loading, warning, and error states.
- The current one-size-fits-all message block should not remain the only pattern.

## 8. Screen-by-Screen Design Direction

### 8.1 App Shell

Reference: `src/app/layouts/app-shell.tsx:11`

This should be the first major visual anchor.

#### Changes

- Transform the left rail into a macOS Settings-style sidebar.
- Add icons to navigation items.
- Use a pill-style active state with subtle fill and clearer text emphasis.
- Make the sidebar surface visually distinct from the workspace surface.
- Refine the brand block so it feels like an app identity area, not plain body text.
- Standardize outer app padding, content max-width behavior, and panel spacing.

#### Why It Matters

The shell controls first impression and sets the tone for every page. If the shell remains old-style while inner screens modernize, the app will still feel inconsistent.

### 8.2 Query Workspace

Reference: `src/modules/query/screens/workspace-screen.tsx:13`

This is the most important product screen and the first screen that should receive the new visual system.

#### Changes

- Make the search area a prominent grouped query card.
- Make type selection, query entry, and primary action hierarchy feel intentional and desktop-like.
- Treat recent searches as a subordinate surface rather than an incidental block.
- Render result sections as structured cards with consistent header/body/action layout.
- Replace loose loading/error/refresh text with semantic status components.
- Ensure restored history results and live results still converge on the same renderer stack.

#### Why It Matters

This is the core workflow. It should serve as the visual reference implementation for the whole redesign.

### 8.3 Query Toolbar

Reference: `src/modules/query/ui/query-toolbar.tsx:18`

#### Changes

- Replace native `select` with `Select`.
- Rework the form layout from a loose vertical form into a grouped query composition.
- Establish primary vs secondary action styling for “查询” and “强制刷新”.
- Add polished focus, hover, pressed, disabled, and loading feedback.

### 8.4 Settings Screen / Form

Reference: `src/modules/settings/ui/settings-form.tsx:17`

This should become the canonical form-pattern page for the project.

#### Changes

- Replace native `select` with `Select`.
- Replace `details` / `summary` diagnostics disclosure with `Accordion` or `Collapsible`.
- Convert field groups to shadcn form patterns.
- Convert validation and connection feedback into consistent inline alerts / form messaging.
- Group the page into settings cards so it feels closer to a desktop preferences screen.

#### Why It Matters

This page contains the densest concentration of native controls and therefore provides the best reference for form migration patterns.

### 8.5 History Screen

Reference: `src/modules/history/screens/history-screen.tsx:15`

#### Changes

- Replace loose top-level text blocks with proper page header and status surfaces.
- Ensure the list area uses consistent card/list-row styling.
- Improve open-state feedback and recoverable error presentation.
- Use consistent pagination controls and list density patterns aligned with the new system.

### 8.6 Wordbooks Screen

Reference: `src/modules/wordbooks/ui/wordbooks-screen.tsx:18`

#### Changes

- Replace inline style-based layout blocks with systemized Tailwind layout.
- Make the wordbook list feel like a navigable collection, not a stack of generic buttons.
- Standardize create/rename/delete flows on `Dialog` / `AlertDialog` patterns.
- Make detail-pane interactions visually consistent with the shell and settings screen.

## 9. Motion Strategy

The motion system should support clarity, not spectacle.

### Use Motion For

- Button hover and pressed states
- Focus state transitions
- Sidebar active state changes
- Dialog / sheet / popover entry and exit
- Accordion / collapsible expand and collapse
- Toast / alert entry
- Small visual refresh on query result updates

### Do Not Use Motion For

- Large page transitions
- Bounce effects
- Decorative zooms
- Long-duration animated choreography
- Excessive hover movement on cards

### Motion Principles

- Short durations
- Small travel distances
- Ease-out by default
- Motion only where a state change benefits from reinforcement

## 10. Implementation Phasing

The user explicitly prefers a safe phased rollout over a one-shot rewrite.

### Phase 1 — Foundation

Establish the new UI system before broad page conversion.

#### Scope

- Introduce shadcn/ui setup.
- Finalize Tailwind v4 styling foundation.
- Define the dark-theme semantic tokens.
- Introduce the first shared primitives:
  - Button
  - Input
  - Select
  - Card
  - Dialog
  - AlertDialog
  - Alert
  - Accordion or Collapsible
  - ScrollArea
  - Separator
- Standardize typography, radius, border, ring, shadow, and disabled-state behavior.

#### Exit Criteria

- Core primitives exist and render in the target dark theme.
- The project has a stable styling foundation for page migration.

### Phase 2 — App Shell + Query Workspace

This is the first visual payoff phase.

#### Scope

- Rebuild `app-shell` in the new style.
- Rebuild `query-toolbar` in the new style.
- Restyle `workspace-screen`, recent searches, and result containers.
- Standardize loading/error/refresh feedback patterns on the query path.

#### Exit Criteria

- The app’s main entry path clearly reflects the target aesthetic.
- The shell and primary workflow can serve as the style reference for later phases.

### Phase 3 — Settings Standardization

#### Scope

- Migrate settings form controls and disclosure UI.
- Establish canonical form spacing, labels, validation, and inline feedback.
- Make diagnostics expansion visually consistent with the new system.

#### Exit Criteria

- Settings page becomes the project’s canonical form implementation.

### Phase 4 — History + Wordbooks

#### Scope

- Migrate list/detail layouts to the new component system.
- Replace remaining ad-hoc buttons, layout containers, and status blocks.
- Standardize collection management interactions and dialogs.

#### Exit Criteria

- Secondary management screens no longer visually lag behind the primary query workflow.

### Phase 5 — Motion Polish + Cleanup

#### Scope

- Add the final layer of subtle motion.
- Remove obsolete handcrafted CSS classes and duplicate component abstractions.
- Eliminate residual native control styling patterns.

#### Exit Criteria

- The app feels visually consistent and technically cleaned up.

## 11. Replacement Priority Order

The highest-impact replacement order should be:

1. App shell containers and navigation items
2. Query input group and query actions
3. Native `select` usage
4. Major cards / result containers
5. Settings form patterns
6. Dialog / confirmation flows
7. History and wordbook collection UIs

## 12. Risks and Constraints

### Main Risks

- Mixing old handcrafted CSS and new Tailwind/shadcn styles too long can create a hybrid system that feels inconsistent.
- Replacing too many primitives at once may create avoidable regression risk.
- Overusing translucency or shadow could drift away from the intended restrained desktop feel.

### Control Strategy

- Finish foundation first.
- Use the query workflow as the first reference implementation.
- Use the settings page as the form standard.
- Defer cleanup of legacy abstractions until equivalent patterns are proven in the migrated screens.

## 13. Testing and Verification Expectations

Implementation planning should include verification for:

- Existing unit tests covering affected UI behavior
- New tests where semantic structure or interaction changes materially
- Query workflow behavior preservation
- Settings save/test connection behavior preservation
- Dialog and destructive-flow behavior preservation
- Visual smoke checks for key screens under the new theme

This redesign is cosmetic and structural at the UI layer, but the plan should still protect the app’s current functional behavior.

## 14. Final Recommendation

Proceed with a design-system-first migration using Tailwind v4 and shadcn/ui. Do not start by rewriting every screen at once. Build the dark theme foundation first, then use the app shell and query workspace as the first polished target, followed by settings, then history and wordbooks.

This approach best matches the user’s stated preference for a safe phased rollout while still producing a strong visible improvement early in the process.