# Changelog

This file records changes that users can see. Versions follow repository tags, for example `v0.0.7`.

## Unreleased

- Invalid `workerCount` values warn and fall back to the default worker strategy.
- `parse()` rejects input that is not an `ArrayBuffer`.
- Worker startup failures name the `Worker` and `Blob` prerequisite.
- Missing archive parts, relationships, and builder references throw loader-facing or builder-facing errors.
- Relationship targets with or without a leading slash resolve to the same model and texture.
- A SAX parser error rejects the parse promise.
- Unknown model units warn with a `Fast3MFLoader` prefix and still fall back to millimeters.
- Benchmark output includes a same-machine comparison with three.js `ThreeMFLoader`.
- The repository now includes community health files, issue templates, and dependency update checks.

## 0.0.7

Published npm release. Detailed notes for `0.0.4` through `0.0.7` were not kept in this file.
