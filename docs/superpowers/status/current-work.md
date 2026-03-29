# Current Work

## Current Focus

- 把项目长期方向收敛到 `稳态 1.0` 发布：围绕 README 已承诺的性能、WebWorker、TypeScript、浏览器兼容性和易用性，定义清晰的 release gates，并把后续执行拆成可连续交付的阶段。

## Why It Matters

- 仓库已经具备 parse stabilization、fixture-backed tests、support matrix 和 benchmark split 等 `1.0` 前置条件，但 summary docs 仍停留在更早的 workstream 视角。
- 把 roadmap、status 和 implementation plan 一起收敛到 `稳态 1.0` 方向后，后续会话可以直接围绕 release gates 推进，而不是重新判断“该继续扩能力，还是先稳定发布”。

## Latest Completed

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
  - 下一步继续检查 warning / error 语义里是否还存在类似的“静默回退但缺少诊断信息”缺口，目前已覆盖非法参数、错误输入类型、worker runtime prerequisite，以及 builder 侧缺失引用 / 旧错误前缀 / 资源 warning 残留
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
