# Current Work

## Current Focus

- 2026-10-12 已补齐 Production 路径属性的命名空间校验：根据命名空间 URI 和元素作用域识别属性，保留普通 `path` 兼容，已覆盖冲突、前缀重绑定及作用域恢复。
- 2026-10-12 已修复 BambuStudio Production 扩展跨模型组件引用：`p:path` 会被解析，builder 会到目标 model part 查找对象。下载目录中的“双生盗龙链接件”可以构建出网格。
- 2026-10-12 已完成标准化 GitHub Pages 页面：参考 `D:\lichun\slicer-converter`，采用 React / Radix UI / Tailwind / Lucide，完成项目介绍、首次接入和浏览器内验证。实施与生产子路径检查均已完成，后续回到稳态 `1.0` 主线。
- 把项目长期方向收敛到 `稳态 1.0` 发布：围绕 README 已承诺的性能、WebWorker、TypeScript、浏览器兼容性和易用性，定义清晰的 release gates，并把后续执行拆成可连续交付的阶段。

## Why It Matters

- 仓库已经具备 parse stabilization、fixture-backed tests、support matrix 和 benchmark split 等 `1.0` 前置条件，但 summary docs 仍停留在更早的 workstream 视角。
- 把 roadmap、status 和 implementation plan 一起收敛到 `稳态 1.0` 方向后，后续会话可以直接围绕 release gates 推进，而不是重新判断“该继续扩能力，还是先稳定发布”。

## Latest Completed

- 2026-10-12 已关闭 `e47389e` 评审中发现的 P2 命名空间兼容性缺口：
  - `parse-events.ts` 维护按元素进入/退出恢复的命名空间作用域，支持前缀别名、祖先/局部声明、重绑定、自闭合及显式闭合。命名空间 URI 中的 XML 字符引用使用 EasySAX 自带解码器归一化。
  - `node-extract.ts` 仅接受 Production 命名空间 URI 对应的限定 `path`，其他扩展同名属性不再覆盖它；普通 `path` 的既有兼容性和优先级保留。component 与 build item 使用相同规则。
  - 命名空间上下文仅存在于内部解析事件，不改变公开 `ParseResult` / `Model3MF` 形状。几何标签没有命名空间声明时，仍保留属性 getter 的延迟读取。
  - 新增 `test/production-paths.test.ts` 的 14 个永久回归用例，使用合成 archive 及同名对象的不同几何坐标验证真正构建了目标对象。冲突和字符引用用例均先观察到失败，再完成修复。
  - `pnpm verify` 已通过：23 个测试文件、111 个单元测试、类型检查及库/页面构建；没有新增 lint 错误，原有 22 条 `any` 警告保留。
  - `/fast-3mf-loader/` 生产子路径的 8 项 Chrome 检查已通过，其中包括原下载文件及仅加入属性冲突的临时副本，两者均显示 1 个 mesh、960 个三角形。临时测试与副本已清理，原下载文件未修改。
  - 支持矩阵与架构摘要已同步；永久页面浏览器测试仍为原有 7 项，本次额外原文件验收不依赖提交私人文件。

- 2026-10-12 已按 `slicer-converter` 补上 GitHub Packages 的公开安装入口：
  - 根 README 中英文都写了 `.npmrc` 与 `@innovgame/fast-3mf-loader` 安装方式。
  - 发布工作流任务名改为 GitHub Packages。发布脚本本来就会在有 `GITHUB_TOKEN` 时发布到 `npm.pkg.github.com`。
  - 项目页安装区增加 GitHub 标签。Packages 页面要等发布工作流成功跑过一次才会出现包。
- 2026-10-12 已评审修复提交 `e47389e`：原文件的根因已解决，parser 保留 Production `p:path`，builder 按目标模型与 objectId 查找、缓存并构建对象。
  - 已重新用下载目录原文件运行解析/构建与真实 Chrome 导入，确认 1 个 mesh、960 个三角形及非空包围盒；相对路径、Production 前缀改名、根模型同名 objectId 的变体均保持原几何包围盒。
  - 发现一个已复现的 P2 兼容性问题：`node-extract.ts:readLocalAttribute()` 只匹配 `*:path` 后缀，不校验命名空间 URI。在 component 上让另一命名空间的 `audit:path` 排在 Production `p:path` 前面，会错误选中前者。
  - 当时建议按 Production 命名空间 URI 解析属性，同时保留普通 `path` 兼容，并补命名空间冲突的永久回归测试；已由本轮补齐。该问题不影响用户当时的原始文件，评审阶段未修改实现。
  - 本地诊断脚本和临时测试已清理，原文件仍保留在下载目录；浏览器截图在 `apps/demo/test-results/original-download-review.png`。
