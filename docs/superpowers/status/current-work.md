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

## In Progress

- 创建 `docs/superpowers/context/*`、`docs/superpowers/status/current-work.md`、`docs/superpowers/roadmap/current-roadmap.md`。
- 更新仓库根部 `AGENTS.md`，让它引用真实存在、职责分明的入口文档。

## Next Up

- 完成 roadmap summary 并把它接入 `AGENTS.md`。
- 用新的 handoff 入口承接后续 performance hotspots 与 capability clarity 工作。

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
