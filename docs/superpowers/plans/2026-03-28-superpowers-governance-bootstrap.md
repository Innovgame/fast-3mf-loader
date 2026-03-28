# Superpowers Governance Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing superpowers context, status, and roadmap summaries to this repository and update `AGENTS.md` so future sessions can resume from real project-specific entry documents.

**Architecture:** Keep `AGENTS.md` as the workflow gate, then add a lightweight documentation layer under `docs/superpowers/` with clearly separated responsibilities for stable architecture context, long-lived user preferences, current handoff state, and roadmap navigation. The new files should summarize existing repository reality rather than introducing new product direction.

**Tech Stack:** Markdown documentation, Git, existing repository specs/plans/support docs

---

## File Map

- Modify: `AGENTS.md`
  Responsibility: repository-level workflow instructions that point to real summary documents
- Create: `docs/superpowers/context/current-architecture-context.md`
  Responsibility: stable architecture and support-boundary summary for the repository
- Create: `docs/superpowers/context/user-preferences.md`
  Responsibility: long-lived collaboration preferences for future sessions
- Create: `docs/superpowers/status/current-work.md`
  Responsibility: single current handoff status document for active work
- Create: `docs/superpowers/roadmap/current-roadmap.md`
  Responsibility: high-level navigation across stabilization, performance, and capability workstreams

## Task 1: Bootstrap Context And Status Directories

**Files:**
- Create: `docs/superpowers/context/current-architecture-context.md`
- Create: `docs/superpowers/context/user-preferences.md`
- Create: `docs/superpowers/status/current-work.md`

- [ ] **Step 1: Create the stable architecture summary**

```md
# Current Architecture Context

## Project Positioning

- `fast-3mf-loader` is a browser-oriented TypeScript library for parsing 3MF archives and building `THREE.Group` output.
- The public entrypoints are `Fast3MFLoader` for parsing and `fast3mfBuilder` for scene construction.
- The project is still pre-1.0, so internal cleanup is allowed as long as the public API and current runtime behavior stay stable.

## Architecture Anchors

- Archive handling starts in `lib/fast-3mf-loader.ts`, which unzips the 3MF archive, classifies payloads, and coordinates parse work.
- Worker-facing parse orchestration lives in `lib/parse-model.ts` and `lib/parse-model.worker.ts`.
- SAX event normalization is isolated in `lib/parse-events.ts`.
- Tag routing and state cleanup are isolated in `lib/parse-dispatch.ts`.
- Data extraction stays in `lib/node-extract.ts` and state mutation stays in `lib/node-create.ts`.
- Scene construction is handled separately in `lib/3mf-builder.ts` and related geometry helpers.

## Support Boundaries

- Supported behavior currently includes archive unzip, root relationships, multi-object/component models, base mesh geometry, vertex color groups, texture resources/texture groups, and additional `.model.rels` relationship resolution.
- Print tickets are not supported end-to-end yet; the parser returns an empty `printTicket` object and warns.
- Extension resources outside current fixture coverage should be treated as unsupported until covered by tests and documentation.

## Key References

- Product overview: `README.md`
- Chinese overview: `README-zh.md`
- Support boundaries: `docs/support-matrix.md`
- Parse pipeline stabilization design: `docs/superpowers/specs/2026-03-28-parse-pipeline-stabilization-design.md`
- Performance optimization design: `docs/superpowers/specs/2026-03-28-performance-hotspots-design.md`
- Library stabilization plan: `docs/superpowers/plans/2026-03-28-library-stabilization.md`
- Performance hotspots plan: `docs/superpowers/plans/2026-03-28-performance-hotspots.md`
```

- [ ] **Step 2: Create the long-lived user preference summary**

```md
# User Preferences

## Working Style

- Read the repository summary documents before proposing repo-wide design changes, implementation changes, or reviews.
- Calibrate new work against the current architecture summary, roadmap summary, and current handoff state before making assumptions.
- If a request conflicts with the current architecture anchors, roadmap direction, or documented support boundaries, call out the conflict and confirm before proceeding.

## Documentation Habits

- Keep `docs/superpowers/status/current-work.md` updated when a task starts, reaches a meaningful milestone, or finishes so later sessions can resume quickly.
- When writing new specs or plans, align them with the current summaries unless the task is explicitly changing architecture direction.
- Prefer concise Chinese narrative for workflow-oriented summaries while keeping file paths, command names, exported symbols, and code identifiers explicit.

## Execution Preferences

- Prefer project-specific summaries over generic template language.
- Keep summaries lightweight and navigational; detailed implementation reasoning belongs in `docs/superpowers/specs/` and `docs/superpowers/plans/`.
- Treat support-matrix and fixture-backed behavior as the source of truth for claimed capabilities.
```

