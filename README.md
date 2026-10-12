# fast-3mf-loader

[English](README.md) | [简体中文](README-zh.md)

Browser-first TypeScript parser and Three.js builder for 3MF archives. SAX-style XML parsing and WebWorkers keep large model parts lighter.

[![CI](https://github.com/Innovgame/fast-3mf-loader/actions/workflows/ci.yml/badge.svg)](https://github.com/Innovgame/fast-3mf-loader/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/fast-3mf-loader)](https://www.npmjs.com/package/fast-3mf-loader)
[![release](https://img.shields.io/github/v/release/Innovgame/fast-3mf-loader)](https://github.com/Innovgame/fast-3mf-loader/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> [!WARNING]
> This project is in early development. The API may change before a stable 1.0 release. Use with caution in production.

Open the [browser playground](https://innovgame.github.io/fast-3mf-loader/) to preview a local 3MF file and measure parse and build time on your own device. The file stays in the browser.

## Install

Version `0.0.7`. Changes are in [CHANGELOG.md](CHANGELOG.md).

`three` is a peer dependency. Install it with the loader.

### npm

```bash
npm install fast-3mf-loader three
```

```ts
import { Fast3MFLoader, fast3mfBuilder } from "fast-3mf-loader";
```

### GitHub Packages

Add this to `.npmrc`, then install `@innovgame/fast-3mf-loader`:

```text
@innovgame:registry=https://npm.pkg.github.com
```

```bash
npm install @innovgame/fast-3mf-loader three
```

Import that package from `@innovgame/fast-3mf-loader`. The API is the same.

## Quick start

```ts
import { Fast3MFLoader, fast3mfBuilder } from "fast-3mf-loader";

const response = await fetch("path/to/model.3mf");
const buffer = await response.arrayBuffer();
const loader = new Fast3MFLoader();
const data3mf = await loader.parse(buffer, {
    onProgress(progress) {
        console.log(`Parsing progress: ${progress}%`);
    },
});
const group = fast3mfBuilder(data3mf);
```

`parse()` accepts one complete `ArrayBuffer`. Add `group` to an existing Three.js scene.

The playground is at <https://innovgame.github.io/fast-3mf-loader/>. Sample archives in `3mf/` are regression fixtures. Their licenses are in [3mf/README.md](3mf/README.md).

## Limits

- The supported runtime is a modern browser with `Worker` and `Blob`. If workers cannot start, parsing fails with a loader-facing error that names that prerequisite.
- `Fast3MFLoader#parse()` accepts an `ArrayBuffer`. It uses SAX-style XML parsing internally to keep memory usage lower. That is not a chunked public API.
- Print tickets and extension resources beyond the current fixtures are not supported. The parser returns an empty `printTicket` and warns.
- Node tests and benchmarks use compatibility shims. They do not establish a supported Node runtime.
- Historical benchmark samples are environment-specific evidence, not a browser speed promise.

## What it does

- Unzips a 3MF archive and locates the root model from `_rels/.rels`.
- Uses SAX-style XML parsing internally to keep memory usage lower on large 3MF archives.
- Parses model parts across WebWorkers. The pool size defaults to `min(hardwareConcurrency - 1, 15)`, or `4` when concurrency cannot be read. Invalid `workerCount` values warn and use that default.
- Builds a `THREE.Group` from mesh geometry, vertex colors, textures, and component instances, including Production `path` references to another model part.
- Reports progress through `onProgress`. Unsupported data warns instead of pretending to succeed.

## Supported capabilities

The evidence and notes live in [docs/support-matrix.md](docs/support-matrix.md). If a capability is not listed there, treat it as unsupported.

| Capability | Status |
| --- | --- |
| Archive unzip and root relationships | Supported |
| Multi-object and component models, including Production `path` references | Supported |
| Mesh geometry | Supported |
| Vertex color groups | Supported |
| Texture resources, texture groups, and model relationships | Supported |
| Print tickets | Not yet supported |
| Extension resources beyond current fixture coverage | Not yet supported |

## API

Install `fast-3mf-loader` from npm, or `@innovgame/fast-3mf-loader` from GitHub Packages.

```ts
import { Fast3MFLoader, fast3mfBuilder } from "fast-3mf-loader";
import type { Model3MF, ParseOptions, ParsedModelPart, Relationship } from "fast-3mf-loader";

const data3mf: Model3MF = await new Fast3MFLoader().parse(buffer, {
    workerCount: 4,
    onProgress(progress) {
        console.log(progress);
    },
});
const group = fast3mfBuilder(data3mf);
```

| Export | Use |
| --- | --- |
| `Fast3MFLoader#parse` | Parse an `ArrayBuffer` into `Model3MF` |
| `fast3mfBuilder` | Build a `THREE.Group` from parsed data |
| `Model3MF` | Documentation alias of `ParseResult` |
| `ParseOptions` | `workerCount` and `onProgress` |
| `ParsedModelPart` | One parsed `.model` part |
| `Relationship` | One package relationship |

`Model3MF` contains `rels`, optional `modelRels`, `model`, `printTicket`, and `texture`. `printTicket` is empty until print tickets are supported. Input that is not an `ArrayBuffer` is rejected before parsing starts.

## Development

Requirements: Node.js 22 and pnpm 10.

```bash
git clone https://github.com/Innovgame/fast-3mf-loader.git
pnpm install
pnpm dev
```

`pnpm dev` starts the React project site and browser playground.

```bash
pnpm verify
pnpm test
pnpm build
```

Pushes to `master`, and pull requests targeting `master`, run [CI](.github/workflows/ci.yml), including browser checks of the production Pages path. After CI succeeds on `master`, the site is published to <https://innovgame.github.io/fast-3mf-loader/>. `pnpm --filter @fast-3mf-loader/demo test:e2e` runs those browser checks locally.

The repository layout:

- `packages/fast-3mf-loader/`: published library
- `apps/demo/`: Vite, React, Radix UI, Tailwind CSS, and Lucide project site
- `3mf/`: fixture archives
- `docs/`: support matrix, benchmarking, and maintainer notes

Maintainer publish steps are in [CONTRIBUTING.md](CONTRIBUTING.md). A GitHub Release publishes `@innovgame/fast-3mf-loader` to GitHub Packages. npm receives `fast-3mf-loader` when `NPM_TOKEN` is set.

## Documentation

- [Documentation index](docs/README.md)
- [Support matrix](docs/support-matrix.md)
- [Benchmarking](docs/benchmarking.md)
- [Examples](examples/README.md)
- [Package README](packages/fast-3mf-loader/README.md)

Maintainer notes live in `docs/superpowers/` and are not the usage guide.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
