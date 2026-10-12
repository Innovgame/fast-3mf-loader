# AGENTS.md

面向编码代理的项目说明。人类贡献者请看 [README.md](README.md) 和 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 项目

`fast-3mf-loader` 是面向浏览器的 TypeScript 3MF 解析库。公开入口是 `Fast3MFLoader` 和 `fast3mfBuilder`：前者把 3MF archive 解析成 `ParseResult`，后者把解析结果建成 `THREE.Group`。

仓库是 pnpm workspace：

- `packages/fast-3mf-loader`：公开库。仓库包名是 `@innovgame/fast-3mf-loader`，npm 发布名是 `fast-3mf-loader`。
- `apps/demo`：React / Radix UI / Tailwind CSS / Lucide 项目页和浏览器验证区。
- `3mf/`：回归夹具，按二进制处理。
- `docs/support-matrix.md`：当前支持边界。

运行时是具备 `Worker` 和 `Blob` 的现代浏览器。Node.js 22 只用于安装、测试和构建。不要把库改成 Node.js 运行时，也不要新增 Node 入口。

## 环境

- Node.js 22
- pnpm 10.33.0，以根目录 `packageManager` 为准

```bash
pnpm install
pnpm dev
```

`pnpm dev` 启动项目页。页面生产路径是 `/fast-3mf-loader/`。

## 命令

- `pnpm verify`：拉取请求的默认检查。包含 lint、类型检查、测试和构建。
- `pnpm test`：库、页面和仓库级测试。
- `pnpm build`：构建公开库和项目页。
- `pnpm --filter @fast-3mf-loader/demo test:e2e`：浏览器检查。先执行 `pnpm --filter @fast-3mf-loader/demo exec playwright install chromium`。
- `pnpm release:check`：维护者发布前检查，包含基准和打包检查。普通改动不要跑它。

改完代码后运行与改动匹配的检查。声称通过之前，先看命令输出。

## 代码约定

- 公开导入保持 `Fast3MFLoader`、`fast3mfBuilder`，以及 `ParseResult` / `Model3MF` 的现有形状。
- `parse()` 只接受完整的 `ArrayBuffer`。不要把它写成公开的分块输入 API。
- 支持边界以 `docs/support-matrix.md` 为准。新能力要同时补实现、测试和文档。Print Ticket 仍未支持。
- 库源码在 `packages/fast-3mf-loader/lib/`。解析编排、事件、分发和几何构建保持现有职责，不要把内部模块重新导出成公开 API。
- 发布产物只保留 `dist/fast-3mf-loader.js`、`dist/fast-3mf-loader.umd.cjs` 和 `dist/index.d.ts`。`package.json` 的 `types` 指向 `dist/index.d.ts`。
- 注释只写代码本身看不出来的约束。不要给直观实现补说明。
- 匹配周围代码的格式。TypeScript 停在仓库当前版本，不要单独升到 TypeScript 7。

## 测试

- 解析、构建和公开 API 的回归放在 `packages/fast-3mf-loader/test/`，用现有 `3mf/` 夹具或合成 archive。
- 页面测试放在 `apps/demo/tests/`，不要写进公开库的测试目录。
- 改了用户可见的页面行为后，跑对应的 Playwright 检查。
- 不要把 Node 测试垫片写成“库已支持 Node.js”。

## 提交

使用简短的英文 conventional commit，例如 `fix:`、`feat:`、`docs:`、`ci:`。标题写用户或代理能观察到的变化。

一次提交只包含一个清晰边界。不要提交 `dist/`、本地 tarball、浏览器截图产物或私人 3MF 文件。

## 发布

版本来自 `packages/fast-3mf-loader/package.json`。GitHub Release 的 tag 必须是 `v` 加这个版本。GitHub Packages 发布 `@innovgame/fast-3mf-loader`。设置了 `NPM_TOKEN` 时，npm 发布 `fast-3mf-loader`。

发布步骤见 [CONTRIBUTING.md](CONTRIBUTING.md)。没有明确要求时，不要自己打 tag 或发布。

## 继续工作前

涉及架构或长期方向时，先读：

1. `docs/superpowers/context/current-architecture-context.md`
2. `docs/superpowers/context/user-preferences.md`
3. `docs/superpowers/roadmap/current-roadmap.md`

请求和这些文档里的支持边界冲突时，先说明冲突，确认后再改代码。不要维护任务接力日志。
