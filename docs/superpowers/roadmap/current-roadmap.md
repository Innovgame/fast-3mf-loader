# Current Roadmap

## Stable 1.0 Release

- Status：已确认长期方向。`1.0` 走“稳态发布”而不是“能力扩张发布”，优先把当前已支持能力做成可验证、可维护、可发布的浏览器优先库。
- Why it matters：README 已经对外承诺了 `Stream Parsing`、`Multi-threaded Processing`、`Lightweight and Efficient`、`TypeScript Support`、`Browser Compatible`。`1.0` 的关键是把这些承诺收敛成真实的 release gates，而不是继续扩 format 支持面。
- Primary references：
  - `docs/superpowers/specs/2026-03-28-stable-1-0-roadmap-design.md`
  - `docs/superpowers/plans/2026-03-28-stable-1-0-roadmap.md`

## Phase 1: Claim Alignment

- Status：当前优先级最高。重点是 README、README-zh、support matrix、类型导出和示例代码要与当前真实能力一致。
- Why it matters：如果 `Stream Parsing`、浏览器兼容性、支持范围的文案比真实能力更激进，`1.0` 会带着错误承诺发布。
- Primary references：
  - `README.md`
  - `README-zh.md`
  - `docs/support-matrix.md`
  - `docs/superpowers/specs/2026-03-28-stable-1-0-roadmap-design.md`

## Phase 2: Performance Hardening

- Status：持续进行中，并且是 `1.0` 的核心阻塞项之一。当前 benchmark 与热点优化已经落地，但还需要持续用大 fixture 维持证据链。
- Why it matters：`multipletextures.3mf` 与 `truck.3mf` 仍然代表真实 parse/build 成本；性能主张必须建立在 benchmark phase split 和 focused regression coverage 之上。
- Primary references：
  - `docs/superpowers/specs/2026-03-28-performance-hotspots-design.md`
  - `docs/superpowers/plans/2026-03-28-performance-hotspots.md`
  - `docs/benchmarking.md`

## Phase 3: Usability And API Stability

- Status：待系统化收敛。公开 API 已经有基础测试锚点，但 `workerCount` 默认策略、错误模型、warning 语义、首次接入路径仍要以 `1.0` 标准重新审视。
- Why it matters：稳态 `1.0` 的重点是“第一次接入能成功”和“失败时知道为什么”，而不是继续增加新 feature surface。
- Primary references：
  - `docs/superpowers/plans/2026-03-28-library-stabilization.md`
  - `test/public-api.test.ts`
  - `test/types.test.ts`
  - `test/runtime-behavior.test.ts`
  - `test/error-handling.test.ts`

## Phase 4: Release Readiness

- Status：待执行。CI 和 npm publish workflow 已存在，但还要收敛成面向 `1.0` 的固定验证清单、打包检查和 release notes 流程。
- Why it matters：如果没有明确的发布门槛，`1.0` 会退化成一次普通版本发布，而不是稳定契约的起点。
- Primary references：
  - `.github/workflows/ci.yml`
  - `.github/workflows/npm-publish.yml`
  - `package.json`
  - `docs/superpowers/specs/2026-03-28-stable-1-0-roadmap-design.md`

## Post-1.0

- `1.1+` 再考虑真正的 chunked input public API。
- `1.1+` 再评估 `Print Ticket` 和更多 extension resources 的端到端支持。
- `1.1+` 再决定是否扩展更完整的非浏览器运行时叙事。

## Reading Order

- 先读 `docs/superpowers/context/current-architecture-context.md`，建立稳定背景。
- 再读 `docs/superpowers/status/current-work.md`，确认当前处于哪个 phase、最近完成了什么、下一步是什么。
- 如果要讨论 `1.0` 范围、发布门槛或路线冲突，再读 `docs/superpowers/specs/2026-03-28-stable-1-0-roadmap-design.md`。
- 如果要开始逐项执行，再读 `docs/superpowers/plans/2026-03-28-stable-1-0-roadmap.md`。
