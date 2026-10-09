# Lexora UI Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app’s product-facing UI copy with the approved Lexora branding and shorter, more natural labels without changing layout or behavior.

**Architecture:** This is a narrow copy-only pass across existing React screens and their literal-string tests. The implementation updates only visible labels, headings, descriptions, and status text in the current UI, then aligns test assertions to the new wording. No component structure, routing, state, or API behavior should change.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, Vitest, Testing Library, MSW

---

## File Structure

### Files to modify
- `src/app/layouts/app-shell.tsx` — sidebar brand block and navigation labels
- `src/modules/query/screens/workspace-screen.tsx` — lookup page title, helper copy, result/status labels
- `src/modules/history/screens/history-screen.tsx` — history page title, helper copy, card headings, error/status text
- `src/modules/wordbooks/ui/wordbooks-screen.tsx` — wordbooks page helper copy, left-pane title/description, status text
- `src/modules/settings/screens/settings-screen.tsx` — settings description and loading text
- `src/app/router.test.tsx` — navigation and default-page heading assertions
- `src/modules/query/ui/workspace-screen.test.tsx` — page heading and status/result text assertions
- `src/modules/history/ui/history-screen.test.tsx` — reopened-page heading assertion
- `src/modules/settings/ui/settings-screen.test.tsx` — loading-text assertion
- `src/modules/wordbooks/ui/wordbooks-screen.test.tsx` — no required copy changes expected, but verify existing assertions still hold after the text pass

### Files to verify but likely not modify
- `docs/superpowers/specs/2026-03-28-lexora-ui-copy-design.md` — approved copy source of truth

## Task 1: Update sidebar brand and navigation copy

**Files:**
- Modify: `src/app/layouts/app-shell.tsx`
- Test: `src/app/router.test.tsx`

- [ ] **Step 1: Write the failing router test expectations**

Update the existing test in `src/app/router.test.tsx` to assert the approved visible copy:

```tsx
expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "查词" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "历史" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "单词本" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "设置" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "查词" })).toBeInTheDocument();
expect(screen.getByText("Lexora")).toBeInTheDocument();
```

- [ ] **Step 2: Run the router test to verify it fails**

Run: `npm run test -- src/app/router.test.tsx`
Expected: FAIL because the UI still renders `CoDict`, `查询工作台`, and `历史记录`.

- [ ] **Step 3: Update the sidebar brand and nav labels in `src/app/layouts/app-shell.tsx`**

Apply this minimal text-only change:

```tsx
const navItems = [
  { to: "/", label: "查词", icon: Search, end: true },
  { to: "/history", label: "历史", icon: History },
  { to: "/wordbooks", label: "单词本", icon: BookMarked },
  { to: "/settings", label: "设置", icon: Settings },
];
```

Replace the brand block text with:

```tsx
<div className="min-w-0">
  <p className="truncate text-base font-semibold tracking-[0.18em] text-[hsl(var(--foreground))]">
    Lexora
  </p>
</div>
```

Delete the subtitle line entirely. Do not add a replacement subtitle.

- [ ] **Step 4: Run the router test to verify it passes**

Run: `npm run test -- src/app/router.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the sidebar/nav copy update**

```bash
git add src/app/layouts/app-shell.tsx src/app/router.test.tsx
git commit -m "refactor: update sidebar branding and nav copy"
```

## Task 2: Update lookup screen copy

**Files:**
- Modify: `src/modules/query/screens/workspace-screen.tsx`
- Test: `src/modules/query/ui/workspace-screen.test.tsx`

- [ ] **Step 1: Update lookup-screen tests to the new copy**

Adjust literal-string assertions in `src/modules/query/ui/workspace-screen.test.tsx`.

Replace the result-heading and refresh-feedback expectations with:

```tsx
expect(await screen.findByRole("heading", { name: "查询结果" })).toBeInTheDocument();
expect(await screen.findByText("已从服务端刷新")).toBeInTheDocument();
```

with:

```tsx
expect(await screen.findByRole("heading", { name: "查询结果" })).toBeInTheDocument();
expect(await screen.findByText("结果已更新")).toBeInTheDocument();
```

Update any heading assertions that still expect `查询工作台` to instead expect `查词`.

- [ ] **Step 2: Run the lookup-screen test file and verify it fails**

Run: `npm run test -- src/modules/query/ui/workspace-screen.test.tsx`
Expected: FAIL on the old heading and refresh-success text.

- [ ] **Step 3: Update `src/modules/query/screens/workspace-screen.tsx` with the approved copy**

Make only the approved text replacements:

```tsx
<header className="px-1 pt-1">
  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
    查词
  </h1>
  <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
    输入单词或短语
  </p>
