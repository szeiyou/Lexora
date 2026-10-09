# Lexora

Lexora 是基于 `Tauri v2 + React + TypeScript` 的 Windows 端 AI 电子辞典客户端，支持词汇查询、文本翻译、历史记录和单词本。

本仓库包含桌面客户端，运行时需要自行部署或接入兼容的 DicServer 服务，接口要求见 [服务端 API 文档](./服务端API接口文档.md)。

## 技术栈

- Tauri v2
- React 19
- TypeScript
- TanStack Query
- Zustand
- Vitest + Testing Library
- Playwright

## 本地开发

1. 安装 Node.js、Rust、Tauri 前置依赖。
2. 执行 `npm install`。
3. Web 调试执行 `npm run dev`，默认监听 `127.0.0.1:3000`。
4. 桌面壳调试执行 `npm run tauri:dev`，会复用同一份开发服务器配置。
5. 打开应用后，先在“设置”页保存 DicServer 服务地址。
6. 然后在同一页的“账号会话”区域注册或登录；客户端会持久化 refresh token，并在下次启动时自动恢复登录状态。
7. 服务地址需要写完整基础 URL，例如 `http://192.168.0.10:8080`，不能只填主机名或 IP。
8. 如需临时改端口或主机，使用 `npm run dev -- --port 3100` 或 `npm run tauri:dev -- --host 127.0.0.1 --port 3100`。

## 常用命令

- `npm run test`：运行单元测试和组件测试
- `npm run test:e2e`：运行浏览器级冒烟测试
- `npm run build`：构建前端产物
- `npm run tauri:build`：构建 Windows 桌面程序和安装包
- `cargo check --manifest-path src-tauri/Cargo.toml`：检查 Tauri Rust 壳

## Windows 打包

本项目的桌面分发产物由 `Tauri v2` 负责构建，打包入口是 `npm run tauri:build`。

### 前置依赖

在 Windows 主机环境中准备以下依赖：

- Node.js
- Rust
- Microsoft C++ Build Tools
- Microsoft Edge WebView2 Runtime
- Tauri 官方要求的 Windows 前置依赖

建议在 Windows 的 `PowerShell` 或 `CMD` 中执行打包命令，不要在 `WSL` 里直接构建安装包。

### 打包步骤

1. 安装依赖：`npm install`
2. 可选检查：`npm run test`
3. 可选检查：`npm run build`
4. 可选检查：`cargo check --manifest-path src-tauri/Cargo.toml`
5. 正式打包：`npm run tauri:build`

`src-tauri/tauri.conf.json` 当前配置了 `beforeBuildCommand: "npm run build"`，因此执行 `npm run tauri:build` 时会先构建前端，再构建桌面程序。

### 产物位置

- 安装包输出目录：`src-tauri/target/release/bundle/`
- 可执行文件目录：`src-tauri/target/release/`

当前 Tauri 配置中 `bundle.targets` 为 `"all"`，会在 Windows 上尝试生成当前环境支持的安装包格式。

如果只想生成主程序 `exe`，不生成安装包，可以执行：

```bash
npm run tauri:build -- --no-bundle
```

## 测试说明

- 浏览器冒烟测试使用 Playwright，并通过请求拦截模拟 DicServer 接口响应。
- 浏览器开发模式下，请求会通过本地 `Vite` 开发代理转发到 DicServer，这样无需服务端额外开启 CORS。
- 托盘与关闭行为的手工检查步骤见 [docs/manual-smoke-checklist.md](./docs/manual-smoke-checklist.md)。

## 目录概览

- `src/app`：应用入口、路由与布局
- `src/modules`：按业务域拆分的功能模块
- `src/shared`：共享 API、工具和 UI 组件
- `src-tauri`：Tauri v2 壳层代码
- `tests/e2e`：Playwright 冒烟测试

## 开源许可

本项目采用 [MIT License](./LICENSE)。
