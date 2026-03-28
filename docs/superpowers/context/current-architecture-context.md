# Current Architecture Context

## Project Positioning

- `fast-3mf-loader` 是一个浏览器优先的 TypeScript 3MF 解析库，目标是在保持较低内存占用的同时提供更快的解析与构建性能。
- 当前公开入口稳定围绕两个导出展开：`Fast3MFLoader` 负责把 3MF archive 解析成 `ParseResult`，`fast3mfBuilder` 负责把解析结果构建成 `THREE.Group`。
- 项目仍处于 pre-1.0 阶段，因此允许继续做内部结构收敛和性能优化，但不应随意漂移公开 API、返回形状或当前已文档化的运行时行为。

## Architecture Anchors

### Parse Path

- `lib/fast-3mf-loader.ts`
  负责 archive 解压、文件分类、进度聚合和整体 parse 生命周期协调。
- `lib/parse-model.ts` 与 `lib/parse-model.worker.ts`
  负责 worker 内的模型解析、typed array 收尾以及 worker-safe 返回结果。
- `lib/parse.ts`
  现在应保持为编排层，只负责 parser 初始化、事件转交、Promise resolve/reject。
- `lib/parse-events.ts`
  负责把 EasySAX 原始回调归一化成内部 parse event，并持有短生命周期解析上下文。
- `lib/parse-dispatch.ts`
  负责标签分发、extract/create 组合调用，以及 end-tag 状态清理。
- `lib/node-extract.ts` 与 `lib/node-create.ts`
  继续保持“提取”和“状态写入”职责分离。

### Build Path

- `lib/3mf-builder.ts`
  负责把解析结果转换为 Three.js 场景对象。
- `lib/build-geometry.ts`
  负责热点路径中的几何数据拼装与 typed array 辅助逻辑。

### Runtime And Tooling

- `lib/unzip.ts`、`lib/unzip.worker.ts`、`lib/WorkerPool.ts`
  负责解压与 worker 生命周期。
- `scripts/benchmark.mjs` 与 `scripts/benchmark-core.mjs`
  负责 parse/build/total phase benchmark。
- `test/`
  以 fixture-backed regression tests 为主，覆盖 parser、builder、public API、support matrix、benchmark helpers 等关键边界。

## Public Surface And Behavioral Guardrails

- 公开入口以 `lib/main.ts` 导出的 `Fast3MFLoader`、`fast3mfBuilder` 及相关类型别名为准。
- 当前设计允许内部重构，但默认不改：
  - `Fast3MFLoader -> parseModelBuffer -> parse()` 主链路
  - `ParseResult` / `Model3MF` 等公开返回结构
  - builder 输出 `THREE.Group` 的契约
- 新工作如果会影响公开行为、支持矩阵或 benchmark 口径，应先回看对应 spec/plan，再决定是否需要扩展设计文档。

## Support Boundaries

- 当前已覆盖并有文档或测试锚点的能力包括：
  - archive unzip
  - root relationships (`_rels/.rels`)
  - multi-object / components
  - base mesh geometry
  - vertex color groups
  - texture resources 与 texture groups
  - additional `.model.rels` 关系解析
- `Print Ticket` 仍视为未支持能力；当前行为是返回空 `printTicket` 并发出 warning。
- 超出现有 fixture coverage 的 extension resources 不应被默认视为“已支持”，除非补上实现、测试和文档。

## Current Direction

- 已落地主线：
  - parse pipeline stabilization
  - parser boundary coverage
  - benchmark phase split
  - fixture-backed support matrix baseline
- 当前长期方向已收敛为 `稳态 1.0` 发布，而不是继续优先扩 format 支持面：
  - claim alignment：README、support matrix、类型和实际能力对齐
  - performance hardening：围绕大 fixture 保持 benchmark-backed 优化
  - usability / API stability：冻结公开契约、收敛 worker 与错误体验
  - release readiness：把验证、打包和发布说明做成固定门槛
- `1.1+` 再考虑：
  - 真正的 chunked input public API
  - `Print Ticket` 与更多 extension resources 支持
  - 更广泛的非浏览器运行时叙事

## Key References

- 项目概览：`README.md`
- 中文概览：`README-zh.md`
- 支持矩阵：`docs/support-matrix.md`
- Benchmark 流程：`docs/benchmarking.md`
- Parse pipeline stabilization design：
  `docs/superpowers/specs/2026-03-28-parse-pipeline-stabilization-design.md`
- Performance hotspots design：
  `docs/superpowers/specs/2026-03-28-performance-hotspots-design.md`
- Stable 1.0 roadmap design：
  `docs/superpowers/specs/2026-03-28-stable-1-0-roadmap-design.md`
- Library stabilization plan：
  `docs/superpowers/plans/2026-03-28-library-stabilization.md`
- Parse pipeline stabilization plan：
  `docs/superpowers/plans/2026-03-28-parse-pipeline-stabilization.md`
- Performance hotspots plan：
  `docs/superpowers/plans/2026-03-28-performance-hotspots.md`
