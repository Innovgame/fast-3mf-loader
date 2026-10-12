# 浏览器与 Three.js 支持

这份说明只记录已经在本仓库验证过的组合。没有写在这里的浏览器或版本，不算已支持。

## 库的运行前提

- 需要浏览器提供 `Worker` 和 `Blob`。worker 无法启动时，`parse()` 会抛出指向这两项的错误。
- `three` 是 peer dependency，范围是 `>=0.170.0`。
- 本仓库开发和 CI 使用的是 `three@0.186.1`。TypeScript 消费者还需要安装 `@types/three`。

## 已验证

- CI 的 Pages 检查在 Ubuntu 24.04 上用 Playwright Chromium 打开生产路径 `/fast-3mf-loader/`。
- 同一次检查会通过浏览器 worker 解析并构建 `facecolors.3mf`、`vertexcolors.3mf`、`multipletextures.3mf` 和 `truck.3mf`。
- `pnpm consumer:check:browser` 会把打包后的 `fast-3mf-loader` 安装到一个新的 Vite 项目，再用 Playwright Chromium 解析 `facecolors.3mf`。这个检查覆盖的是发布包，不是仓库源码别名。

## 未记录为已支持

- Firefox、Safari，以及具体的手机浏览器版本，还没有在这里留下一次对应的检查记录。
- 演示页做过窄视口布局检查。那只说明页面布局，不表示那些视口宽度对应的手机浏览器已被验证。
- Node.js 只用于安装、测试和构建，不是库的运行时。
