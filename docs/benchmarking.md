# Benchmarking

`fast-3mf-loader` includes a reproducible benchmark harness so the README can point to measured data instead of speculative performance claims.

## Command

```bash
pnpm build
pnpm benchmark
```

The benchmark imports the built `dist/index.js` bundle, runs end-to-end parse/build measurements against the large supported fixtures in `3mf/`, and reports median parse, build, and total times alongside the min/max spread from the measured runs.
It measures this library only. The previous three.js comparison in this command is no longer run; that comparison accounted for most of the command time. The project site still has an on-demand three.js comparison for the file you open.

For the stable `1.0` release gate, use the fixed release preset instead of retyping environment variables:

```bash
pnpm benchmark:release
```

Optional overrides for deeper sampling or release-machine calibration:

```bash
FAST3MF_BENCHMARK_WARMUP_RUNS=2 \
FAST3MF_BENCHMARK_MEASURED_RUNS=7 \
FAST3MF_BENCHMARK_WORKERS=6 \
pnpm benchmark
```

## Methodology

- Runtime: Node with a small Worker compatibility shim backed by `node:worker_threads`
- Fixtures: `multipletextures.3mf`, `truck.3mf`
- Default command `pnpm benchmark`: warmup `1`, measured runs `5`, worker count `min(hardwareConcurrency - 1, 15)`
- Release command `pnpm benchmark:release`: warmup `2`, measured runs `7`, worker count `6`. The preset is applied by `node scripts/benchmark-release.mjs`, so it does not depend on a POSIX shell assignment.
- Phase semantics: `Parse`, `Build`, and `Total` keep the existing split from `Fast3MFLoader` + `fast3mfBuilder`
- Environment overrides:
  - `FAST3MF_BENCHMARK_WARMUP_RUNS`
  - `FAST3MF_BENCHMARK_MEASURED_RUNS`
  - `FAST3MF_BENCHMARK_WORKERS`

## Sample Results

The 2026-10-12 sample below was collected while this command still ran the three.js comparison. Those `three` columns are historical. Later runs of `pnpm benchmark:release` report only this library.

Release preset sample run collected on 2026-10-12:

- Environment: Node `v26.5.1` on `darwin arm64`
- Worker count: `6`
- Command: `pnpm benchmark:release`
- Sampling preset: warmup `2`, measured runs `7`
- Table values below are medians across the measured runs, not single-run point estimates
- Parse-heavy fixtures can still move materially across same-machine reruns, so treat these numbers as sample evidence instead of pass/fail thresholds
- The `three` columns in this table come from that last comparison run. They are not produced by the current command.

| Fixture | Size (KiB) | fast Parse | fast Build | fast Total | three Parse | three Build | three Total | Status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `multipletextures.3mf` | 3020.7 | 212.2 | 2.1 | 214.2 | 2856.4 | 0.0 | 2856.4 | `ok (fused parse+build)` |
| `truck.3mf` | 2587.2 | 277.2 | 5.5 | 283.0 | 4447.1 | 0.0 | 4447.1 | `ok (fused parse+build)` |

Run spread from the same sample:

- `multipletextures.3mf`: fast parse `199.5-215.2ms`, fast build `1.7-6.3ms`, fast total `205.3-221.0ms`
- `truck.3mf`: fast parse `270.4-294.5ms`, fast build `5.4-5.8ms`, fast total `276.2-299.9ms`

## Historical Large Fixture Comparison

These same-machine before/after numbers are the historical evidence from the original 2026-03-28 optimization pass. They are useful for showing why the builder-path changes landed, but the current benchmark output above is the authoritative sample to refresh when the environment or implementation changes.

| Fixture | Baseline Parse (ms) | Baseline Build (ms) | Baseline Total (ms) | Optimized Parse (ms) | Optimized Build (ms) | Optimized Total (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `multipletextures.3mf` | 345.0 | 22.8 | 367.7 | 348.9 | 4.3 | 353.1 |
| `truck.3mf` | 452.4 | 31.6 | 483.9 | 453.3 | 12.9 | 466.2 |

The builder-side wins are the clearest signal here: `multipletextures.3mf` dropped from `22.8ms` to `4.3ms` in build time, and `truck.3mf` dropped from `31.6ms` to `12.9ms` in the original optimization comparison. Parse time remains the noisier phase, so current runs should be interpreted with the spread lines in addition to the phase split.

## Stable 1.0 Benchmark Gate

Before publishing `1.0`, run `pnpm release:check` on the release machine and refresh the large-fixture benchmark sample if the medians or spread moved materially. If the release machine is noisy, re-run with explicit sampling overrides instead of silently replacing the sample with a single quick local run.

`pnpm release:check` delegates benchmark evidence collection to `pnpm benchmark:release`, which fixes `warmupRuns=2`, `measuredRuns=7`, and `workerCount=6` for the release-machine sample.

The release gate still belongs to `fast-3mf-loader` itself. A `three unsupported` or `three failed` comparison row does not make `release:check` fail on its own.

Run `node packages/fast-3mf-loader/scripts/benchmark.mjs` after `pnpm build` to refresh this section with current medians and spread for your machine.
