# CoDict Clickable Cursor Pointer Design

Date: 2026-03-29
Status: Approved in chat
Target: Existing CoDict desktop client
Tech Stack: React, TypeScript, Tailwind, Vitest, Testing Library

## 1. Overview

The current desktop UI does not consistently switch the cursor to a pointer when the user hovers interactive controls. Shared buttons, navigation links, and some clickable list items still render with the default arrow cursor, which weakens interaction affordance.

This change should make pointer feedback consistent for the controls that users clearly interpret as actionable, while keeping non-clickable controls unchanged.

## 2. Goals

- Show the pointer cursor for shared buttons.
- Show the pointer cursor for main navigation links.
- Show the pointer cursor for clickable list items that are implemented as custom buttons.
- Show the pointer cursor for shared button-style triggers such as accordion headers.
- Preserve disabled-state affordance so disabled buttons do not look clickable.

## 3. Non-Goals

- No cursor change for text inputs, textareas, selects, or other editable controls.
- No redesign of visual styling, spacing, focus rings, or motion.
- No behavior change to click handling, routing, or API requests.
- No broad global cursor rule that affects every focusable element.

## 4. Current State

- `src/shared/ui/button.tsx` provides the shared button styles used across the app, but its base variant classes do not include a pointer cursor.
- `src/app/layouts/app-shell.tsx` renders the main navigation with `NavLink`, but the link classes do not include pointer styling.
- Some clickable list items such as the wordbook selector buttons and recent-search dropdown options rely on local class strings and likewise omit pointer styling.
- Shared button-style triggers such as the accordion header also omit pointer styling.

## 5. Design

### 5.1 Shared buttons

Add pointer cursor styling to the base `Button` variant so all enabled shared buttons inherit the correct cursor without touching each callsite.

Disabled buttons must continue to communicate non-interactiveness. The existing disabled-state utility classes should be extended so disabled buttons use a non-pointer cursor.

### 5.2 Navigation links

Add pointer cursor styling to the main navigation links in `AppShell`. This keeps navigation affordance explicit without introducing a global anchor rule that might later affect non-navigation links unexpectedly.

### 5.3 Clickable list items

Add pointer cursor styling to custom clickable list items that are already implemented as buttons but do not inherit the shared `Button` styles. For the current scope, this includes the wordbook selector list and the recent-search dropdown options.

### 5.4 Shared button-style triggers

Add pointer cursor styling to shared non-`Button` trigger primitives that users still interpret as buttons. The current in-scope example is the shared accordion trigger used in settings diagnostics.

### 5.5 Scope boundary

The change should remain intentionally narrow:

- shared `Button`
- shared accordion trigger
- main sidebar navigation links
- custom button-based list items

Inputs, selects, and non-clickable surfaces should remain unchanged.

## 6. Testing Strategy

- Add a shared button regression test that checks the rendered class list includes pointer styling and disabled cursor fallback.
- Extend existing UI tests to verify navigation links expose pointer styling.
- Extend an existing clickable list-item test to verify the relevant custom list button exposes pointer styling.

## 7. Risks

- Adding a broad global cursor rule would be cheaper, but it could accidentally affect editable controls or future non-action anchors.
- Relying on manual QA alone would make it easy for later refactors to drop the cursor utility silently.
