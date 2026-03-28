# Current Roadmap

## Workstream 1: Library Stability

- Status：进行中。parser boundary cleanup 已经落地，但围绕公开 API、一致错误模型、worker 生命周期和回归覆盖的稳定化工作仍然重要。
- Why it matters：项目仍处于 pre-1.0，外部可预期性和内部可维护性需要继续通过明确边界与 regression coverage 来巩固。
- Primary references：
  - `docs/superpowers/plans/2026-03-28-library-stabilization.md`
  - `docs/superpowers/specs/2026-03-28-parse-pipeline-stabilization-design.md`
  - `docs/superpowers/plans/2026-03-28-parse-pipeline-stabilization.md`

## Workstream 2: Performance Hotspots

- Status：当前下一阶段主线。parse pipeline boundary 已稳定后，性能热点优化成为更高优先级的增量工作。
- Why it matters：大型 fixture，尤其是 `multipletextures.3mf` 与 `truck.3mf`，仍然主导 parse/build 的真实成本，需要用 benchmark phase split 来驱动证据化优化。
- Primary references：
  - `docs/superpowers/specs/2026-03-28-performance-hotspots-design.md`
  - `docs/superpowers/plans/2026-03-28-performance-hotspots.md`
  - `docs/benchmarking.md`

## Workstream 3: Capability Clarity

- Status：持续进行中。重点不是盲目扩 format，而是把“已支持 / 未支持 / 有风险的部分支持”持续校准到文档和测试上。
- Why it matters：support claims 需要和 fixture-backed behavior、support matrix、README 叙述保持一致，否则很容易出现实现、测试和对外描述脱节。
- Primary references：
  - `docs/support-matrix.md`
  - `README.md`
  - `README-zh.md`

## Reading Order

- 先读 `docs/superpowers/context/current-architecture-context.md`，建立稳定背景。
- 再读 `docs/superpowers/status/current-work.md`，确认当前接力状态和下一步。
- 只有在任务涉及长期方向、架构冲突或需要深入执行细节时，再进入上面链接的 spec 和 plan。
