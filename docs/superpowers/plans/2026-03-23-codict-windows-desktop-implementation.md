# CoDict Windows Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first release of CoDict as a modular Windows desktop dictionary client backed only by the existing DicServer APIs.

**Architecture:** Start from a fresh Vite + Tauri v2 workspace in the current directory, keep Rust limited to shell capabilities, and organize the frontend by domain modules around one shared `EntryResultViewModel`. Use TanStack Query for server data, Zustand for client state, and a persisted settings adapter that keeps password obfuscation isolated from the rest of the app.

**Tech Stack:** Tauri v2, React, TypeScript, Vite, React Router, TanStack Query, Zustand, Axios, Tailwind CSS, React Hook Form, Zod, Vitest, Testing Library, MSW, Playwright

---

## Assumptions Locked During Planning

- The current directory is not a Git repository yet; Task 1 initializes Git so later commit steps work.
- Use `npm`, not `pnpm` or `yarn`, to minimize bootstrap friction on Windows.
- Use `GET /api/v1/recent-searches` as the authenticated connection test endpoint from the settings screen.
- Implement recent searches as a workspace side panel, not a top-level route.
- Persist password with lightweight reversible obfuscation in the local client config for release 1.
- On first window close, ask whether to minimize to tray or exit; persist the choice for later closes.

## Planned File Map

### Root and Tooling

- `package.json`: runtime dependencies, test/build scripts, Tauri scripts
- `.gitignore`: Node, Rust, Tauri, Playwright, and build artifacts
- `tsconfig.json`: app TypeScript config with `@/*` path alias
- `tsconfig.node.json`: Node-side TypeScript config for Vite tooling
- `vite.config.ts`: React plugin, alias, and dev server configuration on port `1420`
- `vitest.config.ts`: jsdom test setup, alias reuse, coverage defaults
- `playwright.config.ts`: browser smoke tests against the Vite app
- `index.html`: Vite entry
- `README.md`: local development, packaging, and backend configuration instructions

### Frontend App Shell

- `src/main.tsx`: app bootstrap
- `src/app/app.tsx`: provider composition and router mount
- `src/app/router.tsx`: route table for workspace, history, wordbooks, settings
- `src/app/providers/app-providers.tsx`: React Query provider and shared wrappers
- `src/app/layouts/app-shell.tsx`: left navigation, top query slot, main content frame
- `src/shared/styles/tokens.css`: color, spacing, radius, motion, and typography tokens
- `src/shared/styles/globals.css`: Tailwind import, app background, base element styles
- `src/shared/lib/cn.ts`: class name merge helper
- `src/shared/ui/button.tsx`: primary/secondary button primitive
- `src/shared/ui/input.tsx`: shared text input
- `src/shared/ui/panel.tsx`: shared card/panel shell
- `src/shared/ui/status-view.tsx`: empty, error, and loading states

### Shared API Foundation

- `src/shared/api/api-error.ts`: normalize backend `code` and `message` failures
- `src/shared/api/http-client.ts`: Axios instance, Basic Auth header injection, timeout, and binary response support
- `src/shared/api/query-client.ts`: TanStack Query client factory
- `src/test/setup.ts`: Testing Library and Vitest setup
- `src/test/msw/server.ts`: MSW server bootstrap

### Settings Module

- `src/modules/settings/model/settings.schema.ts`: Zod schema and defaults
- `src/modules/settings/model/settings.obfuscation.ts`: reversible obfuscation helpers
- `src/modules/settings/model/settings.store.ts`: Zustand store for active settings and draft values
- `src/modules/settings/api/settings-repository.ts`: persisted settings read/write adapter
- `src/modules/settings/api/test-connection.ts`: authenticated probe against `/api/v1/recent-searches`
- `src/modules/settings/ui/settings-form.tsx`: service URL, username, password, timeout form
- `src/modules/settings/screens/settings-screen.tsx`: settings page container

### Query Module

- `src/modules/query/model/entry-response.ts`: raw API response types
- `src/modules/query/model/entry-result-view-model.ts`: normalized result contract used across the app
- `src/modules/query/model/entry-result-mapper.ts`: transform raw API payload to shared result model
- `src/modules/query/model/query-store.ts`: current query text, forced type, and active result context
- `src/modules/query/api/fetch-entry.ts`: `GET /api/v1/entries`
- `src/modules/query/api/refresh-entry.ts`: `POST /api/v1/entries/refresh`
- `src/modules/query/ui/query-toolbar.tsx`: search input and type picker
- `src/modules/query/ui/result-switch.tsx`: delegate rendering by result type
- `src/modules/query/ui/english-word-card.tsx`: English word result block
- `src/modules/query/ui/zh-to-en-term-card.tsx`: Chinese-to-English term result block
- `src/modules/query/ui/sentence-translation-card.tsx`: sentence translation result block
- `src/modules/query/screens/workspace-screen.tsx`: workspace container

### Audio Module

- `src/modules/audio/api/fetch-audio.ts`: audio fetcher with binary response handling
- `src/modules/audio/model/audio-store.ts`: active audio key and status
- `src/modules/audio/model/audio-controller.ts`: `200/202/404` polling workflow
- `src/modules/audio/ui/audio-button.tsx`: play/generating/unavailable control

### Recent Searches Module

- `src/modules/recent-searches/api/fetch-recent-searches.ts`: `GET /api/v1/recent-searches`
- `src/modules/recent-searches/ui/recent-searches-panel.tsx`: workspace side panel for quick reopen

### History Module

