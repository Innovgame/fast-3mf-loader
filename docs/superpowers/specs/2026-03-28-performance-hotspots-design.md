# Performance Hotspots Optimization Design

**Date:** 2026-03-28

## Summary

This design targets end-to-end performance improvements for `fast-3mf-loader` on large, realistic fixtures without changing the public API. The optimization scope includes both parsing (`Fast3MFLoader#parse`) and scene construction (`fast3mfBuilder`), but prioritizes the hotspots that dominate total time for `multipletextures.3mf` and `truck.3mf`.

The work must preserve the current package surface:

- `Fast3MFLoader`
- `fast3mfBuilder`
- exported type aliases and documented runtime behavior

## Goals

- Reduce total benchmark time for `multipletextures.3mf`
- Reduce total benchmark time for `truck.3mf`
- Make benchmark output show parse time and build time separately, so improvements can be attributed to the correct phase
- Add fixture-backed tests that protect texture-heavy and component-heavy behavior while internal performance work lands

## Non-Goals

- No public API redesign
- No format-expansion work such as full print ticket support
- No speculative optimization of tiny fixtures unless it naturally falls out of the large-fixture work
- No broad refactor of unrelated modules only for style reasons

## Success Criteria

This design is considered successful when all of the following are true:

- The updated benchmark reports separate parse and build timings for each fixture
- On the same machine, the updated benchmark shows reduced total time for both `multipletextures.3mf` and `truck.3mf`
- Existing supported behaviors remain intact for base materials, texture groups, vertex colors, and components
- The full verification set still passes: library typecheck, demo typecheck, test typecheck, test suite, and production build

## Current Performance Risks

Based on the current code layout, the most likely hotspots are:

1. `Fast3MFLoader#parse()` does extra bookkeeping work on hot paths that scales with model-part count, including repeated progress aggregation and multiple archive classification branches.
2. Relationship parsing and texture extraction still perform work eagerly even when only a subset of data is needed later.
3. `fast3mfBuilder()` performs multiple passes over mesh/resource data and relies on repeated object cloning and per-mesh reconstruction, which is especially expensive for component-heavy and texture-heavy inputs.
4. Benchmark output only reports total parse time, which hides whether the bottleneck lives in parsing or building.

## Proposed Design

### 1. Parse-Path Hotspot Reduction

The parser path will keep the same output shape, but reduce repeated work in large archives:

- Replace progress aggregation logic that repeatedly sums the whole progress array with an incremental accumulator
- Consolidate archive file classification into a tighter single-pass scan with explicit buckets for root model, sub-models, textures, relationships, and unsupported print ticket payloads
- Avoid unnecessary temporary allocations when assembling `model`, `texture`, and relationship data
- Keep unsupported print ticket detection, but ensure it does not introduce additional work beyond a single classification branch

The parser result format must remain unchanged.

### 2. Builder-Path Hotspot Reduction

The builder path is expected to deliver the biggest wins for `multipletextures.3mf` and `truck.3mf`, so the design prioritizes reducing redundant traversal and reconstruction work:

- Introduce clearer internal caching boundaries for built objects and reusable derived data
- Avoid repeated resource analysis when multiple build items reference the same object graph
- Reduce unnecessary cloning and intermediate object creation in component assembly
- Tighten geometry/material creation paths so textured meshes and component meshes do the minimum required work per object

This is an internal rewrite of hotspots, not a behavioral rewrite. Output still needs to be a usable `THREE.Group` with the same supported feature behavior.

### 3. Benchmark Evolution

The benchmark harness will be extended to measure:

- parse time
- build time
- total end-to-end time

for each fixture, with emphasis on:

- `multipletextures.3mf`
- `truck.3mf`

The benchmark remains a reproducible developer tool rather than a flaky pass/fail performance test. It should help explain where wins came from, not serve as a strict CI gate.

### 4. Regression Coverage

Performance work will be protected by additional regression tests around the two target scenarios:

- texture-heavy fixture coverage for `multipletextures.3mf`
- component-heavy fixture coverage for `truck.3mf`

The tests should continue to validate behavior, not wall-clock timing. The benchmark script is the source of timing evidence; the test suite is the source of correctness evidence.

## File-Level Impact

The work is expected to center on:

- `lib/fast-3mf-loader.ts`
- `lib/3mf-builder.ts`
- `scripts/benchmark.mjs`
- `docs/benchmarking.md`
- `test/builder.test.ts`
- `test/support-matrix.test.ts`
- additional targeted benchmark or fixture tests if needed

Helper extraction is allowed if it makes hotspot logic easier to reason about, but the public entry points must stay stable.

## Testing Strategy

The implementation plan should require verification in three layers:

1. Type safety
   - library typecheck
   - demo typecheck
   - test typecheck
2. Functional correctness
   - full Vitest suite
   - any new targeted fixture tests for texture and component scenarios
3. Performance observation
   - `npm run build`
   - `npm run benchmark`
   - before/after benchmark comparison documented in `docs/benchmarking.md`

## Risks And Guardrails

### Risk: Hidden Builder Regressions

Builder optimizations can still produce visually wrong output even if the code typechecks. To contain that risk:

- keep fixture-backed tests focused on textured and component-heavy paths
- prefer changing one hotspot at a time
- keep reusable caches internal and explicit

### Risk: Benchmark Noise

Machine variance can blur small wins. To keep the signal useful:

- compare before/after on the same machine
- report parse/build/total separately
- prioritize clear reductions on the target large fixtures rather than chasing tiny changes on small fixtures

### Risk: Accidental API Drift

This work must not change exported names, return shapes, or documented support status. Any internal helper extraction must remain behind the existing public API.

## Recommended Execution Approach

The implementation plan should break this into small, benchmark-backed tasks:

1. Extend the benchmark so it exposes parse/build/total timing separately
2. Optimize parser hotspots with focused regression tests
3. Optimize builder hotspots for texture-heavy and component-heavy fixtures
4. Refresh benchmark documentation with before/after evidence

This keeps performance work evidence-driven and reduces the chance of broad refactors without measurable wins.
