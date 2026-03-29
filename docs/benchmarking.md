# Benchmarking

`fast-3mf-loader` includes a reproducible benchmark harness so the README can point to measured data instead of speculative performance claims.

## Command

```bash
npm run build
npm run benchmark
```

The benchmark imports the built `dist/fast-3mf-loader.js` bundle, runs end-to-end parse/build measurements against the large supported fixtures in `3mf/`, and reports median parse, build, and total times alongside the min/max spread from the measured runs.
It also runs the same fixtures through the default `three.js` `ThreeMFLoader` so the benchmark output includes a same-machine comparison baseline instead of only a single-library sample.

For the stable `1.0` release gate, use the fixed release preset instead of retyping environment variables:

```bash
npm run benchmark:release
```

Optional overrides for deeper sampling or release-machine calibration:

```bash
FAST3MF_BENCHMARK_WARMUP_RUNS=2 \
FAST3MF_BENCHMARK_MEASURED_RUNS=7 \
FAST3MF_BENCHMARK_WORKERS=6 \
npm run benchmark
```

## Methodology

- Runtime: Node 22 with a small Worker compatibility shim backed by `node:worker_threads`
- Comparison runtime: `three.js` `ThreeMFLoader` with a `linkedom` `DOMParser` polyfill inside the benchmark harness
- Fixtures: `multipletextures.3mf`, `truck.3mf`
- Warmup: 1 parse per fixture before measurements
- Measured runs: 5 parse/build passes per fixture
- Worker count: `min(hardwareConcurrency - 1, 15)` to mirror the loader default
- Phase semantics:
  - `fast Parse`, `fast Build`, `fast Total` keep the existing parse/build split from `Fast3MFLoader` + `fast3mfBuilder`
  - `three.js` does not expose a separate public build step; in this harness `three Parse` is the full `ThreeMFLoader.parse(data)` wall-clock time, `three Build` is fixed at `0.0ms`, and `three Total` repeats the same fused total when parsing succeeds
  - If `three.js` cannot finish a fixture in this harness, its timing cells render as `unsupported/failed` and the short reason is printed below the main table
- Environment overrides:
  - `FAST3MF_BENCHMARK_WARMUP_RUNS`
  - `FAST3MF_BENCHMARK_MEASURED_RUNS`
  - `FAST3MF_BENCHMARK_WORKERS`

## Sample Results

Release preset sample run collected on 2026-03-29:

- Environment: Node `v22.13.1` on `darwin arm64`
- Worker count: `6`
- Command: `npm run benchmark:release`
- Sampling preset: warmup `2`, measured runs `7`
- Table values below are medians across the measured runs, not single-run point estimates
- Parse-heavy fixtures can still move materially across same-machine reruns, so treat these numbers as sample evidence instead of pass/fail thresholds
- `three unsupported` below means the default `three.js` loader did not complete that fixture in this Node benchmark harness; it is not a blanket statement about every runtime or integration

| Fixture | Size (KiB) | fast Parse | fast Build | fast Total | three Parse | three Build | three Total | Status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `multipletextures.3mf` | 3020.7 | 383.6 | 3.7 | 387.0 | `unsupported/failed` | `unsupported/failed` | `unsupported/failed` | `three unsupported` |
| `truck.3mf` | 2587.2 | 544.8 | 16.3 | 561.2 | `unsupported/failed` | `unsupported/failed` | `unsupported/failed` | `three unsupported` |

Run spread from the same sample:

- `multipletextures.3mf`: fast parse `370.2-424.8ms`, fast build `3.2-6.8ms`, fast total `373.8-429.0ms`
- `truck.3mf`: fast parse `502.8-622.4ms`, fast build `8.9-22.5ms`, fast total `520.0-638.7ms`

three.js fixture notes from the same sample:

- `multipletextures.3mf`: `THREE.3MFLoader: Unsupported resource type.`
- `truck.3mf`: `THREE.3MFLoader: Unsupported resource type.`

## Historical Large Fixture Comparison

These same-machine before/after numbers are the historical evidence from the original 2026-03-28 optimization pass. They are useful for showing why the builder-path changes landed, but the current benchmark output above is the authoritative sample to refresh when the environment or implementation changes.

| Fixture | Baseline Parse (ms) | Baseline Build (ms) | Baseline Total (ms) | Optimized Parse (ms) | Optimized Build (ms) | Optimized Total (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `multipletextures.3mf` | 345.0 | 22.8 | 367.7 | 348.9 | 4.3 | 353.1 |
| `truck.3mf` | 452.4 | 31.6 | 483.9 | 453.3 | 12.9 | 466.2 |

The builder-side wins are the clearest signal here: `multipletextures.3mf` dropped from `22.8ms` to `4.3ms` in build time, and `truck.3mf` dropped from `31.6ms` to `12.9ms` in the original optimization comparison. Parse time remains the noisier phase, so current runs should be interpreted with the spread lines in addition to the phase split.

## Stable 1.0 Benchmark Gate

Before publishing `1.0`, run `npm run release:check` on the release machine and refresh the large-fixture benchmark sample if the medians or spread moved materially. If the release machine is noisy, re-run with explicit sampling overrides instead of silently replacing the sample with a single quick local run.

`npm run release:check` now delegates benchmark evidence collection to `npm run benchmark:release`, which fixes `warmupRuns=2`, `measuredRuns=7`, and `workerCount=6` for the release-machine sample.

The release gate still belongs to `fast-3mf-loader` itself. A `three unsupported` or `three failed` comparison row does not make `release:check` fail on its own.

Run `node scripts/benchmark.mjs` after `npm run build` to refresh this section with current medians and spread for your machine.