</header>
```

Delete the `Query Workspace` eyebrow label entirely.

Update status/result strings:

```tsx
<StatusView title="正在加载设置" description="正在准备查询配置。" state="loading" />
<StatusView title="请先完成设置" description="填写服务信息后即可开始使用" />
<StatusView title="查询中" description="正在获取结果" state="loading" />
<StatusView title="查询失败" description="请检查连接后重试" state="error" />
```

Update refresh-success and result-summary copy:

```tsx
onSuccess: (nextResult) => {
  setFeedback("结果已更新");
  queryClient.setQueryData(entryQueryKey, nextResult);
},
```

```tsx
<CardTitle className="text-base">查询结果</CardTitle>
```

```tsx
{activeQuery ? `搜索内容：${activeQuery.q}` : `已恢复搜索：${currentResult.query}`}
```

Update the success alert description to:

```tsx
<AlertDescription>结果已更新</AlertDescription>
```

If using both title and description would duplicate the same message awkwardly, keep `AlertTitle` as `结果已更新` and set `AlertDescription` to an empty fragment or a shorter non-redundant line only if required by the component. Do not invent new product copy.

- [ ] **Step 4: Run the lookup-screen tests to verify they pass**

Run: `npm run test -- src/modules/query/ui/workspace-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the lookup-screen copy update**

```bash
git add src/modules/query/screens/workspace-screen.tsx src/modules/query/ui/workspace-screen.test.tsx
git commit -m "refactor: refresh lookup screen copy"
```

## Task 3: Update history screen copy

**Files:**
- Modify: `src/modules/history/screens/history-screen.tsx`
- Test: `src/modules/history/ui/history-screen.test.tsx`

- [ ] **Step 1: Update the history-screen test to expect the new lookup-page heading after reopen**

In `src/modules/history/ui/history-screen.test.tsx`, replace:

```tsx
expect(await screen.findByRole("heading", { name: "查询工作台" })).toBeInTheDocument();
```

with:

```tsx
expect(await screen.findByRole("heading", { name: "查词" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the history-screen test to verify it fails**

Run: `npm run test -- src/modules/history/ui/history-screen.test.tsx`
Expected: FAIL because the workspace heading is still `查询工作台`.

- [ ] **Step 3: Update `src/modules/history/screens/history-screen.tsx` with the approved copy**

Use these exact replacements:

```tsx
<header className="space-y-2">
  <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">历史</h1>
  <p className="text-sm text-[hsl(var(--muted-foreground))]">最近查过的内容</p>
</header>
```

```tsx
if (!query) {
  setRecoverableError("这条记录无法重新打开");
  setOpeningKey(null);
  return;
}
```

```tsx
{!isHydrated ? <StatusView title="正在加载设置" state="loading" /> : null}
```

```tsx
<AlertTitle>无法打开</AlertTitle>
```

```tsx
<CardTitle>最近搜索</CardTitle>
<CardDescription>查看并重新打开之前的搜索</CardDescription>
```

```tsx
{historyQuery.isLoading ? <StatusView title="正在加载历史" state="loading" /> : null}
{historyQuery.error ? <StatusView title="历史加载失败" state="error" /> : null}
```

Do not change pagination, reopen behavior, or any query logic.

- [ ] **Step 4: Run the history-screen tests to verify they pass**

Run: `npm run test -- src/modules/history/ui/history-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the history-screen copy update**

```bash
git add src/modules/history/screens/history-screen.tsx src/modules/history/ui/history-screen.test.tsx
git commit -m "refactor: simplify history screen copy"
```

## Task 4: Update wordbooks screen copy

**Files:**
- Modify: `src/modules/wordbooks/ui/wordbooks-screen.tsx`
- Test: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`

- [ ] **Step 1: Add or adjust wordbooks-screen assertions for the new copy**

If the existing tests do not assert the page helper text, add one focused assertion to `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`:

```tsx
expect(await screen.findByText("收藏并整理你想记住的词")).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "我的单词本" })).toBeInTheDocument();
```

If there is already a better existing test setup in the file, update that one rather than adding a duplicate test.

- [ ] **Step 2: Run the wordbooks-screen test file and verify it fails**

Run: `npm run test -- src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
Expected: FAIL because the current helper text still uses the old wording.

- [ ] **Step 3: Update `src/modules/wordbooks/ui/wordbooks-screen.tsx` with the approved copy**

Apply these exact replacements:

```tsx
<p className="text-sm text-[hsl(var(--muted-foreground))]">
  收藏并整理你想记住的词
</p>
```

```tsx
<CardTitle className="flex items-center gap-2 text-base">
  <BookMarked className="size-4 text-[hsl(var(--muted-foreground))]" aria-hidden="true" />
  我的单词本
</CardTitle>
<CardDescription>选择一个单词本查看内容</CardDescription>
```

```tsx
{wordbooksQuery.isLoading ? <StatusView title="正在加载单词本" state="loading" /> : null}
{wordbooksQuery.error ? <StatusView title="单词本加载失败" state="error" /> : null}
```

```tsx
<AlertTitle>删除失败</AlertTitle>
```

```tsx
<StatusView title="暂无单词本" />
```

Do not change dialog labels like `新建单词本`, `保存单词本`, or `删除单词本` in this task.

