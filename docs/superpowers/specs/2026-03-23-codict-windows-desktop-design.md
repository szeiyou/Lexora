# CoDict Windows Desktop Design

Date: 2026-03-23
Status: Drafted and approved in interactive brainstorming
Target Platform: Windows desktop
Tech Stack: Tauri v2, React, TypeScript

## 1. Overview

CoDict is an AI electronic dictionary desktop client for Windows. The product connects to an existing DicServer backend and focuses on a clean, modern interface with stable module boundaries so future iterations can extend the client without large refactors.

The first release is intentionally constrained to capabilities already exposed by the server APIs in [服务端API接口文档.md](/mnt/c/MySpace/Workspace/DesktopApp/CoDict/服务端API接口文档.md). The desktop client will not introduce account systems, cloud sync, learning plans, OCR, screen word capture, or other new backend-dependent features.

## 2. Product Goals

### Goals

- Provide a primary desktop workspace for unified AI dictionary queries.
- Support mixed user scenarios equally: English word lookup, Chinese-to-English term lookup, and sentence translation.
- Expose backend-supported features in a coherent desktop workflow: query, refresh, audio playback, recent searches, history, and wordbooks.
- Keep the architecture modular so later iterations can expand behavior without forcing cross-project rewrites.
- Deliver a polished Windows app suitable for small-scale distribution.

### Non-Goals

- No new server-side capabilities beyond the documented APIs.
- No account registration, login flows, or cloud synchronization.
- No learning plan engine, spaced repetition, or progress dashboards.
- No OCR, clipboard monitoring, or screen selection translation in the first release.
- No offline dictionary or local-first data synchronization strategy.

## 3. Scope

### In Scope

- Unified query workspace backed by `GET /api/v1/entries`
- Forced refresh backed by `POST /api/v1/entries/refresh`
- Audio polling and playback backed by `GET /api/v1/audio/by-key/{audioKey}`
- Recent searches backed by `GET /api/v1/recent-searches`
- Search history list and detail recovery backed by `GET /api/v1/history` and `GET /api/v1/history/{id}`
- Wordbook management backed by `/api/v1/wordbooks/**`
- Settings for server address, username, password, timeout, and connection verification
- Windows shell integrations appropriate for a desktop dictionary, such as tray presence, window behavior, and keyboard-first interaction

### Out of Scope

- Multi-user support
- Cross-device sync
- New backend endpoints
- Backend schema redesign
- Full sentence audio, since the current API does not provide it

## 4. User Profile and Product Positioning

This release targets mixed-language users instead of a single narrow persona. The interface must treat three query intents as first-class:

- English word lookup
- Chinese-to-English term and phrase lookup
- Chinese-English sentence translation

The product form factor is a main desktop workspace, not a floating quick-lookup-only utility. The app should still feel efficient and keyboard-friendly, but the primary mental model is a stable study and lookup workstation with adjacent management surfaces.

The distribution target is small-scale external use. That raises the quality bar for setup guidance, error messages, loading states, and packaging polish, even though the product is not yet being designed as a large public SaaS offering.

## 5. Recommended Architecture

The recommended approach is a domain-modular desktop client. This is preferred over page-oriented scaffolding because the product already spans multiple functional areas with shared data flows, including query restoration, audio state, and wordbook actions.

### Layered Structure

#### 5.1 Tauri Shell

Responsibilities:

- Window lifecycle and size/position management
- System tray integration
- Global or local shortcut registration when needed
- Local configuration persistence
- Native capability bridging to the frontend

Non-responsibilities:

- Query business rules
- Response parsing logic
- History restoration decisions

Tauri commands should stay small and capability-oriented so Rust remains an infrastructure layer, not a second business runtime.

For first-release desktop behavior:

- On the first click of the window close button, ask the user whether close should minimize the app to tray or exit the app.
- Persist that choice locally and reuse it on later closes.
- If the remembered behavior is minimize-to-tray, expose explicit tray actions for reopen and full exit.

#### 5.2 Application Core

Responsibilities:

- Route layout
- Cross-module orchestration
- Shared app bootstrapping
- Global error boundaries
- Theme and design token wiring

The app core coordinates modules but does not own backend-specific parsing rules.

#### 5.3 Domain Modules

Recommended modules:

- `query`
- `audio`
- `recent-searches`
- `history`
- `wordbooks`
- `settings`
- `desktop-shell`

Each module owns its own API calls, domain types, state adapters, and presentation pieces. Page composition happens at the app level, but the business logic lives inside each module.

#### 5.4 Shared Foundation

Shared infrastructure includes:

- HTTP client
- Error model
- Data mappers
- Shared UI primitives
- Design tokens
- Utility functions
- Common loading and empty-state components

## 6. Information Architecture

The product uses a single main window with a left navigation rail, a top query entry zone, and a main content area. This avoids splitting user state across multiple windows and keeps the working context coherent.

