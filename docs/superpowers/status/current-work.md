# Current Work

## Current Focus

- 补齐仓库级 superpowers governance layer，让后续会话可以从轻量的 context、status、roadmap 摘要继续工作，而不是每次重建上下文。

## Why It Matters

- 当前仓库已经有较完整的 specs、plans 和测试资产，但 `AGENTS.md` 仍引用不存在的摘要文件，导致工作流无法直接执行。
- 把这层治理文档补齐后，新会话能先读摘要再下钻，能显著降低接力成本，也能减少与当前架构/路线冲突的改动。

## Latest Completed

- 2026-03-28 完成 parse pipeline stabilization，包括 `parse-events.ts`、`parse-dispatch.ts` 的边界拆分，以及对应的 focused coverage。
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

## In Progress

- 通过新 summary docs 维持后续任务接力，而不是继续依赖临时上下文重建。
- 正在规划面向 `1.0` 发布的 roadmap，方向收敛为“稳态 1.0”：围绕 README 中已承诺的 stream parsing、WebWorker、多线程性能、TypeScript、浏览器兼容性，优先提高性能、易用性和发布可预期性，而不是先扩 format 支持面。
- `docs/superpowers/specs/2026-03-28-stable-1-0-roadmap-design.md` 已写出初稿，等待用户 review 后再决定是否同步更新 `current-roadmap.md` 和拆成执行计划。

## Next Up

- 继续推进 performance hotspots workstream，按 benchmark phase split 做证据化优化。
- 持续校准 capability clarity，包括 support matrix、README 和 fixture-backed behavior 的一致性。

## Open Risks / Decisions

- 新摘要必须保持轻量，否则很容易再次退化成需要整仓阅读的大文档。
- roadmap 只做高层导航，不重复 specs/plans 的实现清单。
- 如果未来公开 API、support matrix 或长期主线发生变化，需要及时同步 context 与 roadmap，而不是只改 README 或单个 spec。

## Pointers

- Governance bootstrap design：
  `docs/superpowers/specs/2026-03-28-superpowers-governance-bootstrap-design.md`
- Governance bootstrap plan：
  `docs/superpowers/plans/2026-03-28-superpowers-governance-bootstrap.md`
- Parse stabilization design：
  `docs/superpowers/specs/2026-03-28-parse-pipeline-stabilization-design.md`
- Performance hotspots design：
  `docs/superpowers/specs/2026-03-28-performance-hotspots-design.md`
- Support matrix：
  `docs/support-matrix.md`
