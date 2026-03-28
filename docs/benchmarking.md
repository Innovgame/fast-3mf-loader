# Benchmarking

`fast-3mf-loader` includes a reproducible benchmark harness so the README can point to measured data instead of speculative performance claims.

## Command

```bash
npm run build
npm run benchmark
```

The benchmark imports the built `dist/fast-3mf-loader.js` bundle, runs end-to-end parse/build measurements against the large supported fixtures in `3mf/`, and reports average parse, build, and total times.

## Methodology

- Runtime: Node 22 with a small Worker compatibility shim backed by `node:worker_threads`
- Fixtures: `multipletextures.3mf`, `truck.3mf`
- Warmup: 1 parse per fixture before measurements
- Measured runs: 5 parse/build passes per fixture
- Worker count: `min(hardwareConcurrency - 1, 15)` to mirror the loader default

## Sample Results

Optimized sample run collected on 2026-03-28:

- Environment: Node `v22.13.1` on `darwin arm64`
- Worker count: `9`
- Command: `node scripts/benchmark.mjs`

| Fixture | Size (KiB) | Parse (ms) | Build (ms) | Total (ms) | Models | Children |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `multipletextures.3mf` | 3020.7 | 348.9 | 4.3 | 353.1 | 1 | 1 |
| `truck.3mf` | 2587.2 | 453.3 | 12.9 | 466.2 | 1 | 2 |

## Large Fixture Comparison

Same-machine before/after measurements from this optimization plan:

| Fixture | Baseline Parse (ms) | Baseline Build (ms) | Baseline Total (ms) | Optimized Parse (ms) | Optimized Build (ms) | Optimized Total (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `multipletextures.3mf` | 345.0 | 22.8 | 367.7 | 348.9 | 4.3 | 353.1 |
| `truck.3mf` | 452.4 | 31.6 | 483.9 | 453.3 | 12.9 | 466.2 |

The builder-side wins are the clearest signal here: `multipletextures.3mf` dropped from `22.8ms` to `4.3ms` in build time, and `truck.3mf` dropped from `31.6ms` to `12.9ms`. Parse time remains the noisier phase, so total time should be compared alongside the phase split rather than on its own.

Run `node scripts/benchmark.mjs` after `npm run build` to refresh this section with current numbers for your machine.