### Primary Navigation

#### 6.1 Query Workspace

The default landing view. It contains:

- The unified search input
- Query type selection: automatic, English word, Chinese-to-English term, sentence translation
- Result presentation
- Inline actions such as play audio, refresh, and add to wordbook

#### 6.2 Recent Searches

Recent searches may appear as a secondary panel inside the query workspace or as a light navigation destination. Its purpose is fast re-entry into prior lookup context, not deep archival browsing.

#### 6.3 History

History is a dedicated management surface for paginated records. Users can browse summaries, open details, and restore the original result view from stored `responseJson`.

#### 6.4 Wordbooks

Wordbooks are a separate management area containing:

- Wordbook list
- Wordbook creation and rename
- Wordbook detail
- Add and remove words
- Empty and bulk operations

Query results may trigger wordbook actions, but wordbook management should remain structurally separate from the query workspace.

#### 6.5 Settings

Settings should focus on actual first-release needs:

- Server base URL
- Username and password
- Request timeout
- Connection test
- Basic appearance preference if introduced

## 7. Core User Flows

### 7.1 Query Flow

1. User enters text into the unified search field.
2. User optionally forces a query type.
3. Client calls `GET /api/v1/entries`.
4. Response is mapped into a normalized client-side result model.
5. The result renderer chooses the appropriate view based on `resultType`.
6. Audio and wordbook actions are attached to the resulting cards.

### 7.2 Refresh Flow

1. User clicks refresh from the current result.
2. Client reuses the current query context and calls `POST /api/v1/entries/refresh`.
3. The returned payload overwrites the current result model and invalidates any stale cached query detail.

### 7.3 Audio Flow

1. User requests playback from an audio-enabled card.
2. Client fetches the backend `audioUrl`.
3. If the server returns `200`, playback starts.
4. If the server returns `202`, the UI shows a generating state and polls the same URL until success or timeout policy is reached.
5. If the server returns `404`, the UI marks the audio as unavailable instead of looping indefinitely.

### 7.4 History Restore Flow

1. User opens a history summary item.
2. Client requests `GET /api/v1/history/{id}`.
3. Client parses `responseJson`.
4. Parsed content is transformed into the same normalized result model used by live query results.
5. The query workspace renderer is reused without creating a second result UI system.

### 7.5 Wordbook Management Flow

1. User opens wordbooks.
2. Client loads wordbook list from `GET /api/v1/wordbooks`.
3. User creates, renames, deletes, or opens a wordbook.
4. Inside a wordbook, client manages words through the documented bulk add/remove endpoints.
5. Query results can push a selected word into a chosen wordbook through a focused action flow.

## 8. Result Rendering Model

The client must define a normalized view model that decouples UI rendering from raw backend payload origin.

### Required Principle

Live query results and restored history results must both converge into one shared client representation, for example `EntryResultViewModel`.

That model should contain:

- Query metadata
- Result type
- Language direction
- Header summary fields
- Audio descriptors
- Structured body blocks for word, term, or sentence result content

### Why This Matters

- The UI only needs one renderer stack.
- History restoration becomes predictable.
- Refactoring result presentation later does not require changing multiple data paths.
- Module boundaries remain stable even if the backend response grows in detail.

## 9. State Management Strategy

The frontend state is divided into three distinct layers.

### 9.1 Server State: TanStack Query

Use TanStack Query for:

- Entry fetches
- Refresh fetches
- Recent searches
- History list pagination
- History detail
- Wordbook list and wordbook detail
- Mutations for wordbook operations

Benefits:

- Cache coherence
- Pagination support
- Retry controls
- Query invalidation after mutations
- Clear loading and stale states

### 9.2 Client State: Zustand

Use Zustand for:

- Current query input and selected query type
- Current active normalized result
- Audio playback state and polling state
- Selected wordbook context
- UI-level selections and transient workspace state
- Settings draft before save

These states are local to the desktop client and do not belong in server-state caches.

### 9.3 Persistent Local State: Tauri Store or Config File

Persist:

- Base URL
- Username
- Password in local config using lightweight reversible obfuscation
- Window preference
- Possibly last-opened navigation context

Do not use local persistence as a mirror of backend business data in the first release.

## 10. Technical Stack Decisions

Recommended stack:

- Tauri v2
- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Axios behind an internal client wrapper
- Tailwind CSS with product-owned primitives
- React Hook Form
- Zod

### Rationale

- Tauri v2 plus Vite is the most direct and maintainable Windows desktop path for the requested stack.
- React Router is sufficient for workspace-scale navigation without overengineering.
- TanStack Query matches the backend’s REST-heavy and polling-friendly interaction model.
- Zustand keeps client state modular without building large context trees.
- Axios simplifies Basic Auth, binary audio fetching, timeouts, and response interceptors.
- Tailwind plus custom primitives provides visual control without locking the app into a third-party component library look.

