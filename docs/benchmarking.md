# Benchmarking

`fast-3mf-loader` includes a reproducible benchmark harness so the README can point to measured data instead of speculative performance claims.

## Command

```bash
npm run build
npm run benchmark
```

The benchmark imports the built `dist/fast-3mf-loader.js` bundle, runs parser-only measurements against the sample archives in `3mf/`, and reports average/min/max parse times.

## Methodology

- Runtime: Node 22 with a small Worker compatibility shim backed by `node:worker_threads`
- Fixtures: `cube_gears.3mf`, `multipletextures.3mf`, `truck.3mf`, `vertexcolors.3mf`, `volumetric.3mf`
- Warmup: 1 parse per fixture before measurements
- Measured runs: 5 parses per fixture
- Worker count: `min(hardwareConcurrency - 1, 15)` to mirror the loader default

## Sample Results

Sample run collected on 2026-03-28:

- Environment: Node `v22.12.0` on `darwin arm64`
- Worker count: `9`
- Command: `node scripts/benchmark.mjs`

| Fixture | Size (KiB) | Avg (ms) | Min (ms) | Max (ms) | Models |
| --- | ---: | ---: | ---: | ---: | ---: |
| `cube_gears.3mf` | 223.1 | 103.5 | 97.6 | 109.6 | 1 |
| `multipletextures.3mf` | 3020.7 | 340.4 | 326.5 | 392.7 | 1 |
| `truck.3mf` | 2587.2 | 441.6 | 438.8 | 444.1 | 1 |
| `vertexcolors.3mf` | 1.2 | 31.4 | 31.3 | 31.7 | 1 |
| `volumetric.3mf` | 60.5 | 36.1 | 35.9 | 36.2 | 1 |

Run `node scripts/benchmark.mjs` after `npm run build` to refresh this section with current numbers for your machine.
