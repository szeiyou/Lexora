# Lexora In-App UI Copy Design

Date: 2026-03-28
Status: Approved in chat
Target: Existing desktop client UI copy only
Scope: Replace in-app product-facing text with shorter, more natural Lexora-branded wording. No layout, interaction, or feature changes.

## 1. Overview

The current app copy is functional but often reads like internal product language rather than a polished dictionary product. Terms like “工作台”, “工作区”, and long explanatory sentences make the UI feel stiff and over-described.

This pass focuses only on text shown in the interface. The goal is to make Lexora feel more like a modern dictionary product: shorter labels, friendlier tone, and fewer explanations. The copy should sound natural to users and avoid management-style phrasing.

## 2. Goals

- Replace outward-facing product branding in the app from `CoDict` to `Lexora`.
- Remove awkward terms such as `工作台` and `工作区`.
- Shorten navigation labels and page copy so the app feels closer to real dictionary products.
- Keep a light product tone: concise, natural, and clear.
- Avoid touching app structure, layout, or behavior.

## 3. Non-Goals

- No UI redesign.
- No information architecture changes.
- No feature changes.
- No changes to API wording or backend terminology.
- No attempt to rewrite every string in the codebase if the text is not product-facing.

## 4. Copy Principles

### 4.1 Tone

The app should sound like a consumer-facing dictionary product, not an internal tool or admin panel.

Desired tone:

- short
- natural
- calm
- product-like

Avoid:

- `工作台`
- `工作区`
- long instructional explanations where a short phrase is enough
- internal or implementation-facing wording such as “统一管理连接、认证和窗口关闭行为”

### 4.2 Density

Keep supporting text only where it genuinely helps. Titles and navigation should be very short. Descriptions should usually be a single brief sentence.

### 4.3 Branding

The in-app product name should be `Lexora`.

The sidebar brand block should show:

- `Lexora`
- no subtitle

## 5. Approved Copy Changes

## 5.1 Sidebar brand and navigation

### Brand block

Replace:

- `CoDict`
- `桌面查询工作台`

With:

- `Lexora`
- no subtitle

### Navigation

Replace:

- `查询工作台`
- `历史记录`
- `单词本`
- `设置`

With:

- `查词`
- `历史`
- `单词本`
- `设置`

## 5.2 Lookup screen

### Page label and title

Remove the English eyebrow label:

- `Query Workspace`

Replace the main title:

- `查询工作台` → `查词`

### Page description

Replace:

- `在同一工作区中发起查询、刷新结果，并快速恢复最近搜索记录。`

With:

- `输入单词或短语`

### Status and supporting text

Preferred replacements:

- `加载设置中...` → `正在加载设置`
- `填写服务地址、用户名和密码后即可开始查询。` → `填写服务信息后即可开始使用`
- `查询中...` → `查询中`
- `正在从服务端获取最新结果。` → `正在获取结果`
- `请检查连接设置或稍后重试。` → `请检查连接后重试`
- `当前结果` → `查询结果`
- `查询内容：{q}` → `搜索内容：{q}`
- `已恢复查询：{q}` → `已恢复搜索：{q}`
- `结果已同步到当前缓存。` → `结果已更新`

Strings that are already short and natural enough, such as `查询失败` and `刷新失败`, can stay unchanged.

## 5.3 History screen

### Page title and description

Replace:

- `历史记录` → `历史`
- `查看最近的查询摘要，并将原查询重新带回工作台继续使用。` → `最近查过的内容`

### Card title and description

Replace:

- `历史记录列表` → `最近搜索`
- `按页浏览最近的查询历史，并在需要时重新查询。` → `查看并重新打开之前的搜索`

### Status and error text

Preferred replacements:

- `加载历史中...` → `正在加载历史`
- `加载历史失败` → `历史加载失败`
- `操作未完成` → `无法打开`
- `该条历史记录缺少查询内容，无法重新打开。` → `这条记录无法重新打开`

## 5.4 Wordbooks screen

### Page title and description

Keep:

- `单词本`

Replace description:

- `管理你的单词集合，并查看每个单词本中的内容。` → `收藏并整理你想记住的词`

### Sidebar card title and description

Replace:

- `单词本列表` → `我的单词本`
- `选择一个单词本查看详情，或继续创建新的集合。` → `选择一个单词本查看内容`

### Empty and status text

Preferred replacements:

- `加载单词本中...` → `正在加载单词本`
- `加载单词本失败` → `单词本加载失败`
- `删除单词本失败` → `删除失败`
- `还没有单词本。` → `暂无单词本`

`新建单词本`, `重命名单词本`, `保存单词本`, and `删除单词本` are acceptable and can stay unchanged in this pass.

## 5.5 Settings screen

### Page title and description

Keep:

- `设置`

Replace description:

- `统一管理连接、认证和窗口关闭行为，保持现有功能与反馈语义不变。` → `连接词典服务并调整使用偏好`

### Loading and result text

Preferred replacements:

- `加载设置中...` → `正在加载设置`
- `连接成功` can stay unchanged
- `连接失败` can stay unchanged
- `认证失败，请检查用户名和密码` can stay unchanged

The goal here is not to over-edit technical feedback that users need for troubleshooting.

## 6. Implementation Boundaries

This copy pass should stay narrow:

- update existing labels and descriptions in current screens
- update matching tests that assert literal UI text
- do not rename internal modules, routes, or component identifiers unless required for a visible label
- do not change interaction flows just because the wording changes

## 7. Testing Strategy

- Update UI tests that assert navigation labels, headings, descriptions, and status text.
- Verify that all user-visible text still matches the expected screen intent after replacements.
- Verify there are no remaining visible uses of `工作台` in product-facing UI once this pass is complete.

## 8. Acceptance Criteria

- The visible app brand is `Lexora`.
- The sidebar no longer shows a subtitle.
- Navigation uses `查词 / 历史 / 单词本 / 设置`.
- Product-facing UI no longer uses `工作台` or `工作区`.
- Page descriptions are shorter and more natural.
- The app feels like a dictionary product rather than an internal tool.
- Only UI copy and related tests are changed in this pass.
