# Query Panel Copy Refresh Design

Date: 2026-03-29
Status: Approved in chat
Target: Existing desktop client query workspace UI copy only
Scope: Refresh the query-panel wording so it feels neutral, understandable, and user-facing. No layout, interaction, or data-flow changes.

## 1. Overview

The current query workspace contains several labels that sound either too technical or slightly mismatched with the actual user task. In particular, words such as `搜索`, `强制刷新`, and the description `保持当前查询与强制刷新行为不变` read like internal product or implementation language instead of interface copy.

This pass keeps the existing structure and behavior intact, but rewrites the visible wording in the query-panel flow so users can understand the screen without needing to infer internal concepts.

## 2. Goals

- Keep the title `查询面板` unchanged.
- Replace awkward or implementation-facing copy in the query panel and adjacent result flow.
- Use a neutral, general-purpose tone rather than a branded or assistant-like tone.
- Make the wording align with the actual supported inputs: words, phrases, and sentences.
- Avoid touching behavior, layout, routing, or internal module names.

## 3. Non-Goals

- No redesign of the query workspace.
- No changes to request behavior, refresh behavior, or state management.
- No backend or API wording changes.
- No broad rewrite of the history page or unrelated screens.
- No renaming of internal `query` or `search` code identifiers unless a test literal must change.

## 4. Copy Principles

### 4.1 Tone

The wording should be:

- neutral
- direct
- task-oriented
- easy to understand on first read

Avoid:

- implementation wording such as `保持当前查询与强制刷新行为不变`
- search-engine wording that does not fit the feature well
- overly productized or anthropomorphic phrasing

### 4.2 Mental Model

The screen is better understood as:

- enter content
- choose the content type if needed
- view the result
- continue from recent records when helpful

The copy should support that flow explicitly.

### 4.3 Boundaries

Only visible copy in the query workspace main flow should change in this pass:

- page description
- query-panel description
- field labels
- dropdown labels
- action buttons
- status text
- result summary text
- validation copy

## 5. Approved Copy Changes

## 5.1 Page header

Keep:

- `查词`

Replace:

- `输入单词或短语` -> `输入单词、词组或句子`

This reflects the current product capability more accurately and stays neutral.

## 5.2 Query panel

Keep:

- `查询面板`

Replace:

- `输入搜索内容并选择结果类型，保持当前查询与强制刷新行为不变。`
- with `输入内容后即可查看结果，也可以从最近记录继续。`

This replacement removes implementation language and tells the user what they can do in practical terms.

## 5.3 Field labels and placeholder-adjacent wording

Replace:

- `搜索内容` -> `输入内容`
- `结果类型` -> `内容类型`
- `选择结果类型` -> `选择类型`

Keep the input placeholder:

- `输入单词、词组或句子`

The label should describe the user action, while the placeholder gives concrete examples.

## 5.4 Recent-record dropdown

Replace:

- `最近搜索建议` -> `最近记录`
- `没有匹配的最近搜索` -> `没有匹配的最近记录`

The goal is to remove repeated use of `搜索` while keeping the dropdown meaning clear.

## 5.5 Primary and secondary actions

Replace:

- `查询` -> `查看结果`
- `强制刷新` -> `重新获取结果`

`查看结果` is more aligned with the user outcome than `查询`.

`重新获取结果` is clearer than `强制刷新` because it describes the effect rather than an internal operation mode.

## 5.6 Status, feedback, and result summary

Replace:

- `查询中` -> `正在获取结果`
- `查询失败` -> `获取失败`
- `查询结果` -> `结果`
- `搜索内容：{q}` -> `当前内容：{q}`
- `已恢复搜索：{q}` -> `已恢复内容：{q}`

Keep:

- `结果已更新`
- `刷新失败`
- `当前结果已保留`

These kept strings are already short enough and still understandable in the updated flow.

## 5.7 Validation copy

Replace:

- `搜索内容最多 300 个字符，请精简后再查询。`
- with `输入内容最多 300 个字符，请精简后再试。`

The validation should mirror the updated field label and avoid repeating `查询`.

## 6. Implementation Boundaries

This pass should remain narrow:

- update visible text in the query workspace flow
- update tests that assert those exact strings
- keep existing component names, store names, and API names unchanged
- do not introduce new UX behavior simply because wording changed

## 7. Testing Strategy

- Update workspace UI tests that assert visible query-panel copy.
- Verify buttons, labels, statuses, and result summaries use the approved wording.
- Verify the recent-record dropdown still exposes the correct accessible names after copy changes.
- Verify validation feedback uses the new wording and still blocks overlong input.

## 8. Acceptance Criteria

- The query-panel title remains `查询面板`.
- The panel description no longer mentions implementation behavior.
- The main flow consistently uses `输入内容 / 内容类型 / 查看结果 / 最近记录`.
- Refresh wording is understandable without using `强制刷新`.
- Result-area summaries no longer say `搜索内容`.
- The page description reflects that the screen supports words, phrases, and sentences.
- Only visible copy and related tests are changed in this pass.