- 2026-10-12 已修复 demo 导入 BambuStudio 3MF 时的 `Cannot find component object`：
  - 根因是组件 `objectid="1"` 通过 `p:path="/3D/Objects/object_10.model"` 指向另一个 model part，parser 没有收下带命名空间的 `path`，builder 也只在当前模型里查找。
  - `node-extract.ts` 现在读取 `path` 与 `*:path`；`fast3mfBuilder()` 会按包内绝对路径或相对路径解析 component 和 build item。
  - `test/builder.test.ts` 锁定这条回归。用原文件复现时，构建结果为 1 个 mesh、482 个顶点。
- 2026-10-12 已将 `apps/demo` 从文件选择与控制台计时页升级为开源项目主页和浏览器验证区：
  - 采用 React、Radix UI、Tailwind CSS 与 Lucide，提供中英文、明暗主题、桌面三列工作台、手机布局、安装与代码复制、支持矩阵和社区入口。
  - 本地 3MF 文件支持真实 worker 解析、Three.js 预览、旋转/缩放/平移、视角重置、线框、全屏、模型部件查看及 Parse / Build / Total 计时。
  - three.js 对照按需加载，重新读取源文件以避开 worker 转移后的缓冲区；失败独立展示，保留 fast-loader 结果。页面没有扩大公开 API、运行时或格式支持承诺。
  - 页面状态、计时、资源释放、预览和 UI 分模块维护。页面版本取自公开库包版本；新验证说明位于 `apps/demo/README.md`。
  - `pnpm build` 同时构建库和页面；`pnpm verify` 包含页面类型检查与单元测试。CI 新增 Pages 浏览器验证，继续复用现有部署工作流。
  - 已验证 `pnpm verify`：22 个测试文件、96 个单元测试及库/页面构建通过；原有 22 条 `any` lint 警告仍保留，没有新增 lint 错误。
  - 已使用本机 Chrome 在 `/fast-3mf-loader/` 生产子路径运行全部 7 项 Playwright 检查，覆盖 1440/1024/768/375 宽度、颜色/纹理/组件模型、模型替换与清除、语言/主题持久化、键盘、剪贴板、对照失败、损坏文件恢复与 WebGL 降级。
  - 用户反馈的样式中间状态已修复；已查看桌面明暗主题、手机与真实纹理模型截图。截图在 `apps/demo/test-results/`，不纳入 git。
- 2026-10-12 已修复 Windows 上 `pnpm dev` 无法启动：`packageManager` 改回本机可用的 `pnpm@10.33.0`。`pnpm@12.11.2` 的版本切换在 Windows 上会去执行没有原生程序的 shell shim。
- 2026-10-12 已把仓库改成 pnpm workspace，并按 `slicer-converter` 接上 ESLint、打包发布和 GitHub Pages：
  - 公开库在 `packages/fast-3mf-loader`，仓库包名 `@innovgame/fast-3mf-loader`，npm 发布名仍是 `fast-3mf-loader`
  - 测试页在 `apps/demo`，`master` CI 成功后部署到 GitHub Pages
  - 根脚本改为 `pnpm verify` 与 `pnpm release:check`
  - 依赖升到当前工具链能用的最新版本。TypeScript 停在 `6.0.3`，因为 `typescript-eslint` 还不支持 TypeScript 7
