# Changelog

This file records changes that users can see. Versions follow repository tags, for example `v0.0.7`.

## Unreleased

- Component and build item references with a Production `path` or `p:path` now build the object from the referenced model part. Package-absolute paths such as `/3D/Objects/object_10.model` and paths relative to the current model both resolve. Files that previously failed with `Cannot find component object` can open when that object lives in another model part.
- A namespaced `path` is accepted only when its namespace is the 3MF Production extension. Another extension's `path` attribute no longer replaces it. An unprefixed `path` still works, and it wins when both forms are present.
- The project site at <https://innovgame.github.io/fast-3mf-loader/> previews a local 3MF file, shows parse, build, and total time, and can compare the same file with three.js on request. Files stay in the browser. The page has English and Chinese, light and dark themes, and a phone layout.
- The README documents npm and GitHub Packages install paths, the support boundary, and desktop and mobile screenshots of the playground.

- `parse()` rejects input that is not an `ArrayBuffer`.
- Invalid `workerCount` values warn and use the default worker count.
- If workers cannot start, the error names the `Worker` and `Blob` requirement.
- A SAX parser error rejects the parse instead of returning a partial result.
- An unrecognised model unit warns with a `Fast3MFLoader` prefix and still falls back to millimeters.
- Missing archive parts, relationships, build objects, component objects, and texture binaries throw an error that names the missing target. A relationship target with or without a leading slash resolves to the same part.
- Unsupported builder resources warn instead of pretending to succeed.

- npm publish keeps the package name `fast-3mf-loader`. GitHub Packages publishes `@innovgame/fast-3mf-loader` when a GitHub Release is published.
- The repository includes contributing, security, and code of conduct files, issue templates, and weekly dependency update checks.
- Benchmark output can include a same-machine comparison with three.js `ThreeMFLoader`. Those samples are environment-specific evidence, not a browser speed promise.

## 0.0.7

Published npm release. Detailed notes for `0.0.4` through `0.0.7` were not kept in this file.