- [ ] **Step 4: Run the wordbooks-screen tests to verify they pass**

Run: `npm run test -- src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the wordbooks-screen copy update**

```bash
git add src/modules/wordbooks/ui/wordbooks-screen.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx
git commit -m "refactor: polish wordbook screen copy"
```

## Task 5: Update settings screen copy

**Files:**
- Modify: `src/modules/settings/screens/settings-screen.tsx`
- Test: `src/modules/settings/ui/settings-screen.test.tsx`

- [ ] **Step 1: Update the settings-screen test to the new loading text**

In `src/modules/settings/ui/settings-screen.test.tsx`, replace:

```tsx
expect(screen.getByText("加载设置中...")).toBeInTheDocument();
```

with:

```tsx
expect(screen.getByText("正在加载设置")).toBeInTheDocument();
```

- [ ] **Step 2: Run the settings-screen test to verify it fails**

Run: `npm run test -- src/modules/settings/ui/settings-screen.test.tsx`
Expected: FAIL because the screen still renders `加载设置中...`.

- [ ] **Step 3: Update `src/modules/settings/screens/settings-screen.tsx` with the approved copy**

Make only these text changes:

```tsx
<CardTitle className="text-2xl">设置</CardTitle>
<CardDescription>连接词典服务并调整使用偏好</CardDescription>
```

```tsx
{!isHydrated ? <p className="text-sm text-[hsl(var(--muted-foreground))]">正在加载设置</p> : null}
```

Do not rewrite technical connection-error strings that are already useful for troubleshooting.

- [ ] **Step 4: Run the settings-screen tests to verify they pass**

Run: `npm run test -- src/modules/settings/ui/settings-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the settings-screen copy update**

```bash
git add src/modules/settings/screens/settings-screen.tsx src/modules/settings/ui/settings-screen.test.tsx
git commit -m "refactor: simplify settings screen copy"
```

## Task 6: Run full verification and check for leftover product-facing old copy

**Files:**
- Verify: `src/app/layouts/app-shell.tsx`
- Verify: `src/modules/query/screens/workspace-screen.tsx`
- Verify: `src/modules/history/screens/history-screen.tsx`
- Verify: `src/modules/wordbooks/ui/wordbooks-screen.tsx`
- Verify: `src/modules/settings/screens/settings-screen.tsx`
- Verify: `src/app/router.test.tsx`
- Verify: `src/modules/query/ui/workspace-screen.test.tsx`
- Verify: `src/modules/history/ui/history-screen.test.tsx`
- Verify: `src/modules/settings/ui/settings-screen.test.tsx`
- Verify: `src/modules/wordbooks/ui/wordbooks-screen.test.tsx`

- [ ] **Step 1: Run the targeted test files together**

Run: `npm run test -- src/app/router.test.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/settings/ui/settings-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx`
Expected: PASS

- [ ] **Step 2: Search for leftover product-facing `工作台` usage in the app source**

Run: `rg "工作台|工作区|CoDict|Query Workspace|历史记录" src/app src/modules`
Expected: only intentional leftovers remain, if any. There should be no product-facing `工作台`, `工作区`, `CoDict`, or `Query Workspace` in the updated UI screens.

- [ ] **Step 3: If the search finds test-only or non-product-facing strings, verify them and leave them alone**

Check each remaining hit. Only update it if it is visible product copy or a test assertion that must match visible product copy.

- [ ] **Step 4: Run the full default test suite for confidence**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit the verification pass**

```bash
git add src/app/layouts/app-shell.tsx src/modules/query/screens/workspace-screen.tsx src/modules/history/screens/history-screen.tsx src/modules/wordbooks/ui/wordbooks-screen.tsx src/modules/settings/screens/settings-screen.tsx src/app/router.test.tsx src/modules/query/ui/workspace-screen.test.tsx src/modules/history/ui/history-screen.test.tsx src/modules/settings/ui/settings-screen.test.tsx src/modules/wordbooks/ui/wordbooks-screen.test.tsx
git commit -m "test: verify lexora ui copy refresh"
```

## Spec Coverage Check

- Branding changed from `CoDict` to `Lexora` in the visible app: covered by Task 1.
- Sidebar subtitle removed: covered by Task 1.
- Navigation changed to `查词 / 历史 / 单词本 / 设置`: covered by Task 1.
- Lookup page copy shortened and `工作台 / 工作区` removed: covered by Task 2.
- History page copy shortened and naturalized: covered by Task 3.
- Wordbooks page helper text and status copy shortened: covered by Task 4.
- Settings description simplified while preserving useful diagnostics: covered by Task 5.
- Tests updated and visible old copy searched for: covered by Task 6.

## Placeholder Scan

- No `TODO`, `TBD`, or deferred implementation markers remain.
- All modified files are named explicitly.
- All test and verification commands are concrete.

## Type Consistency Check

- The plan changes only literal UI strings and test assertions; no new types, functions, props, or store fields are introduced.
- Existing component names and file ownership stay unchanged throughout the plan.
