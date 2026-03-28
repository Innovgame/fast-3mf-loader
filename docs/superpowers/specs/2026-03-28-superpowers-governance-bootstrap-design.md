# Superpowers Governance Bootstrap Design

**Date:** 2026-03-28

## Summary

This design adapts the borrowed `AGENTS.md` workflow to the actual state of `fast-3mf-loader`. The repository already has useful design and planning documents under `docs/superpowers/specs/` and `docs/superpowers/plans/`, but it does not yet have the lightweight context, status, and roadmap summaries that the current `AGENTS.md` expects.

The work will bootstrap that governance layer by creating project-specific summary documents and updating `AGENTS.md` so future sessions can reliably resume work from a single entrypoint.

## Goals

- Create the missing `docs/superpowers/context/*` and `docs/superpowers/status/*` summary documents that the repository workflow depends on
- Add a roadmap-level summary that links current long-term workstreams to the existing specs and plans
- Update `AGENTS.md` so it points to real project documents instead of references copied from another repository
- Keep the new summaries aligned with the current library architecture, support boundaries, and recent implementation direction
- Make future agent sessions resumable without rereading the entire repository history

## Non-Goals

- No change to the public library API
- No change to the parser or builder implementation
- No speculative roadmap that goes beyond the current documented direction
- No attempt to backfill every historical task or document the full project history in the new summaries

## Current Problems

The repository currently has a gap between its documented workflow and its actual files:

1. `AGENTS.md` tells future agents to read three summary files that do not exist yet.
2. The repo has detailed plans and specs, but no single lightweight entrypoint that summarizes architecture, user preferences, and current handoff status.
3. There is no dedicated roadmap summary that explains how the existing stabilization and performance documents fit together.
4. Without a `current-work.md` handoff file, new sessions must reconstruct recent context by scanning plans, specs, and commit history manually.

These are workflow and continuity problems rather than code-quality problems, but they directly affect collaboration quality and decision consistency.

## Proposed Design

### 1. Keep `AGENTS.md` As The Workflow Gate

`AGENTS.md` remains the repository-level instruction file, but it should stop acting like an imported template and instead describe the real document flow for this project.

It should instruct future agents to read, in order:

1. `docs/superpowers/context/current-architecture-context.md`
2. `docs/superpowers/context/user-preferences.md`
3. `docs/superpowers/status/current-work.md`
4. `docs/superpowers/roadmap/current-roadmap.md`

It should also explain when to continue into the detailed `specs/` and `plans/` documents.

### 2. Add A Stable Architecture Summary

Create:

- `docs/superpowers/context/current-architecture-context.md`

This file should be the repository-level single-entry architecture summary. It should capture stable facts that are useful across many sessions:

- project purpose and runtime focus
- public API entrypoints
- major internal module boundaries
- support boundaries and notable unsupported areas
- links to the most relevant specs, plans, and support documentation

This file should summarize current architecture without duplicating whole specs.

### 3. Add A Long-Lived User Preference Summary

Create:

- `docs/superpowers/context/user-preferences.md`

This file should capture stable collaboration preferences that affect how work is approached across sessions. It should not contain temporary task-specific wishes.

Expected content:

- read summary docs before proposing design or making repo-wide edits
- align design and implementation with existing specs and plans
- surface conflicts with roadmap or architecture anchors before proceeding
- keep `current-work.md` updated at task start, during major progress, and at task completion
- prefer concise Chinese narrative around workflow while keeping file paths and code identifiers explicit

### 4. Add A Dedicated Handoff Status File

Create:

- `docs/superpowers/status/current-work.md`

This file should be the single handoff document for active work. It should summarize:

- current project focus
- why that focus matters
- latest completed milestone or change
- work currently in progress
- next suggested tasks
- open risks or decisions
- pointers to the most relevant plans or specs

The file should stay short enough to scan quickly, but specific enough that a new session can continue productively.

### 5. Add A Roadmap Summary Layer

Create:

- `docs/superpowers/roadmap/current-roadmap.md`

This file should act as the long-term navigation layer between the lightweight summaries and the detailed plans/specs. It should organize the repository's current direction into a few durable workstreams:

- library stability and predictable behavior
- parse and builder performance improvements
- supported-feature clarity and future capability expansion

