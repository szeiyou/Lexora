# Query Panel Copy Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the query workspace copy to the approved neutral wording without changing UI behavior, layout, or data flow.

**Architecture:** This is a text-only pass across the existing query workspace and its literal-string tests. The implementation should update visible copy in the React components first through failing tests, then align Playwright selectors and assertions to the new accessible names. Internal module names, store names, and API calls stay unchanged.

**Tech Stack:** React 19, TypeScript, TanStack Query, Zustand, Vitest, Testing Library, MSW, Playwright

---

## File Structure

### Files to modify
- `src/modules/query/ui/query-toolbar.tsx` — query-panel description, field labels, dropdown accessibility labels, action button text
- `src/modules/query/screens/workspace-screen.tsx` — page description, loading/error/result copy, result summary text
- `src/modules/query/model/query-input-validation.ts` — overlong-input validation message
- `src/modules/query/ui/workspace-screen.test.tsx` — unit/integration assertions for updated workspace copy
- `tests/e2e/settings-and-query.spec.ts` — query-page selectors for updated label/button text
- `tests/e2e/history-and-wordbooks.spec.ts` — reopened-query and add-to-wordbook selectors for updated label/button text

### Files to verify but not modify
- `docs/superpowers/specs/2026-03-29-query-panel-copy-refresh-design.md` — approved wording source of truth

## Task 1: Update query workspace tests and implementation copy

**Files:**
- Modify: `src/modules/query/ui/workspace-screen.test.tsx`
- Modify: `src/modules/query/ui/query-toolbar.tsx`
- Modify: `src/modules/query/screens/workspace-screen.tsx`
- Modify: `src/modules/query/model/query-input-validation.ts`

- [ ] **Step 1: Write the failing workspace test expectations**

Update the existing assertions in `src/modules/query/ui/workspace-screen.test.tsx` to the approved copy:

```tsx
const queryInput = screen.getByLabelText("输入内容");
expect(await screen.findByRole("listbox", { name: "最近记录" })).toBeInTheDocument();
expect(screen.getByLabelText("内容类型")).toHaveTextContent("英文单词");
expect(await screen.findByRole("heading", { name: "结果" })).toBeInTheDocument();
expect(screen.getByText("输入单词、词组或句子")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "查看结果" })).toBeDisabled();
expect(screen.getByRole("button", { name: "重新获取结果" })).toBeDisabled();
expect(screen.getByText("当前内容：phenomenon")).toBeInTheDocument();
expect(await screen.findByText("获取失败")).toBeInTheDocument();
expect(await screen.findByText("输入内容最多 300 个字符，请精简后再试。")).toBeInTheDocument();
```

Keep the panel title assertion as `查询面板`.

- [ ] **Step 2: Run the workspace test file to verify it fails**

Run: `npm run test -- src/modules/query/ui/workspace-screen.test.tsx`
Expected: FAIL on the old visible strings such as `搜索内容`, `最近搜索建议`, `查询`, and `强制刷新`.

- [ ] **Step 3: Update the query workspace copy in the implementation files**

Apply only the approved text changes.

In `src/modules/query/ui/query-toolbar.tsx`, use:

```tsx
<CardTitle className="text-xl">查询面板</CardTitle>
<CardDescription>输入内容后即可查看结果，也可以从最近记录继续。</CardDescription>
```

```tsx
<label htmlFor="workspace-query-input">输入内容</label>
```

```tsx
aria-label="最近记录"
```

```tsx
<div className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">没有匹配的最近记录</div>
```

```tsx
<label htmlFor="workspace-type-select">内容类型</label>
<SelectTrigger id="workspace-type-select" aria-label="内容类型">
  <SelectValue placeholder="选择类型" />
</SelectTrigger>
```

```tsx
<Button type="submit">查看结果</Button>
<Button type="button" variant="secondary">重新获取结果</Button>
```

In `src/modules/query/screens/workspace-screen.tsx`, use:

```tsx
<p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
  输入单词、词组或句子
</p>
```

