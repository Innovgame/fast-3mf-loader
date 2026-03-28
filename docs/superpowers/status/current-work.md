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

- 当前执行入口优先围绕四个 phase：claim alignment、performance hardening、usability / API stability、release readiness。
- 当前剩余主线收敛为 Phase 2 / 3：
  - 继续以 `multipletextures.3mf` 与 `truck.3mf` 维持 benchmark-backed performance evidence
  - 继续稳定 API / error / runtime ergonomics，收敛剩余 `1.0` blocker

## Next Up

- 优先继续 Phase 2：Performance Hardening，观察大 fixture benchmark 是否还需要进一步优化或补充 evidence。
- 随后推进 Phase 3：围绕公开 API、warning/error 语义、浏览器运行前提继续稳定 `1.0` first-use ergonomics。
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
