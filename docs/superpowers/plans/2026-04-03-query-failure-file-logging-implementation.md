# Query Failure File Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist main word-query failure diagnostics to a desktop log file so machine-specific lookup failures can be investigated without exposing raw diagnostics in the query UI.

**Architecture:** The React query screen remains the only place that decides whether a lookup failed. When the main `/api/v1/entries` request fails or its response mapping throws, the screen captures the active query, sanitized settings, and the in-memory HTTP diagnostics snapshot, then forwards one JSON payload to a narrow Tauri command that appends JSONL records under the app data directory. Audio fetches stay on their current path and never trigger this logger.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, Vitest, Tauri 2, Rust

---

## File Structure

### Files to create
- `src/modules/query/api/query-failure-log.ts` — desktop-safe helper that forwards one sanitized failure payload to Tauri and swallows logging errors
- `src-tauri/src/query_failure_log.rs` — append-only JSONL writer and small Rust unit tests

### Files to modify
- `src/modules/query/screens/workspace-screen.tsx` — trigger logging once per failed request id
- `src/modules/query/ui/workspace-screen.test.tsx` — verify failure logging behavior and that non-failures do not log
- `src-tauri/src/main.rs` — register the new Tauri command
- `src-tauri/Cargo.toml` — add `serde` and `serde_json`

## Task 1: Write failing tests for query failure logging

**Files:**
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`

- [ ] Add a mocked `recordEntryQueryFailure` module and assert it is called once when the main entry query fails.
- [ ] Add a success-path assertion that no log is recorded when `/api/v1/entries` succeeds.
- [ ] Add an audio-path assertion that clicking an audio button with a `202` generation response does not record a query failure.
- [ ] Run `npm run test -- src/modules/query/ui/workspace-screen.test.tsx` and confirm the new expectations fail before implementation.

## Task 2: Implement the frontend logger and query hook

**Files:**
- Create: `src/modules/query/api/query-failure-log.ts`
- Modify: `src/modules/query/screens/workspace-screen.tsx`

- [ ] Add a helper that captures the current timestamp, active query metadata, base URL, timeout, sanitized error fields, and `getHttpDiagnosticsSnapshot()`, then calls `invoke("append_query_failure_log", ...)` only in Tauri.
- [ ] In the workspace screen, log only when `entryQuery.error` is present and the active request id has not already been logged.
- [ ] Keep UI behavior unchanged: timeouts still show the friendly message, and audio-generation states still do not affect the query failure banner.

## Task 3: Implement the Tauri file logger

**Files:**
- Create: `src-tauri/src/query_failure_log.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] Add a typed Tauri command that creates `<app data>/logs/query-failures.jsonl` if needed and appends one JSON line per call.
- [ ] Return the resolved log path from the command for easier diagnostics and testability.
- [ ] Add Rust unit coverage for the append helper so repeated writes keep valid JSONL output.

## Task 4: Verify and commit

**Files:**
- Verify only

- [ ] Run `npm run test -- src/modules/query/ui/workspace-screen.test.tsx src/modules/audio/ui/audio-button.test.tsx`.
- [ ] Run a targeted Rust test command for `src-tauri`.
- [ ] Review the diff to confirm no passwords or HTTP auth headers are logged.
- [ ] Commit the tracked changes with `git commit -m "fix: log query failures to file"`.