```tsx
<StatusView title="正在获取结果" description="正在获取结果" state="loading" />
<StatusView title="获取失败" description="请检查连接后重试" state="error" />
```

```tsx
<CardTitle className="text-base">结果</CardTitle>
```

```tsx
{activeQuery ? `当前内容：${activeQuery.q}` : `已恢复内容：${currentResult.query}`}
```

Keep `结果已更新`, `刷新失败`, and `当前结果已保留` unchanged.

In `src/modules/query/model/query-input-validation.ts`, replace the message with:

```ts
return `输入内容最多 ${MAX_QUERY_LENGTH} 个字符，请精简后再试。`;
```

- [ ] **Step 4: Run the workspace test file to verify it passes**

Run: `npm run test -- src/modules/query/ui/workspace-screen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the workspace copy update**

```bash
git add src/modules/query/ui/query-toolbar.tsx src/modules/query/screens/workspace-screen.tsx src/modules/query/model/query-input-validation.ts src/modules/query/ui/workspace-screen.test.tsx
git commit -m "refactor: refresh query panel copy"
```

## Task 2: Update end-to-end selectors for the new accessible text

**Files:**
- Modify: `tests/e2e/settings-and-query.spec.ts`
- Modify: `tests/e2e/history-and-wordbooks.spec.ts`

- [ ] **Step 1: Update the failing Playwright selectors and expectations**

Replace the old query-page selectors with the new accessible text:

```ts
await page.getByLabel("输入内容").fill("phenomenon");
await page.getByRole("button", { name: "查看结果" }).click();
```

Also replace:

```ts
await expect(page.getByLabel("输入内容")).toHaveValue("你今天怎么样？");
```

Keep all non-query-page assertions unchanged.

- [ ] **Step 2: Run the targeted e2e specs to verify they fail first**

Run: `npm run test:e2e -- tests/e2e/settings-and-query.spec.ts tests/e2e/history-and-wordbooks.spec.ts`
Expected: FAIL because the app still exposes `搜索内容` and `查询` before the implementation change is applied.

- [ ] **Step 3: Save the updated Playwright specs**

Only update label and button names needed to match the approved query-workspace copy. Do not rewrite test structure or route mocks.

- [ ] **Step 4: Run the targeted e2e specs to verify they pass**

Run: `npm run test:e2e -- tests/e2e/settings-and-query.spec.ts tests/e2e/history-and-wordbooks.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit the e2e selector update**

```bash
git add tests/e2e/settings-and-query.spec.ts tests/e2e/history-and-wordbooks.spec.ts
git commit -m "test: align query copy e2e selectors"
```

## Task 3: Final verification

**Files:**
- Verify only

- [ ] **Step 1: Run the full targeted verification commands**

Run:

```bash
npm run test -- src/modules/query/ui/workspace-screen.test.tsx
npm run test:e2e -- tests/e2e/settings-and-query.spec.ts tests/e2e/history-and-wordbooks.spec.ts
```

Expected:

- workspace test file passes
- targeted e2e specs pass
- no assertions still reference `搜索内容`, `最近搜索建议`, or `强制刷新` in the query workspace flow

- [ ] **Step 2: Review the diff against the approved spec**

Verify that:

- `查询面板` stays unchanged
- the panel description is `输入内容后即可查看结果，也可以从最近记录继续。`
- the input label is `输入内容`
- the type label is `内容类型`
- the primary and secondary actions are `查看结果` and `重新获取结果`
- the page helper copy is `输入单词、词组或句子`
- the result summary uses `当前内容`

- [ ] **Step 3: Commit the final verified state if needed**

If the previous task commits were not created during execution, commit the remaining tracked changes with:

```bash
git add src/modules/query/ui/query-toolbar.tsx src/modules/query/screens/workspace-screen.tsx src/modules/query/model/query-input-validation.ts src/modules/query/ui/workspace-screen.test.tsx tests/e2e/settings-and-query.spec.ts tests/e2e/history-and-wordbooks.spec.ts
git commit -m "refactor: refresh query workspace copy"
```