- `src/modules/history/api/fetch-history-page.ts`: `GET /api/v1/history`
- `src/modules/history/api/fetch-history-detail.ts`: `GET /api/v1/history/{id}`
- `src/modules/history/model/history-response.parser.ts`: parse `responseJson` and normalize it
- `src/modules/history/ui/history-list.tsx`: summary list with pagination controls
- `src/modules/history/screens/history-screen.tsx`: history route container

### Wordbooks Module

- `src/modules/wordbooks/api/fetch-wordbooks.ts`: list wordbooks
- `src/modules/wordbooks/api/fetch-wordbook-words.ts`: list words in a wordbook
- `src/modules/wordbooks/api/mutate-wordbooks.ts`: create, rename, delete wordbooks
- `src/modules/wordbooks/api/mutate-wordbook-words.ts`: add, remove, clear words
- `src/modules/wordbooks/api/find-containing-wordbooks.ts`: find wordbook ids containing a word
- `src/modules/wordbooks/model/wordbook.types.ts`: wordbook and word DTOs
- `src/modules/wordbooks/ui/wordbooks-screen.tsx`: wordbook route container
- `src/modules/wordbooks/ui/wordbook-detail-pane.tsx`: selected wordbook details
- `src/modules/wordbooks/ui/wordbook-editor-dialog.tsx`: create and rename dialog
- `src/modules/wordbooks/ui/add-to-wordbook-dialog.tsx`: add current word from query results

### Desktop Shell

- `src/modules/desktop-shell/model/close-behavior.ts`: frontend close-behavior enum and helpers
- `src/modules/desktop-shell/ui/close-behavior-dialog.tsx`: first-close prompt
- `src-tauri/Cargo.toml`: Rust dependencies and plugins
- `src-tauri/build.rs`: Tauri build integration
- `src-tauri/tauri.conf.json`: window and bundle configuration
- `src-tauri/src/main.rs`: Tauri builder, plugin registration, command wiring
- `src-tauri/src/tray.rs`: tray menu setup and reopen/exit actions
- `src-tauri/src/window_policy.rs`: close interception and persisted preference commands

### Tests and Fixtures

- `src/app/app.test.tsx`
- `src/app/router.test.tsx`
- `src/modules/settings/model/settings.obfuscation.test.ts`
- `src/modules/settings/ui/settings-screen.test.tsx`
- `src/modules/query/model/entry-result-mapper.test.ts`
- `src/modules/query/ui/workspace-screen.test.tsx`
- `src/modules/audio/model/audio-controller.test.ts`
- `src/modules/recent-searches/ui/recent-searches-panel.test.tsx`
- `src/modules/history/model/history-response.parser.test.ts`
- `src/modules/history/ui/history-screen.test.tsx`
- `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
- `src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`
- `src/modules/desktop-shell/model/close-behavior.test.ts`
- `tests/e2e/settings-and-query.spec.ts`
- `tests/e2e/history-and-wordbooks.spec.ts`
- `docs/manual-smoke-checklist.md`

### Task 1: Bootstrap the Vite + Tauri Workspace

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/app.tsx`
- Create: `src/app/app.test.tsx`
- Create: `src/test/setup.ts`
- Create: `src/shared/styles/globals.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/tauri.conf.json`
- Test: `src/app/app.test.tsx`

- [ ] **Step 1: Initialize Git and ignore generated files**

```gitignore
node_modules/
dist/
target/
src-tauri/target/
playwright-report/
test-results/
.DS_Store
```

Run: `git init`
Expected: Git repository initialized in `/mnt/c/MySpace/Workspace/DesktopApp/CoDict/.git/`

- [ ] **Step 2: Create the package/tooling files and a failing smoke test**

```json
{
  "name": "codict",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 1420",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

```tsx
// src/app/app.test.tsx
import { render, screen } from "@testing-library/react";
import App from "./app";

it("renders the CoDict shell title", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "CoDict" })).toBeInTheDocument();
});
```

- [ ] **Step 3: Install dependencies and verify the smoke test fails**

Run: `npm install react react-dom react-router-dom zustand axios zod react-hook-form @hookform/resolvers @tanstack/react-query @tauri-apps/api`
Expected: packages installed with no audit blockers that prevent local development

Run: `npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw playwright tailwindcss @tailwindcss/vite @tauri-apps/cli`
Expected: dev dependencies installed successfully

Run: `npm run test -- src/app/app.test.tsx`
Expected: FAIL because `src/app/app.tsx` and the initial render tree do not exist yet

- [ ] **Step 4: Implement the minimal app shell and Tauri bootstrap**

```tsx
// src/app/app.tsx
export default function App() {
  return (
    <main>
      <h1>CoDict</h1>
    </main>
  );
}
```

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/app";
import "@/shared/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run CoDict");
}
```

- [ ] **Step 5: Verify the bootstrap is buildable**

Run: `npm run test -- src/app/app.test.tsx`
Expected: PASS with 1 test passed

Run: `npm run build`
Expected: Vite build completes and outputs `dist/`

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: Rust compile check passes for the Tauri shell

- [ ] **Step 6: Commit the bootstrap**

```bash
git add .gitignore package.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts index.html src/main.tsx src/app/app.tsx src/app/app.test.tsx src/test/setup.ts src/shared/styles/globals.css src-tauri/Cargo.toml src-tauri/build.rs src-tauri/src/main.rs src-tauri/tauri.conf.json
git commit -m "chore: bootstrap Tauri React workspace"
```

### Task 2: Build the Routed App Shell and Shared UI Primitives

