# fast-3mf-loader

Browser-first TypeScript parser and Three.js builder for 3MF archives.

## Install

```bash
npm install fast-3mf-loader
```

GitHub Packages uses `@innovgame/fast-3mf-loader`. Point the scope at GitHub Packages in `.npmrc`:

```text
@innovgame:registry=https://npm.pkg.github.com
```

```bash
npm install @innovgame/fast-3mf-loader
```

## Usage

```typescript
import { Fast3MFLoader, fast3mfBuilder } from "fast-3mf-loader";

const response = await fetch("path/to/model.3mf");
const buffer = await response.arrayBuffer();
const data3mf = await new Fast3MFLoader().parse(buffer);
const group = fast3mfBuilder(data3mf);
```

`three` is a peer dependency. `parse()` accepts an `ArrayBuffer`. The browser needs `Worker` and `Blob`.

Support boundaries and benchmarks are documented in the [repository](https://github.com/Innovgame/fast-3mf-loader).