- [ ] **Step 3: Create the current handoff status file**

```md
# Current Work

## Current Focus

- Bootstrap the repository-level superpowers governance layer so future sessions can resume from lightweight context, status, and roadmap summaries instead of reconstructing state from scratch.

## Why It Matters

- The repository already has useful specs and plans, but `AGENTS.md` currently points to summary files that do not exist.
- Adding these files turns the documentation workflow into something executable and lowers context-rebuild cost for new sessions.

## Latest Completed

- Parse pipeline stabilization landed on 2026-03-28, including the `parse-events.ts` and `parse-dispatch.ts` split and focused coverage around parser boundaries.
- A governance bootstrap design spec was added in `docs/superpowers/specs/2026-03-28-superpowers-governance-bootstrap-design.md`.

## In Progress

- Creating the missing `context/`, `status/`, and `roadmap/` summaries.
- Updating `AGENTS.md` so it references repository-specific entry documents.

## Next Up

- Finish the initial summary documents and wire them into `AGENTS.md`.
- Keep this file current as follow-up work moves into performance optimization and capability clarification.

## Open Risks / Decisions

- Keep the new summaries short enough to stay maintainable; detailed logic should continue living in specs and plans.
- Avoid introducing roadmap claims that exceed the already documented stabilization and performance direction.

## Pointers

- Governance bootstrap spec: `docs/superpowers/specs/2026-03-28-superpowers-governance-bootstrap-design.md`
- Parse stabilization design: `docs/superpowers/specs/2026-03-28-parse-pipeline-stabilization-design.md`
- Performance hotspots design: `docs/superpowers/specs/2026-03-28-performance-hotspots-design.md`
```

- [ ] **Step 4: Verify the files exist with the expected headings**

Run: `rg -n "^# " docs/superpowers/context/current-architecture-context.md docs/superpowers/context/user-preferences.md docs/superpowers/status/current-work.md`
Expected: one top-level `#` heading in each new file.

- [ ] **Step 5: Commit the context and status bootstrap**

```bash
git add docs/superpowers/context/current-architecture-context.md docs/superpowers/context/user-preferences.md docs/superpowers/status/current-work.md
git commit -m "docs: add superpowers context and status summaries"
```

## Task 2: Add A Repository Roadmap Summary

**Files:**
- Create: `docs/superpowers/roadmap/current-roadmap.md`

- [ ] **Step 1: Create the roadmap summary**

```md
# Current Roadmap

## Workstream 1: Library Stability

- Status: active foundation work, with parser-boundary cleanup already landed and broader stabilization still relevant.
- Why it matters: the package is still pre-1.0, so predictable API behavior, deterministic failures, and fixture-backed regressions are required before broader adoption.
- Primary references:
  - `docs/superpowers/plans/2026-03-28-library-stabilization.md`
  - `docs/superpowers/specs/2026-03-28-parse-pipeline-stabilization-design.md`
  - `docs/superpowers/plans/2026-03-28-parse-pipeline-stabilization.md`

## Workstream 2: Performance Hotspots

- Status: next major optimization track after parser-boundary stabilization.
- Why it matters: large fixtures such as `multipletextures.3mf` and `truck.3mf` still drive the most meaningful parse/build performance work.
- Primary references:
  - `docs/superpowers/specs/2026-03-28-performance-hotspots-design.md`
  - `docs/superpowers/plans/2026-03-28-performance-hotspots.md`
  - `docs/benchmarking.md`

## Workstream 3: Capability Clarity

- Status: ongoing documentation and regression coverage work.
- Why it matters: support claims should stay grounded in fixture-backed behavior and the published support matrix.
- Primary references:
  - `docs/support-matrix.md`
  - `README.md`
  - `README-zh.md`

## Reading Order

- Start with `docs/superpowers/context/current-architecture-context.md` for stable architecture context.
- Read `docs/superpowers/status/current-work.md` for the active handoff state.
- Use the linked plans and specs only when the task needs deeper design or implementation detail.
```