**Files:**
- Modify: `src/app/app.tsx`
- Create: `src/app/router.tsx`
- Create: `src/app/providers/app-providers.tsx`
- Create: `src/app/layouts/app-shell.tsx`
- Create: `src/app/router.test.tsx`
- Create: `src/shared/styles/tokens.css`
- Create: `src/shared/lib/cn.ts`
- Create: `src/shared/ui/button.tsx`
- Create: `src/shared/ui/input.tsx`
- Create: `src/shared/ui/panel.tsx`
- Create: `src/shared/ui/status-view.tsx`
- Create: `src/modules/query/screens/workspace-screen.tsx`
- Create: `src/modules/history/screens/history-screen.tsx`
- Create: `src/modules/wordbooks/ui/wordbooks-screen.tsx`
- Create: `src/modules/settings/screens/settings-screen.tsx`
- Test: `src/app/router.test.tsx`

- [ ] **Step 1: Write a failing router test for the main workspace shell**

```tsx
import { render, screen } from "@testing-library/react";
import App from "./app";

it("renders workspace navigation and the query workspace by default", () => {
  render(<App />);
  expect(screen.getByRole("navigation")).toHaveTextContent("查询工作台");
  expect(screen.getByRole("navigation")).toHaveTextContent("历史记录");
  expect(screen.getByRole("navigation")).toHaveTextContent("单词本");
  expect(screen.getByRole("navigation")).toHaveTextContent("设置");
  expect(screen.getByRole("heading", { name: "查询工作台" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the shell test and confirm it fails**

Run: `npm run test -- src/app/router.test.tsx`
Expected: FAIL because routing, layout, and placeholder screens are not implemented

- [ ] **Step 3: Implement providers, routes, placeholder screens, and shared UI tokens**

```tsx
// src/app/router.tsx
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <WorkspaceScreen /> },
      { path: "history", element: <HistoryScreen /> },
      { path: "wordbooks", element: <WordbooksScreen /> },
      { path: "settings", element: <SettingsScreen /> },
    ],
  },
]);
```

```css
/* src/shared/styles/tokens.css */
:root {
  --background: #f5f1e8;
  --panel: rgba(255, 252, 245, 0.92);
  --text: #1e1f1c;
  --muted: #6a6d63;
  --accent: #0f766e;
  --radius-lg: 20px;
}
```

- [ ] **Step 4: Verify shell rendering and route wiring**

Run: `npm run test -- src/app/router.test.tsx`
Expected: PASS with the routed shell and placeholder views rendered

Run: `npm run build`
Expected: PASS with no unresolved imports

- [ ] **Step 5: Commit the app shell**

```bash
git add src/app/app.tsx src/app/router.tsx src/app/providers/app-providers.tsx src/app/layouts/app-shell.tsx src/app/router.test.tsx src/shared/styles/tokens.css src/shared/lib/cn.ts src/shared/ui/button.tsx src/shared/ui/input.tsx src/shared/ui/panel.tsx src/shared/ui/status-view.tsx src/modules/query/screens/workspace-screen.tsx src/modules/history/screens/history-screen.tsx src/modules/wordbooks/ui/wordbooks-screen.tsx src/modules/settings/screens/settings-screen.tsx
git commit -m "feat: add routed desktop app shell"
```

### Task 3: Implement Settings Persistence, Auth, and Connection Testing

**Files:**
- Create: `src/shared/api/api-error.ts`
- Create: `src/shared/api/http-client.ts`
- Create: `src/shared/api/query-client.ts`
- Create: `src/test/msw/server.ts`
- Create: `src/modules/settings/model/settings.schema.ts`
- Create: `src/modules/settings/model/settings.obfuscation.ts`
- Create: `src/modules/settings/model/settings.store.ts`
- Create: `src/modules/settings/api/settings-repository.ts`
- Create: `src/modules/settings/api/test-connection.ts`
- Create: `src/modules/settings/ui/settings-form.tsx`
- Modify: `src/modules/settings/screens/settings-screen.tsx`
- Modify: `src/app/providers/app-providers.tsx`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/main.rs`
- Create: `src/modules/settings/model/settings.obfuscation.test.ts`
- Create: `src/modules/settings/ui/settings-screen.test.tsx`
- Test: `src/modules/settings/model/settings.obfuscation.test.ts`
- Test: `src/modules/settings/ui/settings-screen.test.tsx`

- [ ] **Step 1: Write failing tests for obfuscation round-trip and connection test success**

```ts
import { deobfuscatePassword, obfuscatePassword } from "./settings.obfuscation";

it("round-trips password obfuscation", () => {
  const encoded = obfuscatePassword("secret-123");
  expect(encoded).not.toBe("secret-123");
  expect(deobfuscatePassword(encoded)).toBe("secret-123");
});
```

```tsx
it("tests the server connection with saved credentials", async () => {
  render(<SettingsScreen />);
  await userEvent.type(screen.getByLabelText("服务地址"), "http://localhost:8080");
  await userEvent.type(screen.getByLabelText("用户名"), "tester");
  await userEvent.type(screen.getByLabelText("密码"), "secret-123");
  await userEvent.click(screen.getByRole("button", { name: "测试连接" }));
  expect(await screen.findByText("连接成功")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the settings tests and confirm they fail**

Run: `npm run test -- src/modules/settings/model/settings.obfuscation.test.ts src/modules/settings/ui/settings-screen.test.tsx`
Expected: FAIL because the settings model, API, and UI do not exist yet

- [ ] **Step 3: Implement settings schema, Tauri-backed persistence, Axios auth, and connection testing**

```ts
// src/modules/settings/model/settings.schema.ts
export const settingsSchema = z.object({
  baseUrl: z.string().url(),
  username: z.string().min(1),
  password: z.string().min(1),
  requestTimeoutMs: z.number().int().min(1000).max(30000).default(8000),
  closeBehavior: z.enum(["ask", "tray", "exit"]).default("ask"),
});
```

```ts
// src/modules/settings/model/settings.obfuscation.ts
const KEY = "CoDict:v1";