- 2026-10-12 已按 `slicer-converter` 的公开仓库形态补齐开源项目约定，未改解析 API 或支持边界：
  - 新增 `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`SECURITY.md`、`CHANGELOG.md`
  - 议题模板改为 3MF loader 语义，并补上兼容性模板、PR 模板和 Dependabot
  - README 双语入口补上 CI、变更记录和社区文件链接
  - `.gitattributes` 将 `*.3mf` 标为二进制，发布工作流要求 tag 与包版本一致，并使用 npm provenance
- 2026-03-28 完成 parse pipeline stabilization，包括 `parse-events.ts`、`parse-dispatch.ts` 的边界拆分，以及对应的 focused coverage。
- 2026-03-28 确认 `docs/superpowers/specs/2026-03-28-stable-1-0-roadmap-design.md`，把 `1.0` 定义为“稳态发布”而不是“能力扩张发布”。
- 2026-03-28 已同步 `current-architecture-context.md`、`current-roadmap.md`，并新增 `docs/superpowers/plans/2026-03-28-stable-1-0-roadmap.md`，把 `1.0` 剩余工作拆成可执行任务。
- 2026-03-28 已完成 Phase 1 claim alignment：
  - `README.md` 与 `README-zh.md` 的 streaming / browser / support-boundary 文案已对齐当前公开契约
  - `docs/support-matrix.md`、`test/docs-claims.test.ts`、`test/types.test.ts` 一起锁定了 `1.0` 对外 claim
- 2026-03-28 已完成当前这轮 Phase 4 release gates 落地：
  - `package.json` 新增 `verify` 与 `release:check`
  - `.github/workflows/ci.yml` 与 `.github/workflows/npm-publish.yml` 改为复用 shared verification entrypoint
  - `docs/benchmarking.md` 新增 stable `1.0` benchmark gate
  - `docs/releases/1.0.0-draft.md` 与 `test/release-gates.test.ts` 已落地
- 2026-03-29 已继续收敛 publish workflow 的 release gate 接线：
  - `.github/workflows/npm-publish.yml` 现在直接执行 `npm run release:check`，不再分别维护 `verify` 与 `npm pack --dry-run`
  - `test/release-gates.test.ts` 已新增 workflow regression coverage，锁定 publish job 必须复用共享 `release:check` 入口
- 新增治理设计与实施文档：
  - `docs/superpowers/specs/2026-03-28-superpowers-governance-bootstrap-design.md`
  - `docs/superpowers/plans/2026-03-28-superpowers-governance-bootstrap.md`
- 仓库级 governance bootstrap 已完成首轮接线：
  - `AGENTS.md`
  - `docs/superpowers/context/current-architecture-context.md`
  - `docs/superpowers/context/user-preferences.md`
  - `docs/superpowers/status/current-work.md`
  - `docs/superpowers/roadmap/current-roadmap.md`
- 修复了本地 worktree 存在时的 Vitest 测试发现漂移：
  - `vite.config.ts` 现在显式排除 `**/.worktrees/**` 与 `**/worktrees/**`
  - `test/vite-config.test.ts` 锁定了这条配置回归
- 2026-03-28 已完成一轮 benchmark evidence hardening：
  - `scripts/benchmark-core.mjs` 新增按 fixture 汇总 measured runs 的 median/min/max 逻辑
  - `scripts/benchmark.mjs` 现在除主表外还输出每个 fixture 的 spread 行，避免把单次样例值误读成稳定门槛
  - `test/benchmark-core.test.ts` 与 `docs/benchmarking.md` 已同步到“median + spread”口径
- 2026-03-29 已继续收敛 benchmark methodology：
  - `scripts/benchmark-core.mjs` 新增 `resolveBenchmarkConfig()`，允许通过环境变量覆盖 warmup / measured runs / workerCount
  - `scripts/benchmark.mjs` 已接入可配置采样，方便在 release 机器或噪声较大的环境中提高 evidence 采样密度
  - `docs/benchmarking.md` 已补充环境变量入口，避免后续会话再次为了调采样而改脚本
- 2026-03-29 已把 release benchmark preset 固化进发布门槛：
  - `package.json` 新增 `benchmark:release`，固定使用 `warmupRuns=2`、`measuredRuns=7`、`workerCount=6`
  - `release:check` 现在通过 `benchmark:release` 收集 release-machine benchmark evidence，而不是依赖手写环境变量
  - `test/release-gates.test.ts`、`docs/benchmarking.md` 与 `docs/releases/1.0.0-draft.md` 已同步到这条固定入口
- 2026-03-29 已开始收敛 Phase 3 runtime ergonomics：
  - `Fast3MFLoader#parse()` 现在会在收到非法 `workerCount` 时给出明确 warning，再回退到默认 worker 策略
  - `Fast3MFLoader#parse()` 现在也会在输入不是 `ArrayBuffer` 时立即抛出 loader-facing error，而不是落入底层 unzip 报错
  - worker 初始化失败现在会统一抛出直接指向 `Worker` / `Blob` 前提的 loader-facing error，而不是把底层构造错误直接暴露给用户
  - `fast3mfBuilder()` 缺少 root model relationship 时，现在也会抛出 builder-facing error，而不是继续暴露旧的 `THREE.ThreeMFLoader` 前缀
  - `fast3mfBuilder()` 遇到未知 resource `pid` 时，现在会给出带 `pid` 的 builder-facing warning，而不是输出旧的 `THREE.3MFLoader` error 文案
  - `test/runtime-behavior.test.ts`、`test/error-handling.test.ts`、`README.md` 与 `README-zh.md` 已同步到这组 warning/error 语义
- 2026-03-29 已继续收敛 builder 侧 first-use ergonomics：
  - `fast3mfBuilder()` 在 root model relationship 指向缺失 parsed model 时，现在会抛出明确的 builder-facing error，而不是落入 `build` 访问的原生 `TypeError`
  - `fast3mfBuilder()` 在 build item 或 component 引用缺失 object 时，现在也会抛出带 model/object 上下文的 builder-facing error，而不是落入 `clone` / `mesh` 访问失败
  - `test/builder.test.ts` 已新增 focused regression coverage，锁定这三条缺失引用诊断路径
- 2026-03-29 已继续统一 parser 侧 warning 语义：
  - 未知 `model unit` 现在会输出 `Fast3MFLoader:` 前缀的 loader-facing warning，而不是继续保留旧的内部风格文案
  - 未知单位仍然保持回退到 `millimeter` / `[1, 1, 1]` 的现有行为，不扩散到解析语义变更
  - `test/parse-dispatch.test.ts` 已新增 focused coverage，锁定 warning 文案与回退比例
- 2026-03-29 已继续收敛 loader fallback 文案：
  - `collectArchiveManifest()` 缺失结果时，`Fast3MFLoader#parse()` 现在会抛出明确的 loader-facing error，而不是泄露内部 `"unzip error"` 文案
  - `test/error-handling.test.ts` 已新增 manifest 缺失分支的 focused regression coverage
- 2026-03-29 已继续稳定 parse 编排层失败语义：
  - `lib/parse.ts` 现在会把 SAX parser 的 `error` 事件转成 promise rejection，而不是在 `start()` 正常结束后静默 resolve
  - `test/parse.test.ts` 已新增 focused coverage，锁定 parser error event 不得被吞掉
- 2026-03-29 已继续收紧 parse 编排层错误收口：
  - `lib/parse.ts` 现在会在 SAX parser 的 `error` 事件先于 `start()` 完成时立即 rejection，而不是继续等待 `start()` 返回导致 promise 可能悬挂
  - `test/parse.test.ts` 已新增 focused coverage，锁定 parser error event 不得导致 parse promise 悬挂
- 2026-03-29 已继续收敛 builder 侧资源子引用诊断：
  - `fast3mfBuilder()` 在 basematerial index 缺失时，现在会抛出明确的 builder-facing error，而不是落入后续 `undefined` 访问
  - `fast3mfBuilder()` 在 texture group 引用缺失 texture resource 或 texture binary 时，现在也会抛出明确的 builder-facing error，而不是静默构建成无纹理材质
  - `test/builder.test.ts` 已新增 focused regression coverage，锁定这三条资源子引用失败路径
- 2026-03-29 已在本轮 Phase 3 错误语义收口后重新执行 `pnpm verify`：
  - `check:demo`、`check:test`、全量 `vitest` 与 `build` 当前全部通过
  - 当前回归覆盖包含 19 个测试文件、88 个测试用例，未发现由本轮 parse / builder / parse worker / WorkerPool / archive part / relationship XML / builder relationship target 诊断收口引入的新失败
- 2026-03-29 已继续收敛 parse worker 失败诊断：
  - `Fast3MFLoader#parse()` 现在会为 parse worker 的空消息或不可读失败补上带 model part 路径的 loader-facing error，而不是退化成宽泛的 archive 级错误
  - `lib/parse-model.worker.ts` 已移除错位的旧 fallback 文案，统一改为 parse model part 语义
  - `test/error-handling.test.ts` 已新增 focused coverage，锁定 parse worker 空消息与空 error event 的回退文案
- 2026-03-29 已继续收敛 WorkerPool 队列失败语义：
  - `lib/WorkerPool.ts` 现在会在 worker `postMessage()` 同步抛错时立即 reject 当前任务、清理坏 worker，并继续派发后续队列任务，而不是让队列悬挂
  - `test/worker-pool.test.ts` 已新增 focused regression coverage，锁定“队列中的坏任务失败后，后续任务仍能继续完成”
- 2026-03-29 已继续收敛 archive part 读取失败语义：
  - `Fast3MFLoader#parse()` 现在会在 relationship file、model relationship file、model part、texture part 缺失时抛出明确的 loader-facing error，而不是落入原生解码或属性访问错误
  - `test/error-handling.test.ts` 已新增 manifest override 覆盖，锁定 root model file 缺失、`rels` 缺失、relationship payload 缺失、model part 缺失与 texture part 缺失这几条回退路径
- 2026-03-29 已继续收敛 relationship XML 解析边界：
  - `Fast3MFLoader#parse()` 现在支持 root rels 与 model rels 中使用单引号属性的合法 XML 关系条目，不再因为属性引号风格不同而静默退化成空值关系
  - relationship entry 缺少 `Target`、`Id` 或 `Type` 时，现在会在 loader 阶段抛出带文件路径的明确 error，而不是把损坏关系留到后续 builder 或 texture 收集阶段才暴露
  - `test/loader.parse.test.ts` 与 `test/error-handling.test.ts` 已新增 focused coverage，锁定单引号关系解析与 malformed relationship 诊断
- 2026-03-30 已继续收敛 builder 侧 relationship target 兼容性：
  - `fast3mfBuilder()` 现在会归一化 root model relationship、texture relationship 与 texture resource path 的前导斜杠，避免因为 target/path 形态不同而误报缺模型或缺纹理
  - `test/builder.test.ts` 已新增 focused coverage，锁定 root relationship target 与 texture relationship target 在无前导斜杠时仍可正常构建
- 2026-03-29 已确认 `docs/superpowers/specs/2026-03-29-benchmark-threejs-comparison-design.md`，
  并新增 `docs/superpowers/plans/2026-03-29-benchmark-threejs-comparison.md`
  作为实现接力入口
- 2026-03-29 已完成 `three.js` 默认 `ThreeMFLoader` benchmark 对照接线：
  - `npm run benchmark` 现在同时输出 `fast-3mf-loader` 与 `three.js` 的同机对照表
  - `three.js` 默认 loader 在 benchmark 中采用 fused parse+build 口径：`three Parse` 记录总耗时，`three Build` 固定为 `0.0ms`
  - `three.js` 对照失败不会截断 fast 一侧的 measured runs，也不会让 benchmark / `release:check` 因对照项直接失败
  - `test/benchmark-core.test.ts`、`test/benchmark-threejs-adapter.test.ts` 与 `docs/benchmarking.md` 已同步到这条口径
- 2026-03-29 已用固定 release preset 刷新 benchmark sample：
  - 执行命令为 `npm run benchmark:release`
  - 文档样本已改为 `warmupRuns=2`、`measuredRuns=7`、`workerCount=6`
  - 当前样本下 `multipletextures.3mf` 为 `391.4 / 3.4 / 397.6ms`，`truck.3mf` 为 `551.7 / 18.6 / 571.7ms`
- 2026-03-29 已确认 three.js benchmark DOM fallback 方向：
  - 先把 `benchmark-threejs-adapter` 的 XML parser 从 `linkedom` 切到 `@xmldom/xmldom`
  - 目标是验证 three.js 对照失败是否主要来自当前 Node XML namespace 兼容性
  - 如果 `@xmldom/xmldom` 仍然不够，再升级到 `jsdom`
- 2026-03-29 已新增 `docs/superpowers/plans/2026-03-29-threejs-benchmark-dom-fallback.md`
  作为 DOM fallback 实现接力入口
- 2026-03-29 已完成 three.js benchmark DOM fallback：
  - 已确认根因不是 `ThreeMFLoader` 本身无法处理 `multipletextures.3mf` / `truck.3mf`，而是 `linkedom` 无法满足 namespaced XML selector 语义
  - `@xmldom/xmldom` 已被验证为能力不足，因为它在这条路径下不提供 three.js 需要的 `querySelectorAll`
  - benchmark harness 现已改为每次 `measureThreeFixture()` 调用单独创建并释放 `jsdom` `DOMParser` provider，避免跨 fixture 复用 window 导致的 Node heap OOM
  - `npm run benchmark` 与 `npm run benchmark:release` 现在都能稳定完成，且 `three.js` 对照在两个大 fixture 上都返回 `ok (fused parse+build)`
  - `test/benchmark-threejs-adapter.test.ts` 已锁定 per-parse DOM provider 生命周期回归
- 2026-03-29 已完成 three.js benchmark XML parser 依赖清理：
  - 当前运行时只保留 `jsdom` 作为 benchmark adapter 的 XML `DOMParser` 实现
  - `linkedom` 与 `@xmldom/xmldom` 已从当前依赖中移除，不再作为测试或运行时前提
  - `test/benchmark-threejs-adapter.test.ts` 已收敛为 `jsdom-only` 路径，不再保留历史 parser capability gate 的直接依赖
- 2026-03-29 已修复 CI / `check:test` 的 `jsdom` 类型声明回归：
  - `package.json` 已补 `@types/jsdom`，`test/benchmark-threejs-adapter.test.ts` 不再因 `TS7016` 阻断 TypeScript test typecheck
  - `test/release-gates.test.ts` 已新增 manifest 回归测试，锁定 `jsdom` 运行时依赖与类型依赖必须一起存在
  - 已重新执行 `npm run verify`，当前 `check:demo`、`check:test`、`vitest` 与 `build` 均通过

## In Progress

- 当前执行入口优先围绕四个 phase：claim alignment、performance hardening、usability / API stability、release readiness。
- 当前剩余主线收敛为 Phase 2 / 3：
  - 继续以 `multipletextures.3mf` 与 `truck.3mf` 维持 benchmark-backed performance evidence
  - 继续稳定 API / error / runtime ergonomics，收敛剩余 `1.0` blocker
- 2026-03-28 当前这轮接力先落在 Phase 2 evidence hardening：
  - `benchmark:release` 与 `release:check` 已验证通过，当前 benchmark methodology 的主要收口点已经从“确定命令入口”切到“发布前在 release machine 刷新一次样本”
- 2026-03-29 当前继续动作：
  - 已从 Phase 2 切入 Phase 3，先处理 `workerCount` 非法值原本会静默回退、以及非 `ArrayBuffer` 输入原本会落入底层错误的问题
  - 下一步继续检查 warning / error 语义里是否还存在类似的“静默回退但缺少诊断信息”缺口，目前已覆盖非法参数、错误输入类型、worker runtime prerequisite、未知单位 warning、archive manifest fallback、SAX parser error event，以及 builder 侧缺失引用 / 旧错误前缀 / 资源 warning 残留
- 2026-03-29 当前 benchmark 相关收口点已从“让 three.js 对照跑起来”切到“保留稳定证据并继续推进 1.0 其余 blocker”
- 2026-03-29 当前 release readiness 的剩余动作已进一步收敛到“在真正发布前于目标 release machine 刷新一次 benchmark evidence”，而不是继续拆散 workflow 前置检查入口

## Next Up

- 优先继续 Phase 3：围绕公开 API、warning/error 语义、浏览器运行前提继续稳定 `1.0` first-use ergonomics。
- 发布前在目标 release machine 上执行一次 `npm run release:check`，并用 `benchmark:release` 的输出刷新 benchmark 样本。
- 在真正发布 `1.0` 前，用 `npm run release:check` 作为固定收口命令。

## Open Risks / Decisions

- 新摘要必须保持轻量，否则很容易再次退化成需要整仓阅读的大文档。
- `Stream Parsing` 当前 README 文案与 `parse(ArrayBuffer)` 公开 API 存在张力；`1.0` 默认选择对齐 claim，而不是仓促扩新 API。
- roadmap 只做高层导航，不重复 specs/plans 的实现清单。
- 如果未来公开 API、support matrix 或长期主线发生变化，需要及时同步 context、roadmap 和 status，而不是只改 README 或单个 spec。

## Pointers

- Governance bootstrap design：
  `docs/superpowers/specs/2026-03-28-superpowers-governance-bootstrap-design.md`
- Governance bootstrap plan：
  `docs/superpowers/plans/2026-03-28-superpowers-governance-bootstrap.md`
- Parse stabilization design：
  `docs/superpowers/specs/2026-03-28-parse-pipeline-stabilization-design.md`
- Performance hotspots design：
  `docs/superpowers/specs/2026-03-28-performance-hotspots-design.md`
- Stable 1.0 roadmap design：
  `docs/superpowers/specs/2026-03-28-stable-1-0-roadmap-design.md`
- Stable 1.0 roadmap plan：
  `docs/superpowers/plans/2026-03-28-stable-1-0-roadmap.md`
- Support matrix：
  `docs/support-matrix.md`