Each workstream should briefly state:

- current status
- why it matters
- the primary linked spec(s) and plan(s)

The roadmap should stay high-level and should link out instead of restating plan checklists.

## Source Material For The New Summaries

The new governance files should be derived from the repository's current documented reality:

- `README.md`
- `README-zh.md`
- `docs/support-matrix.md`
- `docs/benchmarking.md`
- `docs/superpowers/specs/2026-03-28-parse-pipeline-stabilization-design.md`
- `docs/superpowers/specs/2026-03-28-performance-hotspots-design.md`
- `docs/superpowers/plans/2026-03-28-library-stabilization.md`
- `docs/superpowers/plans/2026-03-28-parse-pipeline-stabilization.md`
- `docs/superpowers/plans/2026-03-28-performance-hotspots.md`
- recent commits that show parse-pipeline stabilization landing

The bootstrap work should summarize these sources rather than inventing a conflicting narrative.

## Content Boundaries

### `current-architecture-context.md`

Should include:

- stable architecture facts
- public API boundaries
- module responsibility summary
- support status anchors

Should not include:

- per-session task logs
- speculative future features without a linked roadmap item
- long implementation checklists

### `user-preferences.md`

Should include:

- long-lived collaboration preferences
- decision-making expectations
- documentation-maintenance expectations

Should not include:

- current task details
- temporary preferences from a single conversation

### `current-work.md`

Should include:

- current handoff state
- immediate next steps
- open decisions or risks

Should not include:

- full historical changelog
- architecture details that belong in the context summary

### `current-roadmap.md`

Should include:

- high-level workstreams
- current direction and priorities
- links to detailed plans and specs

Should not include:

- checkbox-level implementation steps
- duplicated milestone prose copied from plan files

## Update Workflow

### `current-work.md`

Update when:

- starting a new task
- reaching a meaningful milestone
- finishing a task

Expected update pattern:

- refresh `Current Focus`
- move completed work into `Latest Completed`
- keep `Next Up` current
- record blocking risks or decisions explicitly

### `current-architecture-context.md`

Update only when stable project facts change, such as:

- public API changes
- major module boundary changes
- support boundary changes
- roadmap anchor changes that affect overall architecture understanding

### `user-preferences.md`

Update only when repeated collaboration behavior demonstrates a durable preference.

### `current-roadmap.md`

Update when major workstreams change phase, priority, or linkage to detailed plans/specs.

## Initial Content Direction

The first bootstrap version should reflect the repository's current state:

- public API centered on `Fast3MFLoader` and `fast3mfBuilder`
- browser-oriented runtime with worker-based parsing
- parser pipeline recently stabilized through `parse-events.ts` and `parse-dispatch.ts`
- performance optimization as the next major workstream
- support status grounded in `docs/support-matrix.md`
- print tickets still treated as unsupported

## Risks And Guardrails

### Risk: The New Summaries Drift From Real Code

Guardrail:

- derive content from existing specs, plans, support docs, and recent commits
- keep summaries short and link to deeper documents for detail

### Risk: `current-work.md` Turns Into A Log Dump

Guardrail:

- keep it focused on current handoff state, not historical narration
- update only the sections needed for continuity

### Risk: Roadmap Duplicates Existing Plans

Guardrail:

- make roadmap documents navigational
- link to plans instead of reproducing their checklists

### Risk: Imported Template Language Survives In The Repo

Guardrail:

- rewrite `AGENTS.md` and the new summaries in project-specific language
- remove references to missing files or assumptions copied from other repositories

## File-Level Impact

Expected implementation impact:

- Modify: `AGENTS.md`
- Create: `docs/superpowers/context/current-architecture-context.md`
- Create: `docs/superpowers/context/user-preferences.md`
- Create: `docs/superpowers/status/current-work.md`
- Create: `docs/superpowers/roadmap/current-roadmap.md`

## Acceptance Criteria

This bootstrap is successful when all of the following are true:

- `AGENTS.md` only references files that exist in this repository
- a new session can read the summary docs and understand the current project direction without scanning the whole repo
- roadmap, context, and status responsibilities are clearly separated
- the new documents do not conflict with the current support matrix, specs, or plans
