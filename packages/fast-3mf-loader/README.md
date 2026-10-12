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

Import that package from `@innovgame/fast-3mf-loader`. The API is the same.

## Usage

```typescript
import { Fast3MFLoader, fast3mfBuilder } from "fast-3mf-loader";

const response = await fetch("path/to/model.3mf");
const buffer = await response.arrayBuffer();
const data3mf = await new Fast3MFLoader().parse(buffer);
const group = fast3mfBuilder(data3mf);
```

`three` is a required peer dependency. `parse()` accepts one complete `ArrayBuffer`. The supported runtime is a modern browser with `Worker` and `Blob`.

## API

| Export | Use |
| --- | --- |
| `Fast3MFLoader#parse` | Parse an `ArrayBuffer` into `ParseResult` |
| `fast3mfBuilder` | Build a `THREE.Group` from that result |
| `Model3MF` | Alias of `ParseResult` |
| `ParseOptions` | `workerCount` and `onProgress` |

`ParseResult` includes `rels`, optional `modelRels`, `model`, an empty `printTicket`, and `texture`. Print tickets are not supported.

## License

[MIT](LICENSE)