export function obfuscatePassword(raw: string): string {
  return btoa(
    Array.from(raw)
      .map((char, index) =>
        String.fromCharCode(char.charCodeAt(0) ^ KEY.charCodeAt(index % KEY.length)),
      )
      .join(""),
  );
}
```

```ts
// src/modules/settings/api/test-connection.ts
export async function testConnection(settings: SettingsValues) {
  const client = createHttpClient(settings);
  await client.get("/api/v1/recent-searches");
}
```

- [ ] **Step 4: Verify settings behavior and persistence wiring**

Run: `npm run test -- src/modules/settings/model/settings.obfuscation.test.ts src/modules/settings/ui/settings-screen.test.tsx`
Expected: PASS with the form saving values and the connection test reporting success

Run: `npm run build`
Expected: PASS with `@tauri-apps/plugin-store` registration and no TypeScript errors

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS with the Tauri store plugin registered

- [ ] **Step 5: Commit the settings foundation**

```bash
git add src/shared/api/api-error.ts src/shared/api/http-client.ts src/shared/api/query-client.ts src/test/msw/server.ts src/modules/settings/model/settings.schema.ts src/modules/settings/model/settings.obfuscation.ts src/modules/settings/model/settings.store.ts src/modules/settings/api/settings-repository.ts src/modules/settings/api/test-connection.ts src/modules/settings/ui/settings-form.tsx src/modules/settings/screens/settings-screen.tsx src/modules/settings/model/settings.obfuscation.test.ts src/modules/settings/ui/settings-screen.test.tsx src/app/providers/app-providers.tsx src-tauri/Cargo.toml src-tauri/src/main.rs
git commit -m "feat: add settings persistence and auth bootstrap"
```

### Task 4: Normalize `/entries` Payloads into a Shared Result Model

**Files:**
- Create: `src/modules/query/model/entry-response.ts`
- Create: `src/modules/query/model/entry-result-view-model.ts`
- Create: `src/modules/query/model/entry-result-mapper.ts`
- Create: `src/modules/query/model/__fixtures__/entry-responses.ts`
- Create: `src/modules/query/model/entry-result-mapper.test.ts`
- Test: `src/modules/query/model/entry-result-mapper.test.ts`

- [ ] **Step 1: Write failing mapper tests for the three supported result types**

```ts
it("maps ENGLISH_WORD payloads into a shared view model", () => {
  const result = mapEntryResponse(englishWordResponse);
  expect(result.kind).toBe("english-word");
  expect(result.audio.headword?.audioKey).toBe("english_word:headword:phenomenon");
});

it("maps ZH_TO_EN_TERM payloads into a shared view model", () => {
  const result = mapEntryResponse(zhToEnTermResponse);
  expect(result.kind).toBe("zh-to-en-term");
  expect(result.candidates[0]?.term).toBe("apple");
});

it("maps SENTENCE_TRANSLATION payloads into a shared view model", () => {
  const result = mapEntryResponse(sentenceTranslationResponse);
  expect(result.kind).toBe("sentence-translation");
  expect(result.translatedSentence).toBe("How are you today?");
});
```

- [ ] **Step 2: Run the mapper tests and confirm they fail**

Run: `npm run test -- src/modules/query/model/entry-result-mapper.test.ts`
Expected: FAIL because the raw types, fixtures, and mapper are missing

- [ ] **Step 3: Implement typed DTOs, the normalized view model, and the mapper**

```ts
// src/modules/query/model/entry-result-view-model.ts
export type EntryResultViewModel =
  | { kind: "english-word"; query: string; audio: { headword?: AudioDescriptor; fullReading?: AudioDescriptor } }
  | { kind: "zh-to-en-term"; query: string; candidates: TermCandidateViewModel[]; audio: { headword?: AudioDescriptor } }
  | { kind: "sentence-translation"; query: string; translatedSentence: string; alternatives: string[]; audio: {} };
```

```ts
// src/modules/query/model/entry-result-mapper.ts
export function mapEntryResponse(response: EntryQueryResponse): EntryResultViewModel {
  switch (response.resultType) {
    case "ENGLISH_WORD":
      return mapEnglishWord(response);
    case "ZH_TO_EN_TERM":
      return mapZhToEnTerm(response);
    case "SENTENCE_TRANSLATION":
      return mapSentenceTranslation(response);
  }
}
```

- [ ] **Step 4: Verify shared result normalization**

Run: `npm run test -- src/modules/query/model/entry-result-mapper.test.ts`
Expected: PASS with all three payload variants mapped into one renderer-friendly contract

- [ ] **Step 5: Commit result normalization**

```bash
git add src/modules/query/model/entry-response.ts src/modules/query/model/entry-result-view-model.ts src/modules/query/model/entry-result-mapper.ts src/modules/query/model/__fixtures__/entry-responses.ts src/modules/query/model/entry-result-mapper.test.ts
git commit -m "feat: normalize entry responses for rendering"
```

### Task 5: Implement the Query Workspace and Refresh Flow

**Files:**
- Create: `src/modules/query/api/fetch-entry.ts`
- Create: `src/modules/query/api/refresh-entry.ts`
- Create: `src/modules/query/model/query-store.ts`
- Create: `src/modules/query/ui/query-toolbar.tsx`
- Create: `src/modules/query/ui/result-switch.tsx`
- Create: `src/modules/query/ui/english-word-card.tsx`
- Create: `src/modules/query/ui/zh-to-en-term-card.tsx`
- Create: `src/modules/query/ui/sentence-translation-card.tsx`
- Modify: `src/modules/query/screens/workspace-screen.tsx`
- Create: `src/modules/query/ui/workspace-screen.test.tsx`
- Test: `src/modules/query/ui/workspace-screen.test.tsx`

- [ ] **Step 1: Write a failing workspace test for search and forced refresh**

```tsx
it("submits a query and renders the mapped result", async () => {
  render(<WorkspaceScreen />);
  await userEvent.type(screen.getByLabelText("搜索内容"), "phenomenon");
  await userEvent.click(screen.getByRole("button", { name: "查询" }));
  expect(await screen.findByText("The northern lights are a natural phenomenon.")).toBeInTheDocument();
});

