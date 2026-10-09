# Playwright E2E Environment Debugging Notes

Date: 2026-03-29
Status: Captured after investigation and partial hardening
Target: Playwright + Vite local e2e startup path
Scope: Record what was confirmed during the e2e environment investigation, which repo-side issues were fixed, and which failures still depend on the current execution environment.

## 1. Overview

The original symptom looked like a UI or test-selector problem:

- history and wordbook e2e cases could not find static navigation links such as `历史`
- some retries failed at `page.goto("/")` with `net::ERR_ABORTED; maybe frame was detached?`

The investigation showed that the app shell often never finished booting in Playwright. This was not initially a query-history bug. It was a dev-server startup and environment problem with multiple overlapping causes.

## 2. Confirmed Repo-Side Issues

### 2.1 Playwright webServer used a hard-coded lowercase project path

`playwright.config.ts` used:

- `/mnt/c/myspace/workspace/desktopapp/codict`

The actual repository path is:

- `/mnt/c/MySpace/Workspace/DesktopApp/CoDict`

On this stack, path casing matters enough to make the startup path unreliable. The config now derives the repository root from `import.meta.url` instead of hard-coding it.

### 2.2 Playwright reused any existing server by default

The previous config had:

- `reuseExistingServer: !process.env.CI`

That made local runs vulnerable to silently connecting to whatever was already listening on port `3000`. When that happened, Playwright could appear to start correctly while actually talking to the wrong process.

The config now defaults to:

- no reuse unless `PLAYWRIGHT_REUSE_EXISTING_SERVER=1` or `true`

### 2.3 E2E shared the same port as normal local dev

The previous Playwright config reused the normal dev-server port (`3000`). That created two problems:

- collisions with an existing local dev server
- misleading startup behavior when reuse was enabled

Playwright now uses a dedicated e2e dev-server option set with a separate default port:

- `4173`

### 2.4 E2E startup needed dependency pre-bundling before serving

During trace inspection, the root HTML returned `200`, but many subsequent module requests returned `status: -1`, including:

- `/node_modules/.vite/deps/react.js`
- `/node_modules/.vite/deps/react-dom_client.js`
- `/src/app/providers/app-providers.tsx`
- `/src/app/router.tsx`

This pointed to an unstable Vite dependency-prebundle phase rather than a selector issue.

To reduce this startup race, Playwright now starts a dedicated wrapper script that does:

1. `vite optimize`
2. then launches the Vite dev server

It intentionally avoids `--force` so local e2e runs can reuse the dependency cache instead of invalidating it on every run.

### 2.5 Vite cache should not depend on the workspace-local `.vite` directory

The workspace-local `node_modules/.vite` repeatedly accumulated only `deps_temp_*` folders during debugging, which matched the broken module-loading symptoms.

The Vite config now moves `cacheDir` to:

- `/tmp/codict-vite-cache/node_modules/.vite`

This avoids relying on the workspace-local dependency cache during Playwright startup while keeping optimized dependency files under a `node_modules` path. That path shape matters because `@vitejs/plugin-react` skips `/node_modules/`; placing optimized deps directly under `/tmp/codict-vite-cache/deps` caused Babel/React Refresh to treat them like source files.

### 2.6 E2E performs a browser warmup before test cases

On the `/mnt/c` workspace mount, a cold Vite/Tailwind first render can exceed the default 30 second Playwright test timeout even after the root HTML returns `200`.

Playwright now uses `tests/e2e/global-setup.ts` to open the app once and wait for the main navigation before any test cases start. This moves cold module transformation into setup instead of charging it to the first assertion-heavy test.

## 3. Investigation Evidence

### 3.1 Trace evidence

The most useful trace pattern was:

- `/` returned `200`
- Vite client connected
- `/src/main.tsx` and `/src/app/app.tsx` eventually loaded
- many later module requests ended with `status: -1`

That means the app shell was not actually rendering. Missing nav links were only a downstream symptom.

### 3.2 `CI=1` made one failure mode explicit

Running Playwright with `CI=1` disabled server reuse and produced:

- `Process from config.webServer was not able to start. Exit code: 1`

This helped separate:

- repo-side startup/config problems
- from page-level test assertions

### 3.3 Direct Vite optimize succeeded quickly

During the original investigation, running:

- `node node_modules/vite/bin/vite.js optimize --force`

completed quickly and showed that dependency pre-bundling itself was viable when run directly, which justified moving it into the e2e startup wrapper. The wrapper now uses non-forced `vite optimize` so it can reuse a valid cache on repeated local runs.

### 3.4 Current sandbox still adds a separate environment blocker

In this session, directly starting the e2e Vite server can fail with:

- `listen EPERM: operation not permitted 127.0.0.1:4173`

That is not a normal repo bug. It is a property of the current execution environment. It means a failing e2e run inside this sandbox cannot be treated as proof that the remaining application code is broken.

## 4. Resulting Changes

The investigation produced these repository changes:

- `playwright.config.ts`
  - derive repo root dynamically
  - default to non-reused webServer
  - switch Playwright to dedicated e2e server options
- `scripts/dev-server-config.js`
  - add dedicated Playwright dev-server option resolution
  - add dedicated e2e startup command builder
- `scripts/run-vite-e2e.js`
  - prebundle dependencies without forcing cache invalidation, then start Vite
- `vite.config.ts`
  - move Vite cache into `/tmp/codict-vite-cache/node_modules/.vite`
- `tests/e2e/global-setup.ts`
  - warm the Vite-served app in Chrome before running e2e test cases
- `playwright.config.test.ts`
  - regression tests for the config expectations above

## 5. What Was Verified

Verified in this session:

- `npm run test -- playwright.config.test.ts`
- `npm run build`

Not fully verified in this session:

- complete Playwright e2e recovery inside the current sandbox

Reason:

- the sandbox can reject local port binding with `EPERM`, which prevents a clean end-to-end confirmation of the local dev server path

## 6. Practical Lessons

### 6.1 Do not trust `GET /` as proof that Vite is truly ready

The root HTML can return `200` while dependency-prebundled module requests still fail.

### 6.2 Disable `reuseExistingServer` unless it is explicitly needed

Implicit reuse makes local debugging ambiguous and can hide the real startup state.

### 6.3 Keep e2e dev-server ports separate from normal local dev ports

This makes collisions obvious instead of silent.

### 6.4 Separate repo bugs from environment restrictions early

Two different classes of problems were present at once:

- repository startup/config issues
- sandbox-level port binding restrictions

They must be diagnosed separately, or the investigation becomes noisy and misleading.

### 6.5 Add configuration regression tests for debugging fixes

The final changes were small, but easy to regress:

- wrong cwd
- accidental server reuse
- wrong e2e command or port

These are now covered by `playwright.config.test.ts`.

## 7. Recommended Next Step Outside This Sandbox

Run the following on a normal local shell where port binding is allowed:

1. `node ./scripts/run-vite-e2e.js --host 127.0.0.1 --port 4173`
2. `npm run test:e2e -- tests/e2e/history-and-wordbooks.spec.ts -g "reopens a deduplicated history summary in the workspace"`

If e2e still fails there, the next trace will be much cleaner because:

- it will use the right repo root
- it will not silently reuse an unrelated server
- it will start from a pre-optimized dependency cache on a dedicated port