- [ ] **Step 2: Verify the roadmap links the right workstreams**

Run: `rg -n "Library Stability|Performance Hotspots|Capability Clarity" docs/superpowers/roadmap/current-roadmap.md`
Expected: all three workstream headings are present.

- [ ] **Step 3: Commit the roadmap summary**

```bash
git add docs/superpowers/roadmap/current-roadmap.md
git commit -m "docs: add superpowers roadmap summary"
```

## Task 3: Update AGENTS.md To Use The New Entry Documents

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/superpowers/status/current-work.md`

- [ ] **Step 1: Rewrite `AGENTS.md` to point at real project files**

```md
# AGENTS.md

在这个仓库中处理任务时，请先阅读以下文件，再开始分析、规划、实现或评审：

1. `docs/superpowers/context/current-architecture-context.md`
2. `docs/superpowers/context/user-preferences.md`
3. `docs/superpowers/status/current-work.md`
4. `docs/superpowers/roadmap/current-roadmap.md`

工作规则：

- `current-architecture-context.md` 是仓库级单入口背景摘要，用来快速建立对当前库结构、公开 API、支持边界和架构锚点的共同理解。
- `user-preferences.md` 是用户长期协作偏好摘要；如果它与默认执行方式冲突，以这里的偏好为准，除非用户在当前对话中明确覆盖。
- `current-work.md` 是当前任务接力入口，用于说明最近完成了什么、当前正在做什么、接下来优先做什么。
- `current-roadmap.md` 是长期方向导航页；如果任务涉及架构、路线图、优先级、长期方向或能力边界，请继续阅读 roadmap 中指向的 spec 与 plan。
- 对于仓库范围内的请求，在提出设计、评审结论或代码改动前，先用这些摘要校准判断。
- 如果请求与当前架构锚点、支持边界或 roadmap 冲突，请先指出冲突并在继续前获得确认。
- 开始新任务、推进任务到关键节点、完成任务后，应同步更新 `docs/superpowers/status/current-work.md`，保证新会话能继续接力。
- 编写新的 spec 或 plan 时，除非任务本身是在更新架构决策，否则应与这些摘要及其指向的源文档保持一致。
```

- [ ] **Step 2: Update `current-work.md` to reflect that the bootstrap is complete**

```md
## Latest Completed

- Parse pipeline stabilization landed on 2026-03-28, including the `parse-events.ts` and `parse-dispatch.ts` split and focused coverage around parser boundaries.
- The repository-level governance bootstrap is now in place: `AGENTS.md`, context summaries, status handoff, and roadmap navigation are all wired up.

## In Progress

- Track follow-up work through the new summary documents instead of relying on ad hoc context rebuilds.

## Next Up

- Continue with performance hotspot work and support-boundary clarification using the linked specs and plans.
```

- [ ] **Step 3: Verify `AGENTS.md` only points to existing files**

Run: `for file in docs/superpowers/context/current-architecture-context.md docs/superpowers/context/user-preferences.md docs/superpowers/status/current-work.md docs/superpowers/roadmap/current-roadmap.md; do test -f "$file" || exit 1; done`
Expected: command exits successfully with no output.

- [ ] **Step 4: Review the final diff for template leakage and broken references**

Run: `git diff -- AGENTS.md docs/superpowers/context/current-architecture-context.md docs/superpowers/context/user-preferences.md docs/superpowers/status/current-work.md docs/superpowers/roadmap/current-roadmap.md`
Expected: the diff shows only project-specific content and all referenced files exist.

- [ ] **Step 5: Commit the wired-up workflow**

```bash
git add AGENTS.md docs/superpowers/context/current-architecture-context.md docs/superpowers/context/user-preferences.md docs/superpowers/status/current-work.md docs/superpowers/roadmap/current-roadmap.md
git commit -m "docs: bootstrap superpowers governance workflow"
```

## Final Verification

- [ ] **Step 1: Run lightweight repository checks**

Run: `git diff --check && rg -n "docs/superpowers/(context|status|roadmap)" AGENTS.md`
Expected:
- `git diff --check` prints no whitespace errors
- `AGENTS.md` shows the four summary-document references

- [ ] **Step 2: Inspect git status**

Run: `git status --short`
Expected: clean working tree if all commits above were created successfully.