## 11. UI and Interaction Principles

The interface should be clean and modern, but not generic. The visual system should feel intentional and desktop-appropriate.

### Design Principles

- Prioritize the query input as the primary action on entry.
- Keep the visual hierarchy clear between result header, structured result content, and management actions.
- Use one cohesive visual language across word lookup, term lookup, and translation, even though their content blocks differ.
- Minimize full-page navigation jumps for common actions.
- Keep keyboard interaction strong for search-driven usage.

### Suggested Layout Characteristics

- Left navigation for major areas
- Top-centered or top-dominant query bar
- Content cards with restrained density
- Persistent but non-intrusive action zones for refresh, audio, and wordbook actions
- Strong empty states and onboarding hints for first-run setup

## 12. Error Handling and Resilience

Errors should be modeled as user-understandable states, not only as generic toast notifications.

### Error Categories

- Missing server configuration
- Network connection failure
- Authentication failure
- API business error from backend `code` and `message`
- Empty data state
- History restore parse failure
- Audio generating state from `202 Accepted`
- Audio unavailable state from `404 Not Found`

### Handling Principles

- `202 Accepted` for audio is a progress state, not an error.
- Settings should include an explicit connection test so failures appear before a user reaches the query workspace.
- Parse failures when restoring `responseJson` must fail gracefully with a recoverable UI state, not a blank screen.
- Unauthorized responses should drive the user back toward settings with actionable guidance.
- Connection testing should use a lightweight authenticated API probe instead of relying on an undocumented dedicated backend health endpoint.

## 13. Security and Configuration Notes

The backend uses HTTP Basic Auth for `/api/**`, so the client must centrally apply credentials and avoid leaking authentication handling into view components.

Requirements:

- Store server address separately from credentials.
- Centralize auth header generation in the HTTP client wrapper.
- In the first release, persist the password in the local client configuration using only lightweight reversible obfuscation.
- Treat this as a scoped tradeoff for small-scale distribution, not as a strong secret-storage solution.
- Keep the storage adapter isolated so a later migration to Windows Credential Manager does not require rewriting the settings UI or HTTP client.
- Keep settings validation strict enough to avoid malformed base URLs and empty credentials.

## 14. Project Structure

Recommended source layout:

```text
src/
  app/
  modules/
    query/
    audio/
    recent-searches/
    history/
    wordbooks/
    settings/
    desktop-shell/
  shared/
    api/
    lib/
    styles/
    types/
    ui/
```

Inside each feature module, prefer a structure such as:

- `api/`
- `model/`
- `ui/`
- `screens/` or `routes/`

This keeps page composition thin and feature behavior localized.

## 15. Testing Strategy

Testing should focus on module boundaries and the highest-risk flows.

### 15.1 Unit Tests

Cover:

- Response mappers
- Result normalization
- Audio polling state transitions
- History `responseJson` parsing and restoration logic
- Error translation logic

### 15.2 Component Tests

Cover:

- The three result-type renderers
- Loading, error, and empty states
- Audio action state transitions
- Settings validation and connection test behavior

### 15.3 End-to-End Tests

Cover:

- First-run configuration
- Successful query
- History open and restore
- Wordbook add and removal flow
- Failure handling for bad credentials and connection errors

## 16. Delivery Plan

The recommended delivery sequence is incremental, with each stage producing a running desktop build.

### Phase 1: Foundation

- Project bootstrap
- Tauri shell setup
- Routing and app shell
- Design token baseline
- Settings page and credential persistence
- Shared HTTP client

### Phase 2: Query Workspace

- Unified search flow
- Result normalization
- Three result renderers
- Refresh action
- Audio polling and playback

### Phase 3: Retrieval Surfaces

- Recent searches
- History list
- History detail fetch
- History result restoration into shared renderer

### Phase 4: Wordbooks and Desktop Finish

- Wordbook CRUD
- Add and remove words
- Tray and window behavior polish
- Packaging refinement for small-scale distribution

## 17. Key Architectural Rules

These rules should be enforced throughout implementation:

- UI components do not call REST endpoints directly.
- Backend responses pass through typed mappers before reaching view components.
- History restoration and live query rendering share the same normalized result contract.
- Tauri commands stay infrastructure-focused rather than becoming a business logic layer.
- Module boundaries take priority over short-term convenience.

## 18. Open Decisions for Implementation Planning

These do not block the design but should be finalized during implementation planning:

- Whether recent searches is a dedicated route or a workspace subpanel
- Exact visual token system and typography choices

## 19. Recommendation Summary

Build the first release as a modular Windows desktop workspace centered on unified query and server-backed learning utilities. Keep the Rust side thin, normalize result data aggressively on the frontend, and organize the React codebase by feature modules rather than pages. This produces a client that is immediately useful with the existing DicServer APIs while remaining structurally ready for future product growth.
