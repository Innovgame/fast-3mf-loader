# Parse Pipeline Stabilization Design

**Date:** 2026-03-28

## Summary

This design stabilizes the internal parse pipeline around [`lib/parse.ts`](../../../../lib/parse.ts) by reducing its responsibilities to orchestration only. The goal is to keep the current public API and runtime behavior intact while making SAX event handling, short-lived parse context, and state mutation easier to reason about and test.

The current parser path already works, but its control flow is harder to maintain than it needs to be because `parse.ts` currently mixes:

- SAX callback registration
- temporary metadata tracking
- tag-based dispatch
- direct coordination between extraction helpers and state mutation helpers

This design splits those concerns into smaller internal modules while preserving the current `Fast3MFLoader -> parseModelBuffer -> parse()` contract and the `ParseResult` shape.

## Goals

- Reduce the responsibility of `lib/parse.ts` to parser setup and orchestration
- Move SAX event normalization into a dedicated internal boundary
- Move tag-based dispatch and end-tag cleanup into a dedicated internal boundary
- Keep `node-extract.ts` focused on data extraction and `node-create.ts` focused on state mutation
- Preserve existing public API, runtime output, and supported-feature behavior
- Add targeted tests for parser event normalization and dispatch behavior

## Non-Goals

- No public API rename or return-shape change
- No new runtime feature support
- No change to current unsupported-feature policy
- No redesign of the worker contract used by `parse-model.ts`
- No rewrite of the overall parsing model into a new state machine architecture

## Current Problems

The current parse pipeline has a few structural risks even though it is functionally working:

1. `parse.ts` is acting as both orchestration layer and business logic layer.
2. Short-lived parser context such as metadata name tracking lives inside callback-local variables rather than inside a dedicated parse runtime boundary.
3. Tag-based logic is encoded as a long conditional chain in `detectAndCreateModels`, which makes it harder to add or audit behavior safely.
4. End-tag cleanup for current object/material/color/texture-group state is coupled directly to top-level event callbacks.
5. The current structure makes it harder to unit-test parse behavior without reading the whole SAX callback flow end to end.

These are maintainability and correctness risks rather than immediate user-facing bugs, so the design should improve internal boundaries without changing observable library behavior.

## Proposed Design

### 1. Turn `parse.ts` Into an Orchestration Layer

`parse.ts` should keep only the work that belongs at the top of the parse pipeline:

- initialize parser state
- register `EasySAXParser` callbacks
- start the provided streaming function
- forward normalized internal events into a dispatch function
- resolve or reject the parse promise

It should no longer directly encode tag-specific business rules or temporary metadata bookkeeping.

### 2. Introduce a Parse Event Normalization Layer

Add a dedicated internal module, expected shape:

- `lib/parse-events.ts`

This module will:

- define an internal `ParseEvent` union type
- convert raw SAX callbacks into normalized event objects
- own parser-local transient context such as the current metadata name
- make `startNode`, `endNode`, and `textNode` consistent for downstream consumers

This gives the rest of the parse pipeline a stable internal event vocabulary instead of raw SAX callback arguments.

The normalization layer should be the only place that knows about the exact `EasySAXParser` callback signature details beyond the top-level wiring in `parse.ts`.

### 3. Introduce a Parse Dispatch Layer

Add a dedicated internal module, expected shape:

- `lib/parse-dispatch.ts`

This module will:

- receive normalized `ParseEvent` values
- decide which extraction helper to call
- decide which creation/state-update helper to call
- own end-tag cleanup such as resetting `currentObjectId`, `currentBasematerialsId`, `currentColorGroupId`, and `currentTexture2dGroupId`

This removes tag-specific branching from `parse.ts` and gives the parser a single well-defined transition boundary.

The dispatcher remains imperative and close to the current implementation model. This is intentional: it improves structure without expanding scope into a full parser architecture rewrite.

### 4. Keep Extraction And Creation Layers Focused

`node-extract.ts` should remain the place that maps normalized event/input data into typed payloads.

`node-create.ts` should remain the place that mutates `StateType` using already-extracted payloads.

The refactor should not collapse these layers back together. Instead, the dispatcher should become the narrow composition point between them.

This preserves existing domain knowledge while making the control flow around it easier to test and maintain.

### 5. Preserve `parse-model.ts` Responsibilities

`parse-model.ts` should continue to own:

- streaming bytes into the SAX parser
- awaiting `parse()`
- converting mutable numeric arrays into typed arrays
- constructing the final `ParsedModelPart`
- collecting transferables for the worker response

