# fast-3mf-loader

[![npm version](https://img.shields.io/npm/v/fast-3mf-loader)](https://www.npmjs.com/package/fast-3mf-loader) [![license](https://img.shields.io/npm/l/fast-3mf-loader)](https://github.com/Innovgame/fast-3mf-loader/blob/master/LICENSE) [![bundlephobia minzipped size](https://badgen.net/bundlephobia/minzip/fast-3mf-loader)](https://bundlephobia.com/package/fast-3mf-loader)

> [!WARNING]  
> This project is in early development. The API may change before a stable 1.0 release. Use with caution in production.

A browser-first 3MF parser for TypeScript projects that uses SAX-style XML parsing internally and WebWorker parallelism to keep large archive parsing efficient.

## Features

- 🚀 **Streaming-Oriented Parsing** - Uses SAX-style XML parsing internally to keep memory usage lower on large 3MF archives
- ⚡ **WebWorker Parallelism** - Parses model parts across WebWorkers with an auto-sized worker pool
- 📦 **Benchmark-Backed Efficiency** - Ships measured optimizations for large texture-heavy and component-heavy fixtures
- 🛠 **Stable TypeScript Surface** - Exports `Fast3MFLoader`, `fast3mfBuilder`, and the documented helper types
- 🌐 **Browser-First Runtime** - Targets modern browsers with `Worker` and `Blob` support

## Installation

```bash
npm install fast-3mf-loader
# or
yarn add fast-3mf-loader
```

## Usage Example

```typescript
import { Fast3MFLoader, fast3mfBuilder } from "fast-3mf-loader";

// Get file using fetch
const response = await fetch("path/to/model.3mf");
const buffer = await response.arrayBuffer();

// Parse 3MF file
const loader = new Fast3MFLoader();
const data3mf = await loader.parse(buffer, {
  onProgress(progress) {
    console.log(`Parsing progress: ${progress}%`);
  },
});

const group = fast3mfBuilder(data3mf);
console.log("Parsing result:", group);
```

## API

### `Fast3MFLoader#parse(data: ArrayBuffer, options?: ParseOptions): Promise<Model3MF>`

Parses 3MF file and returns model data.

**Parameters:**
- `data`: 3MF file data, ArrayBuffer
- `options`: Optional configuration object
  - `workerCount`: number - Number of WebWorkers to use. Defaults to an auto-detected value based on available runtime concurrency, with a safe fallback.
  - `onProgress`: (progress: number) => void - Progress callback function

**Return Value:**
Promise that resolves to `Model3MF`. The package exports `Model3MF` as a documentation-friendly alias of `ParseResult`, plus the related helper types `ParseOptions`, `ParsedModelPart`, and `Relationship`.

```typescript
import type {
  Model3MF,
  ParseOptions,
  ParsedModelPart,
  Relationship,
} from "fast-3mf-loader";

type Model3MF = {
  rels: Relationship[];
  modelRels?: Relationship[];
  model: Record<string, ParsedModelPart>;
  printTicket: Record<string, never>;
  texture: Record<string, ArrayBuffer>;
};
```

Use `fast3mfBuilder(data3mf)` to convert the parsed data into a `THREE.Group`.

## Support Matrix

Current support is documented in [docs/support-matrix.md](./docs/support-matrix.md).

| Feature | Status | Notes |
| --- | --- | --- |
| Base materials | Supported | Built into Three.js materials |
| Texture groups | Supported | Covered by `multipletextures.3mf` |
| Vertex colors | Supported | Covered by `vertexcolors.3mf` |
| Components | Supported | Covered by `truck.3mf` |
| Print tickets | Not yet supported | Parser returns an empty object and warns |

## Support Boundary

Current support is defined by fixture-backed behavior and documented in [docs/support-matrix.md](./docs/support-matrix.md).
Unsupported features, including print tickets and extension resources beyond current fixture coverage, should be treated as unsupported until explicitly documented otherwise.

## Benchmarking

Benchmarks are collected with `npm run build && npm run benchmark`.

The current procedure and sample results are documented in [docs/benchmarking.md](./docs/benchmarking.md). Those numbers were collected with `node scripts/benchmark.mjs` on Apple Silicon / Node 22 and should be treated as reproducible samples rather than universal guarantees.

## Browser Support

Supports all modern browsers (Chrome, Firefox, Safari, Edge, etc.) and environments that support WebWorker and Blob API.

## Development

```bash
# Clone repository
git clone https://github.com/Innovgame/fast-3mf-loader.git

# Install dependencies
npm install

# Development mode, develop test page
npm run dev

# Build production version
npm run build

# Run tests
npm test
```

## Contributing

Issues and Pull Requests are welcome! Please ensure you follow the project's code style and test coverage requirements.