it("refreshes the current query with the refresh endpoint", async () => {
  render(<WorkspaceScreen />);
  await userEvent.type(screen.getByLabelText("搜索内容"), "visible");
  await userEvent.click(screen.getByRole("button", { name: "查询" }));
  await userEvent.click(await screen.findByRole("button", { name: "强制刷新" }));
  expect(await screen.findByText("已从服务端刷新")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the workspace test and confirm it fails**

Run: `npm run test -- src/modules/query/ui/workspace-screen.test.tsx`
Expected: FAIL because query API calls, stores, and result renderers are not implemented

- [ ] **Step 3: Implement query API hooks, toolbar, renderer switch, and refresh behavior**

```ts
// src/modules/query/api/fetch-entry.ts
export async function fetchEntry(params: QueryParams, settings: SettingsValues) {
  const client = createHttpClient(settings);
  const { data } = await client.get<EntryQueryResponse>("/api/v1/entries", { params });
  return mapEntryResponse(data);
}
```

```tsx
// src/modules/query/ui/result-switch.tsx
export function ResultSwitch({ result }: { result: EntryResultViewModel }) {
  switch (result.kind) {
    case "english-word":
      return <EnglishWordCard result={result} />;
    case "zh-to-en-term":
      return <ZhToEnTermCard result={result} />;
    case "sentence-translation":
      return <SentenceTranslationCard result={result} />;
  }
}
```

- [ ] **Step 4: Verify live query and refresh behavior**

Run: `npm run test -- src/modules/query/ui/workspace-screen.test.tsx`
Expected: PASS with search and refresh flows both green

Run: `npm run build`
Expected: PASS with the workspace route rendering real query UI

- [ ] **Step 5: Commit query workspace support**

```bash
git add src/modules/query/api/fetch-entry.ts src/modules/query/api/refresh-entry.ts src/modules/query/model/query-store.ts src/modules/query/ui/query-toolbar.tsx src/modules/query/ui/result-switch.tsx src/modules/query/ui/english-word-card.tsx src/modules/query/ui/zh-to-en-term-card.tsx src/modules/query/ui/sentence-translation-card.tsx src/modules/query/screens/workspace-screen.tsx src/modules/query/ui/workspace-screen.test.tsx
git commit -m "feat: add unified query workspace"
```

### Task 6: Add Audio Polling and Playback States

**Files:**
- Create: `src/modules/audio/api/fetch-audio.ts`
- Create: `src/modules/audio/model/audio-store.ts`
- Create: `src/modules/audio/model/audio-controller.ts`
- Create: `src/modules/audio/model/audio-controller.test.ts`
- Create: `src/modules/audio/ui/audio-button.tsx`
- Modify: `src/modules/query/ui/english-word-card.tsx`
- Modify: `src/modules/query/ui/zh-to-en-term-card.tsx`
- Test: `src/modules/audio/model/audio-controller.test.ts`

- [ ] **Step 1: Write a failing test for `202 Accepted` polling and `404` stop behavior**

```ts
it("keeps polling when the backend reports audio is still generating", async () => {
  vi.useFakeTimers();
  const fetchAudio = vi
    .fn()
    .mockResolvedValueOnce({ status: 202 })
    .mockResolvedValueOnce({ status: 202 })
    .mockResolvedValueOnce({ status: 200, blob: new Blob(["audio"]) });

  const controller = createAudioController(fetchAudio);
  const playback = controller.play("/api/v1/audio/by-key/english_word%3Aheadword%3Avisible");

  await vi.runAllTimersAsync();
  await expect(playback).resolves.toMatchObject({ status: "ready" });
  expect(fetchAudio).toHaveBeenCalledTimes(3);
});
```

- [ ] **Step 2: Run the audio controller test and confirm it fails**

Run: `npm run test -- src/modules/audio/model/audio-controller.test.ts`
Expected: FAIL because the audio fetcher and polling controller do not exist yet

- [ ] **Step 3: Implement binary audio fetch, polling state machine, and audio buttons**

```ts
// src/modules/audio/model/audio-controller.ts
export async function pollAudio(fetchAudio: FetchAudio, audioUrl: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await fetchAudio(audioUrl);
    if (response.status === 200) return response;
    if (response.status === 404) return { status: "missing" } as const;
    await delay(1500);
  }
  return { status: "timeout" } as const;
}
```

- [ ] **Step 4: Verify audio state handling**

Run: `npm run test -- src/modules/audio/model/audio-controller.test.ts`
Expected: PASS with polling, missing-audio, and timeout branches covered

Run: `npm run build`
Expected: PASS with audio buttons rendered in query result cards

- [ ] **Step 5: Commit audio support**

```bash
git add src/modules/audio/api/fetch-audio.ts src/modules/audio/model/audio-store.ts src/modules/audio/model/audio-controller.ts src/modules/audio/model/audio-controller.test.ts src/modules/audio/ui/audio-button.tsx src/modules/query/ui/english-word-card.tsx src/modules/query/ui/zh-to-en-term-card.tsx
git commit -m "feat: add audio polling and playback states"
```

### Task 7: Add the Recent Searches Workspace Panel

**Files:**
- Create: `src/modules/recent-searches/api/fetch-recent-searches.ts`
- Create: `src/modules/recent-searches/ui/recent-searches-panel.tsx`
- Create: `src/modules/recent-searches/ui/recent-searches-panel.test.tsx`
- Modify: `src/modules/query/screens/workspace-screen.tsx`
- Test: `src/modules/recent-searches/ui/recent-searches-panel.test.tsx`

- [ ] **Step 1: Write a failing test for loading and reopening recent searches**

```tsx
it("loads recent searches and replays one back into the workspace", async () => {
  render(<WorkspaceScreen />);
  expect(await screen.findByText("visible")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "打开最近搜索 visible" }));
  expect(screen.getByDisplayValue("visible")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the recent searches test and confirm it fails**

Run: `npm run test -- src/modules/recent-searches/ui/recent-searches-panel.test.tsx`
Expected: FAIL because the panel and query-store integration do not exist yet

- [ ] **Step 3: Implement the panel and wire it into the workspace state**

```tsx
// src/modules/recent-searches/ui/recent-searches-panel.tsx
export function RecentSearchesPanel() {
  const { data = [] } = useRecentSearchesQuery();
  const reopen = useQueryStore((state) => state.reopenRecentSearch);

  return data.map((item) => (
    <button key={`${item.query}-${item.searchTime}`} onClick={() => reopen(item.query, item.resultType)}>
      {item.query}
    </button>
  ));
}
```

- [ ] **Step 4: Verify recent search replay**

Run: `npm run test -- src/modules/recent-searches/ui/recent-searches-panel.test.tsx`
Expected: PASS with the clicked recent search restoring query input state

- [ ] **Step 5: Commit recent searches support**

```bash
git add src/modules/recent-searches/api/fetch-recent-searches.ts src/modules/recent-searches/ui/recent-searches-panel.tsx src/modules/recent-searches/ui/recent-searches-panel.test.tsx src/modules/query/screens/workspace-screen.tsx
git commit -m "feat: add recent searches panel"
```

### Task 8: Implement History Listing and Result Restoration

**Files:**
- Create: `src/modules/history/api/fetch-history-page.ts`
- Create: `src/modules/history/api/fetch-history-detail.ts`
- Create: `src/modules/history/model/history-response.parser.ts`
- Create: `src/modules/history/model/history-response.parser.test.ts`
- Create: `src/modules/history/ui/history-list.tsx`
- Modify: `src/modules/history/screens/history-screen.tsx`
- Create: `src/modules/history/ui/history-screen.test.tsx`
- Test: `src/modules/history/model/history-response.parser.test.ts`
- Test: `src/modules/history/ui/history-screen.test.tsx`

- [ ] **Step 1: Write failing tests for history JSON parsing and detail restore**

```ts
it("parses stored history JSON into the shared entry result model", () => {
  const result = parseHistoryResponseJson(historyDetailFixture.responseJson);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.kind).toBe("sentence-translation");
    expect(result.value.translatedSentence).toBe("How are you today?");
  }
});

it("returns a recoverable error result for invalid history JSON", () => {
  const result = parseHistoryResponseJson("{bad json");
  expect(result).toEqual({
    ok: false,
    reason: "history-parse-failed",
  });
});
```

```tsx
it("opens history details and restores the stored result", async () => {
  render(<HistoryScreen />);
  await userEvent.click(await screen.findByRole("button", { name: "打开历史记录 hello" }));
  expect(await screen.findByText("How are you today?")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the history tests and confirm they fail**

Run: `npm run test -- src/modules/history/model/history-response.parser.test.ts src/modules/history/ui/history-screen.test.tsx`
Expected: FAIL because the parser, list, and detail fetch are not implemented

- [ ] **Step 3: Implement paginated history, detail fetch, and restore-through-shared-renderer**

```ts
// src/modules/history/model/history-response.parser.ts
export function parseHistoryResponseJson(responseJson: string) {
  try {
    const parsed = JSON.parse(responseJson) as EntryQueryResponse;
    return { ok: true, value: mapEntryResponse(parsed) } as const;
  } catch {
    return { ok: false, reason: "history-parse-failed" } as const;
  }
}
```

```tsx
// src/modules/history/screens/history-screen.tsx
const openHistory = async (id: number) => {
  const detail = await fetchHistoryDetail(id, settings);
  const restored = parseHistoryResponseJson(detail.responseJson);

  if (!restored.ok) {
    setRecoverableError("无法恢复该条历史记录，请稍后重新查询。");
    return;
  }

  setActiveResult(restored.value);
  clearRecoverableError();
  navigate("/");
};
```

- [ ] **Step 4: Verify history browse and restore behavior**

Run: `npm run test -- src/modules/history/model/history-response.parser.test.ts src/modules/history/ui/history-screen.test.tsx`
Expected: PASS with summary listing, restoration into the shared workspace renderer, and invalid JSON handled without crashing the app

- [ ] **Step 5: Commit history support**

```bash
git add src/modules/history/api/fetch-history-page.ts src/modules/history/api/fetch-history-detail.ts src/modules/history/model/history-response.parser.ts src/modules/history/model/history-response.parser.test.ts src/modules/history/ui/history-list.tsx src/modules/history/screens/history-screen.tsx src/modules/history/ui/history-screen.test.tsx
git commit -m "feat: add history browsing and restore"
```

### Task 9: Implement Wordbook Listing, Detail, and CRUD

**Files:**
- Create: `src/modules/wordbooks/api/fetch-wordbooks.ts`
- Create: `src/modules/wordbooks/api/fetch-wordbook-words.ts`
- Create: `src/modules/wordbooks/api/mutate-wordbooks.ts`
- Create: `src/modules/wordbooks/api/mutate-wordbook-words.ts`
- Create: `src/modules/wordbooks/api/find-containing-wordbooks.ts`
- Create: `src/modules/wordbooks/model/wordbook.types.ts`
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.tsx`
- Create: `src/modules/wordbooks/ui/wordbook-detail-pane.tsx`
- Create: `src/modules/wordbooks/ui/wordbook-editor-dialog.tsx`
- Create: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
- Test: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`

- [ ] **Step 1: Write a failing test for loading, creating, and opening a wordbook**

```tsx
it("creates a new wordbook and opens its detail pane", async () => {
  render(<WordbooksScreen />);
  await userEvent.click(screen.getByRole("button", { name: "新建单词本" }));
  await userEvent.type(screen.getByLabelText("单词本名称"), "考试词汇");
  await userEvent.click(screen.getByRole("button", { name: "保存单词本" }));
  expect(await screen.findByRole("heading", { name: "考试词汇" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the wordbooks screen test and confirm it fails**

Run: `npm run test -- src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
Expected: FAIL because wordbook APIs, dialogs, and detail rendering are not implemented

- [ ] **Step 3: Implement wordbook APIs, screen layout, and CRUD dialogs**

```ts
// src/modules/wordbooks/api/mutate-wordbooks.ts
export async function createWordbook(name: string, settings: SettingsValues) {
  const client = createHttpClient(settings);
  const { data } = await client.post<Wordbook>("/api/v1/wordbooks", null, { params: { name } });
  return data;
}
```

```tsx
// src/modules/wordbooks/ui/wordbook-detail-pane.tsx
export function WordbookDetailPane({ selectedWordbookId }: Props) {
  const { data = [] } = useWordbookWordsQuery(selectedWordbookId);
  return <ul>{data.map((item) => <li key={item.word}>{item.word}</li>)}</ul>;
}
```

- [ ] **Step 4: Verify wordbook CRUD and detail rendering**

Run: `npm run test -- src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
Expected: PASS with creation flow and detail view rendered correctly

- [ ] **Step 5: Commit core wordbook management**

```bash
git add src/modules/wordbooks/api/fetch-wordbooks.ts src/modules/wordbooks/api/fetch-wordbook-words.ts src/modules/wordbooks/api/mutate-wordbooks.ts src/modules/wordbooks/api/mutate-wordbook-words.ts src/modules/wordbooks/api/find-containing-wordbooks.ts src/modules/wordbooks/model/wordbook.types.ts src/modules/wordbooks/ui/wordbooks-screen.tsx src/modules/wordbooks/ui/wordbook-detail-pane.tsx src/modules/wordbooks/ui/wordbook-editor-dialog.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx
git commit -m "feat: add wordbook management screens"
```

### Task 10: Add “Save to Wordbook” Actions from Query Results

**Files:**
- Create: `src/modules/wordbooks/ui/add-to-wordbook-dialog.tsx`
- Create: `src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`
- Modify: `src/modules/query/ui/english-word-card.tsx`
- Modify: `src/modules/query/ui/zh-to-en-term-card.tsx`
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`
- Test: `src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`

- [ ] **Step 1: Write a failing test for adding the current headword to a selected wordbook**

```tsx
it("adds the current result word to a selected wordbook", async () => {
  render(<EnglishWordCard result={englishWordViewModel} />);
  await userEvent.click(screen.getByRole("button", { name: "加入单词本" }));
  await userEvent.click(await screen.findByRole("option", { name: "考试词汇" }));
  await userEvent.click(screen.getByRole("button", { name: "确认加入" }));
  expect(await screen.findByText("已加入 考试词汇")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the add-to-wordbook test and confirm it fails**

Run: `npm run test -- src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx`
Expected: FAIL because the dialog and result-card integration are not implemented

- [ ] **Step 3: Implement the dialog and wire query cards to the wordbook mutations**

```tsx
// src/modules/wordbooks/ui/add-to-wordbook-dialog.tsx
export function AddToWordbookDialog({ word }: { word: string }) {
  const { data = [] } = useWordbooksQuery();
  const mutation = useAddWordsToWordbookMutation();
  // render selectable list of wordbooks and call mutation([word])
}
```

- [ ] **Step 4: Verify query-to-wordbook integration**

Run: `npm run test -- src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx src/modules/query/ui/workspace-screen.test.tsx`
Expected: PASS with wordbook mutations available from the query results

- [ ] **Step 5: Commit query result save actions**

```bash
git add src/modules/wordbooks/ui/add-to-wordbook-dialog.tsx src/modules/wordbooks/ui/add-to-wordbook-dialog.test.tsx src/modules/query/ui/english-word-card.tsx src/modules/query/ui/zh-to-en-term-card.tsx src/modules/query/ui/workspace-screen.test.tsx
git commit -m "feat: add save-to-wordbook actions"
```

### Task 11: Implement Tray Behavior and Close-Preference Persistence

**Files:**
- Create: `src/modules/desktop-shell/model/close-behavior.ts`
- Create: `src/modules/desktop-shell/model/close-behavior.test.ts`
- Create: `src/modules/desktop-shell/ui/close-behavior-dialog.tsx`
- Modify: `src/modules/settings/model/settings.store.ts`
- Modify: `src/app/app.tsx`
- Modify: `src-tauri/src/main.rs`
- Create: `src-tauri/src/tray.rs`
- Create: `src-tauri/src/window_policy.rs`
- Modify: `src-tauri/tauri.conf.json`
- Create: `docs/manual-smoke-checklist.md`
- Test: `src/modules/desktop-shell/model/close-behavior.test.ts`

- [ ] **Step 1: Write a failing test for first-close prompting and remembered behavior**

```ts
it("defaults to asking on first close and stores later selections", () => {
  expect(resolveCloseBehavior(undefined)).toBe("ask");
  expect(resolveCloseBehavior("tray")).toBe("tray");
  expect(resolveCloseBehavior("exit")).toBe("exit");
});
```

- [ ] **Step 2: Run the close-behavior test and confirm it fails**

Run: `npm run test -- src/modules/desktop-shell/model/close-behavior.test.ts`
Expected: FAIL because close behavior helpers and dialog flow do not exist

- [ ] **Step 3: Implement the frontend dialog and Tauri tray/window policy commands**

```rust
// src-tauri/src/window_policy.rs
#[tauri::command]
fn hide_to_tray(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|error| error.to_string())
}
```

```tsx
// src/modules/desktop-shell/ui/close-behavior-dialog.tsx
export function CloseBehaviorDialog({ onChoose }: { onChoose: (value: "tray" | "exit") => void }) {
  return (
    <div role="dialog" aria-label="关闭应用方式">
      <button onClick={() => onChoose("tray")}>最小化到托盘</button>
      <button onClick={() => onChoose("exit")}>直接退出</button>
    </div>
  );
}
```

- [ ] **Step 4: Verify frontend logic and shell build health**

Run: `npm run test -- src/modules/desktop-shell/model/close-behavior.test.ts`
Expected: PASS with close-policy resolution covered

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS with tray menu and close handling compiled

Run: `npm run build`
Expected: PASS with dialog wiring and no broken imports

- [ ] **Step 5: Write the manual smoke checklist for tray behavior**

```md
1. Start `npm run tauri:dev`.
2. Close the main window and confirm the choice dialog appears on first close.
3. Choose "最小化到托盘" and verify the app hides but the tray icon remains.
4. Reopen from tray and confirm state is preserved.
5. Use the tray exit action and confirm the process exits fully.
```

- [ ] **Step 6: Commit desktop shell behavior**

```bash
git add src/modules/desktop-shell/model/close-behavior.ts src/modules/desktop-shell/model/close-behavior.test.ts src/modules/desktop-shell/ui/close-behavior-dialog.tsx src/modules/settings/model/settings.store.ts src/app/app.tsx src-tauri/src/main.rs src-tauri/src/tray.rs src-tauri/src/window_policy.rs src-tauri/tauri.conf.json docs/manual-smoke-checklist.md
git commit -m "feat: add tray behavior and close policy"
```

### Task 12: Add Browser Smoke Tests and Developer Documentation

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/settings-and-query.spec.ts`
- Create: `tests/e2e/history-and-wordbooks.spec.ts`
- Modify: `README.md`
- Test: `tests/e2e/settings-and-query.spec.ts`
- Test: `tests/e2e/history-and-wordbooks.spec.ts`

- [ ] **Step 1: Write failing browser smoke tests for settings, query, history, and wordbooks**

```ts
test("saves settings and runs a successful query", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("服务地址").fill("http://127.0.0.1:8080");
  await page.getByLabel("用户名").fill("tester");
  await page.getByLabel("密码").fill("secret-123");
  await page.getByRole("button", { name: "测试连接" }).click();
  await expect(page.getByText("连接成功")).toBeVisible();
  await page.getByLabel("搜索内容").fill("phenomenon");
  await page.getByRole("button", { name: "查询" }).click();
  await expect(page.getByText("The northern lights are a natural phenomenon.")).toBeVisible();
});

test("shows an actionable error for bad credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("服务地址").fill("http://127.0.0.1:8080");
  await page.getByLabel("用户名").fill("tester");
  await page.getByLabel("密码").fill("wrong-password");
  await page.getByRole("button", { name: "测试连接" }).click();
  await expect(page.getByText("认证失败，请检查用户名和密码")).toBeVisible();
});
```

- [ ] **Step 2: Run the browser tests and confirm they fail**

Run: `npm run test:e2e -- tests/e2e/settings-and-query.spec.ts`
Expected: FAIL because Playwright config, request mocking, and failure-path fixtures do not exist yet

- [ ] **Step 3: Implement Playwright config, request mocking for success and auth failure, and setup docs**

```ts
// playwright.config.ts
export default defineConfig({
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:1420",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://127.0.0.1:1420",
  },
});
```

```md
## Local Development

1. Install Node.js and Rust.
2. Run `npm install`.
3. Run `npm run tauri:dev`.
4. Configure the DicServer base URL and Basic Auth credentials in Settings.
```

- [ ] **Step 4: Verify smoke tests and final build health**

Run: `npm run test:e2e -- tests/e2e/settings-and-query.spec.ts tests/e2e/history-and-wordbooks.spec.ts`
Expected: PASS with browser-level smoke coverage over the main feature flows

Run: `npm run test`
Expected: PASS with all unit and component tests green

Run: `npm run build`
Expected: PASS for the web bundle

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS for the Rust shell

- [ ] **Step 5: Commit the final verification layer and docs**

```bash
git add playwright.config.ts tests/e2e/settings-and-query.spec.ts tests/e2e/history-and-wordbooks.spec.ts README.md
git commit -m "test: add smoke coverage and developer docs"
```

## Final Verification Checklist

- [ ] Run `npm run test`
- [ ] Run `npm run test:e2e -- tests/e2e/settings-and-query.spec.ts tests/e2e/history-and-wordbooks.spec.ts`
- [ ] Run `npm run build`
- [ ] Run `cargo check --manifest-path src-tauri/Cargo.toml`
- [ ] Run the tray workflow in `docs/manual-smoke-checklist.md`
- [ ] Build a Windows package with `npm run tauri:build`
- [ ] Confirm the packaged app launches, saves settings, queries the backend, and reopens from tray correctly