This design does not move typed-array conversion into the new parser modules. That conversion remains a post-parse concern.

## Module Responsibilities

### `lib/parse.ts`

Responsibility:

- orchestration only

Should know about:

- parser setup
- `StateType`
- start/resolve/reject flow
- event normalization entrypoint
- dispatch entrypoint

Should not know about:

- metadata-name lifetime details
- tag-specific extraction logic
- state cleanup rules for individual tags

### `lib/parse-events.ts`

Responsibility:

- raw SAX callback input -> internal parse events

Should know about:

- callback argument shapes
- temporary metadata tracking
- normalized event typing

### `lib/parse-dispatch.ts`

Responsibility:

- normalized parse events -> extract/create/state transitions

Should know about:

- tag routing
- lifecycle cleanup on end tags
- which extract helper and create helper pair together

### `lib/node-extract.ts`

Responsibility:

- derive typed payloads from event data

### `lib/node-create.ts`

Responsibility:

- write typed payloads into `StateType`

### `lib/parse-model.ts`

Responsibility:

- stream input, call parse, finalize typed arrays, return worker-safe parsed data

## Type Design

The new internal types should favor explicit naming over ad hoc callback-local state:

- `ParseEvent`
- `ParseEventContext` or similar small runtime context type for transient parser-local state
- explicit event variants for start, end, and text cases

The refactor should keep existing public types stable:

- `ParseResult`
- `ParsedModelPart`
- `Model3MF`
- `ParseOptions`

This is an internal stabilization pass, not a public typing redesign.

## Testing Strategy

The implementation should add focused tests around the new internal boundaries while keeping current integration tests as regression guards.

### New Focused Tests

Expected new coverage:

- normalized metadata event flow
- end-tag cleanup behavior for object/material/color/texture-group state
- dispatcher routing for representative tags such as `model`, `metadata`, `object`, `triangle`, `item`, and texture/color groups

These tests should be small and deterministic, independent from fixture streaming where practical.

### Existing Regression Coverage That Must Stay Green

- [`test/loader.parse.test.ts`](../../../../test/loader.parse.test.ts)
- [`test/runtime-behavior.test.ts`](../../../../test/runtime-behavior.test.ts)
- [`test/types.test.ts`](../../../../test/types.test.ts)
- fixture-backed parser/builder tests already in the suite

The implementation plan should make these existing tests part of required verification so the refactor cannot silently change parser output shape or current behavior.

## Risks And Guardrails

### Risk: Internal Refactor Accidentally Changes Output Shape

Guardrail:

- keep public output types unchanged
- use existing parser/type regression tests as required verification

### Risk: Metadata Handling Changes Subtly

Guardrail:

- add focused tests around metadata name tracking and text-node association
- centralize metadata transient state in one normalization boundary

### Risk: Refactor Scope Expands Into Parser Redesign

Guardrail:

- keep dispatcher imperative and close to current behavior
- do not introduce a new general-purpose parsing framework or a new external abstraction layer

### Risk: File Split Creates Confusing Responsibility Overlap

Guardrail:

- define one clear responsibility per new file
- keep orchestration, normalization, dispatch, extraction, and mutation boundaries explicit

## File-Level Impact

Expected implementation impact:

- Modify: `lib/parse.ts`
- Create: `lib/parse-events.ts`
- Create: `lib/parse-dispatch.ts`
- Modify: `lib/node-extract.ts`
- Modify: `lib/node-create.ts`
- Modify: `lib/parse-model.ts`
- Add focused parser-boundary tests in `test/`

The exact test file names can be chosen in the plan, but they should be aligned to the new internal boundaries rather than added as broad integration-only tests.

## Success Criteria

This design is successful when all of the following are true:

- `parse.ts` is visibly smaller and limited to orchestration responsibilities
- normalized parse events are represented explicitly in internal types
- transient metadata tracking no longer lives as loose callback-local state inside `parse.ts`
- tag dispatch and end-tag cleanup are tested at a dedicated boundary
- public parser behavior and result shape remain unchanged
- the existing regression suite and type checks still pass

## Recommended Execution Approach

The implementation plan should break this work into small refactor-safe tasks:

1. Add focused tests for current parse-event and cleanup behavior
2. Introduce normalized parse-event types and context without changing external behavior
3. Move tag dispatch into a dedicated module
4. Shrink `parse.ts` to orchestration only
5. Run full parser/type/build verification

This sequencing keeps the refactor evidence-driven and reduces the chance of structural cleanup accidentally becoming behavioral change.
