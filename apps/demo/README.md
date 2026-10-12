# 项目主页与浏览器验证区

页面采用 React、Radix UI、Tailwind CSS 和 Lucide，提供项目介绍、安装与接入示例、支持矩阵、性能方法和社区入口。在线验证区支持本地 3MF 文件选择与拖放、worker 数量配置、模型预览、模型部件查看、分阶段计时和主动运行的 three.js 对照。

## 本地开发

在仓库根目录执行：

```sh
pnpm install
pnpm dev
pnpm verify
```

`pnpm build` 同时构建公开库和页面，`pnpm build:demo` 单独构建页面。库的公开 API、返回形状和支持边界由原有库文档及测试维护。

## 页面验证

```sh
pnpm --filter @fast-3mf-loader/demo test
pnpm --filter @fast-3mf-loader/demo exec playwright install chromium
pnpm --filter @fast-3mf-loader/demo test:e2e
```

浏览器测试会启动独立的开发服务，覆盖桌面、平板、手机、中英文、明暗主题、键盘标签页、剪贴板、真实颜色与纹理模型、模型替换、对照失败、损坏文件恢复和 WebGL 不可用场景。截图与失败轨迹写入 `test-results/`，不纳入 git。

生产子路径验证与 CI 保持一致。以下为 PowerShell 命令：

```powershell
$env:GITHUB_PAGES = "true"
pnpm build:demo
$env:DEMO_PRODUCTION = "true"
pnpm --filter @fast-3mf-loader/demo test:e2e
Remove-Item Env:GITHUB_PAGES, Env:DEMO_PRODUCTION
```

已有服务可通过 `DEMO_BASE_URL` 指定地址；本机已经安装 Chrome 时，可将 `DEMO_BROWSER_CHANNEL` 设为 `chrome`。CI 使用 Playwright 配套 Chromium。

## 测量与支持边界

- 文件只在浏览器内处理。示例代码的复制和 GitHub 反馈由用户主动触发。
- 页面显示当前文件的单次解析、构建和总耗时，排除文件读取、模块加载、纹理解码和渲染。three.js 的对照值是解析与构建的合并耗时。
- 对照重新读取源文件，避免复用已被 worker 转移的输入缓冲区；对照失败不会清除原有解析结果。
- 模型替换、清除和组件卸载会释放几何、材质、纹理、渲染器与控制器。没有模型、页面不可见或场景标签页隐藏时不持续渲染。
- Print Ticket 和未经 fixture 覆盖的扩展资源仍未支持，预览成功不代表完整还原全部 3MF 数据。页面不提供切片、导出或公开的分块输入 API。
- 性能文档中的历史 Node 样本不能视为当前浏览器的性能保证。

页面版本从公开库的 `package.json` 读取，项目链接统一放在 `src/content.ts`。现有部署工作流复用 `apps/demo/dist`，并在 `master` 的 CI 成功后发布。
