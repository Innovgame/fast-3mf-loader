# Benchmarking

`fast-3mf-loader` includes a reproducible benchmark harness so the README can point to measured data instead of speculative performance claims.

## Command

```bash
npm run build
npm run benchmark
```

The benchmark imports the built `dist/fast-3mf-loader.js` bundle, runs end-to-end parse/build measurements against the large supported fixtures in `3mf/`, and reports median parse, build, and total times alongside the min/max spread from the measured runs.

Optional overrides for deeper sampling or release-machine calibration:

```bash
FAST3MF_BENCHMARK_WARMUP_RUNS=2 \
FAST3MF_BENCHMARK_MEASURED_RUNS=7 \
FAST3MF_BENCHMARK_WORKERS=6 \
npm run benchmark
```

## Methodology

- Runtime: Node 22 with a small Worker compatibility shim backed by `node:worker_threads`
- Fixtures: `multipletextures.3mf`, `truck.3mf`
- Warmup: 1 parse per fixture before measurements
- Measured runs: 5 parse/build passes per fixture
- Worker count: `min(hardwareConcurrency - 1, 15)` to mirror the loader default
- Environment overrides:
  - `FAST3MF_BENCHMARK_WARMUP_RUNS`
  - `FAST3MF_BENCHMARK_MEASURED_RUNS`
  - `FAST3MF_BENCHMARK_WORKERS`

## Sample Results

Optimized sample run collected on 2026-03-28:

- Environment: Node `v22.13.1` on `darwin arm64`
- Worker count: `9`
- Command: `node scripts/benchmark.mjs`
- Table values below are medians across the measured runs, not single-run point estimates
- Parse-heavy fixtures can still move materially across same-machine reruns, so treat these numbers as sample evidence instead of pass/fail thresholds

| Fixture | Size (KiB) | Parse (ms) | Build (ms) | Total (ms) | Models | Children |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `multipletextures.3mf` | 3020.7 | 414.7 | 3.8 | 424.2 | 1 | 1 |
| `truck.3mf` | 2587.2 | 602.1 | 11.5 | 612.9 | 1 | 2 |

Run spread from the same sample:

- `multipletextures.3mf`: parse `389.9-423.1ms`, build `3.4-19.9ms`, total `393.8-434.7ms`
- `truck.3mf`: parse `549.8-841.7ms`, build `10.6-37.1ms`, total `560.4-878.8ms`

## Historical Large Fixture Comparison

These same-machine before/after numbers are the historical evidence from the original 2026-03-28 optimization pass. They are useful for showing why the builder-path changes landed, but the current benchmark output above is the authoritative sample to refresh when the environment or implementation changes.

| Fixture | Baseline Parse (ms) | Baseline Build (ms) | Baseline Total (ms) | Optimized Parse (ms) | Optimized Build (ms) | Optimized Total (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `multipletextures.3mf` | 345.0 | 22.8 | 367.7 | 348.9 | 4.3 | 353.1 |
| `truck.3mf` | 452.4 | 31.6 | 483.9 | 453.3 | 12.9 | 466.2 |

The builder-side wins are the clearest signal here: `multipletextures.3mf` dropped from `22.8ms` to `4.3ms` in build time, and `truck.3mf` dropped from `31.6ms` to `12.9ms` in the original optimization comparison. Parse time remains the noisier phase, so current runs should be interpreted with the spread lines in addition to the phase split.

## Stable 1.0 Benchmark Gate

Before publishing `1.0`, run `npm run release:check` on the release machine and refresh the large-fixture benchmark sample if the medians or spread moved materially. If the release machine is noisy, re-run with explicit sampling overrides instead of silently replacing the sample with a single quick local run.

Run `node scripts/benchmark.mjs` after `npm run build` to refresh this section with current medians and spread for your machine.
