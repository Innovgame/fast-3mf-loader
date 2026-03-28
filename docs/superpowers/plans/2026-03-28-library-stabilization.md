# Library Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `fast-3mf-loader` from an early demo-quality package into a small but trustworthy library with accurate docs, fixture-backed tests, predictable failures, and a repeatable release workflow.

**Architecture:** Keep the current split between parsing (`Fast3MFLoader`) and scene construction (`fast3mfBuilder`), but harden the boundaries around public API, worker lifecycle, and test coverage. Treat documentation, packaging, and CI as product surface area, not afterthoughts.

**Tech Stack:** TypeScript, Vite library mode, Vitest, Web Workers, `fflate`, `easysax`, three.js, GitHub Actions

---

## Milestones

| Milestone | Priority | Outcome |
| --- | --- | --- |
| Public API and packaging cleanup | P0 | Users see the same API that the package actually exports |
| Fixture-driven parser coverage | P0 | Real 3MF examples become regression tests |
| Error model and worker lifecycle hardening | P0 | Parse failures become deterministic and debuggable |
| Type tightening and state cleanup | P1 | Internal maintenance cost drops and TS upgrades stop surfacing old debt |
| Support matrix and capability clarification | P1 | Supported 3MF features are explicit |
| Benchmarking and CI hardening | P2 | Performance claims and releases become reproducible |

## Issue Breakdown

Each task below can be turned into a GitHub issue as-is.

### Task 1: Align Public API, Docs, and Packaging

**Files:**
- Modify: `README.md`
- Modify: `README-zh.md`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `tsconfig.lib.json`
- Create: `tsconfig.demo.json`
- Create: `test/public-api.test.ts`

- [ ] **Step 1: Add a public API regression test**

```ts
import { expect, test } from "vitest";
import { Fast3MFLoader, fast3mfBuilder } from "../lib/main";

test("exports the documented public API", () => {
    expect(typeof Fast3MFLoader).toBe("function");
    expect(typeof fast3mfBuilder).toBe("function");
});
```

- [ ] **Step 2: Run the focused test first**

Run: `npm test -- test/public-api.test.ts`
Expected: PASS and the test names the exported symbols explicitly.

- [ ] **Step 3: Split library type-checking from demo type-checking**

```json
// tsconfig.lib.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["lib"]
}
```

```json
// tsconfig.demo.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Update package scripts to make build intent obvious**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -p tsconfig.lib.json && vite build",
  "check:demo": "tsc -p tsconfig.demo.json --noEmit",
  "test": "vitest run"
}
```

- [ ] **Step 5: Rewrite the README examples to match the real API**

```ts
import { Fast3MFLoader, fast3mfBuilder } from "fast-3mf-loader";

const response = await fetch("path/to/model.3mf");
const buffer = await response.arrayBuffer();

const loader = new Fast3MFLoader();
const data3mf = await loader.parse(buffer, {
    onProgress(percent) {
        console.log(percent);
    },
});

const group = fast3mfBuilder(data3mf);
```

- [ ] **Step 6: Verify the package output still matches the docs**

Run: `npm run build && npm pack --dry-run`
Expected: build succeeds, tarball only includes package metadata plus `dist/*` runtime artifacts.

- [ ] **Step 7: Commit**

```bash
git add README.md README-zh.md package.json tsconfig.json tsconfig.lib.json tsconfig.demo.json test/public-api.test.ts
git commit -m "docs: align public API and packaging"
```

**Acceptance criteria:**
- README and README-zh no longer mention `ThreeMFLoader` as this package's export.
- `npm run build` is blocked only by library code, not demo code.
- A future API rename breaks tests before release.

### Task 2: Convert Sample 3MF Assets into Real Regression Tests

**Files:**
- Create: `test/helpers/read-fixture.ts`
- Create: `test/loader.parse.test.ts`
- Create: `test/builder.test.ts`
- Modify: `test/example.test.ts`
- Use fixtures from: `3mf/*.3mf`

- [ ] **Step 1: Add a shared fixture loader for the sample archives**

```ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function readFixture(name: string): Promise<ArrayBuffer> {
    const file = await readFile(resolve(process.cwd(), "3mf", name));
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
}
```

- [ ] **Step 2: Add parser-level tests against real 3MF files**

```ts
import { describe, expect, test } from "vitest";
import { Fast3MFLoader } from "../lib/main";
import { readFixture } from "./helpers/read-fixture";

describe("Fast3MFLoader.parse", () => {
    test("parses cube_gears.3mf", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("cube_gears.3mf"));

        expect(data).toBeDefined();
        expect(Object.keys(data.model).length).toBeGreaterThan(0);
        expect(data.rels.length).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 3: Add builder tests that assert returned Three.js objects are usable**

```ts
import { expect, test } from "vitest";
import * as THREE from "three";
import { Fast3MFLoader, fast3mfBuilder } from "../lib/main";
import { readFixture } from "./helpers/read-fixture";

test("builds a THREE.Group from parsed data", async () => {
    const loader = new Fast3MFLoader();
    const data = await loader.parse(await readFixture("facecolors.3mf"));
    const group = fast3mfBuilder(data);

    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.children.length).toBeGreaterThan(0);
});
```

- [ ] **Step 4: Replace the current arithmetic smoke test**

```ts
import { expect, test } from "vitest";
import { Fast3MFLoader } from "../lib/main";

test("loader exposes a parse method", () => {
    const loader = new Fast3MFLoader();
    expect(typeof loader.parse).toBe("function");
});
```

- [ ] **Step 5: Expand coverage to represent current supported features**

Add one focused assertion per archive:
- `vertexcolors.3mf`: at least one built mesh has a `color` buffer attribute.
- `multipletextures.3mf`: at least one built mesh material has a texture `map`.
- `truck.3mf`: parsed model resources contain multiple objects or components.
- `volumetric.3mf`: either parse successfully with a documented expectation or fail with an explicit unsupported-feature assertion.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: tests exercise real archives and no test file is trivial-only.

- [ ] **Step 7: Commit**

```bash
git add test/helpers/read-fixture.ts test/loader.parse.test.ts test/builder.test.ts test/example.test.ts
git commit -m "test: cover parser and builder with 3mf fixtures"
```

**Acceptance criteria:**
- Every sample in `3mf/` is either covered by a test or explicitly documented as unsupported.
- Basic mesh parsing, vertex colors, and textured models are all regression-tested.

### Task 3: Make Parse Failures Deterministic

**Files:**
- Modify: `lib/fast-3mf-loader.ts`
- Modify: `lib/unzip.worker.ts`
- Modify: `lib/parse-model.worker.ts`
- Modify: `lib/WorkerPool.ts`
- Create: `test/error-handling.test.ts`

- [ ] **Step 1: Write failing tests for broken archive and worker failure paths**

```ts
import { expect, test } from "vitest";
import { Fast3MFLoader } from "../lib/main";

test("rejects invalid archive input", async () => {
    const loader = new Fast3MFLoader();
    await expect(loader.parse(new ArrayBuffer(8))).rejects.toThrow();
});
```

- [ ] **Step 2: Run the focused error test and capture current behavior**

Run: `npm test -- test/error-handling.test.ts`
Expected: current implementation fails because some branches resolve `undefined` instead of rejecting.

- [ ] **Step 3: Standardize `parse()` to always reject on unrecoverable failures**

```ts
try {
    zip = await unzipData(data);
} catch (error) {
    throw new Error(`Failed to unzip 3MF archive: ${String(error)}`);
}
```

- [ ] **Step 4: Make workers post structured error messages instead of only logging**

```ts
try {
    const zip = unzipSync(new Uint8Array(buffer));
    postMessage({ type: "done", zip }, { transfer });
} catch (error) {
    postMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
    });
}
```

- [ ] **Step 5: Teach `WorkerPool` to reject requests when a worker errors**

```ts
type PendingJob<T> = {
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
    msg: unknown;
    transfer: StructuredSerializeOptions;
};
```

- [ ] **Step 6: Verify the full failure contract**

Run: `npm test -- test/error-handling.test.ts && npm run build`
Expected: invalid input rejects; build still succeeds.

- [ ] **Step 7: Commit**

```bash
git add lib/fast-3mf-loader.ts lib/unzip.worker.ts lib/parse-model.worker.ts lib/WorkerPool.ts test/error-handling.test.ts
git commit -m "fix: normalize parser and worker failures"
```

**Acceptance criteria:**
- `Fast3MFLoader.parse()` never silently returns `undefined` for an unrecoverable failure.
- Worker failures propagate to callers with a usable message.

### Task 4: Tighten Types and Remove Shared Mutable Parsing State

**Files:**
- Modify: `lib/util.ts`
- Modify: `lib/node-extract.ts`
- Modify: `lib/node-create.ts`
- Modify: `lib/parse.ts`
- Modify: `lib/parse-model.worker.ts`
- Modify: `lib/3mf-builder.ts`
- Create: `lib/easysax.d.ts`
- Create: `test/types.test.ts`

- [ ] **Step 1: Add a type-level regression target for the public return shape**

```ts
import { expectTypeOf, test } from "vitest";
import { Fast3MFLoader, type ParseResult } from "../lib/main";

test("parse returns a typed promise", () => {
    const loader = new Fast3MFLoader();
    expectTypeOf(loader.parse(new ArrayBuffer(0))).toEqualTypeOf<Promise<ParseResult>>();
});
```

- [ ] **Step 2: Replace `any`-heavy state with named interfaces**

```ts
export interface ParseResult {
    rels: Relationship[];
    modelRels?: Relationship[];
    model: Record<string, StateType>;
    printTicket: Record<string, never>;
    texture: Record<string, ArrayBuffer>;
}
```

- [ ] **Step 3: Remove module-level metadata extraction state**

```ts
export type StateType = ReturnType<typeof makeModelsStateExtras> & {
    currentMetadataName?: string;
};
```

```ts
export function extractMetadata(input: StateInput) {
    const attributes = input.getAttr?.();
    if (attributes?.name) return { metadataName: attributes.name };
    if (input.text && input.metadataName) return { [input.metadataName]: input.text };
}
```

- [ ] **Step 4: Add a local declaration for `easysax` and delete `@ts-ignore`**

```ts
declare module "easysax" {
    export default class EasySAXParser {
        constructor(options?: { autoEntity?: boolean });
        on(event: string, handler: (...args: unknown[]) => void): void;
        write(chunk: string): void;
    }
}
```

- [ ] **Step 5: Remove `undefined!` and replace it with explicit optional state**

```ts
current: {
    currentObjectId?: string;
    currentBasematerialsId?: string;
    currentColorGroupId?: string;
    currentTexture2dGroupId?: string;
},
```

- [ ] **Step 6: Run verification**

Run: `npm test && npm run build`
Expected: no new `@ts-ignore` added, public types remain emitted.

- [ ] **Step 7: Commit**

```bash
git add lib/util.ts lib/node-extract.ts lib/node-create.ts lib/parse.ts lib/parse-model.worker.ts lib/3mf-builder.ts lib/easysax.d.ts test/types.test.ts
git commit -m "refactor: tighten parser types and state handling"
```

**Acceptance criteria:**
- Shared parser bookkeeping no longer relies on module-global mutable variables.
- The main library path compiles without `@ts-ignore`.
- Public return values and options are named and exported.

### Task 5: Publish a Support Matrix for 3MF Features

**Files:**
- Create: `docs/support-matrix.md`
- Modify: `README.md`
- Modify: `README-zh.md`
- Modify: `lib/fast-3mf-loader.ts`
- Modify: `lib/3mf-builder.ts`
- Create: `test/support-matrix.test.ts`

- [ ] **Step 1: Enumerate currently supported and unsupported capabilities**

Start from these buckets:
- archive unzip
- relationship parsing
- multi-model archives
- base materials
- texture2d and texture2dgroup
- color groups
- components
- print tickets
- extension resources

- [ ] **Step 2: Add tests that prove the supported rows**

```ts
import { expect, test } from "vitest";
import * as THREE from "three";
import { Fast3MFLoader, fast3mfBuilder } from "../lib/main";
import { readFixture } from "./helpers/read-fixture";

test("multipletextures fixture confirms texture support", async () => {
    const loader = new Fast3MFLoader();
    const data = await loader.parse(await readFixture("multipletextures.3mf"));
    const group = fast3mfBuilder(data);

    const texturedMesh = group.children.find((child) => {
        return child instanceof THREE.Mesh && !!child.material && "map" in child.material;
    });

    expect(texturedMesh).toBeTruthy();
});
```

- [ ] **Step 3: Make unsupported cases explicit in runtime errors or warnings**

```ts
throw new Error("3MF print tickets are not supported yet");
```

Use this pattern only where silent omission would surprise users.

- [ ] **Step 4: Document the matrix in both READMEs**

```md
| Feature | Status | Notes |
| --- | --- | --- |
| Base materials | Supported | Built into Three.js materials |
| Texture groups | Supported | Covered by `multipletextures.3mf` |
| Print tickets | Not yet supported | Parser returns an empty object today |
```

- [ ] **Step 5: Run verification**

Run: `npm test && npm run build`
Expected: docs, tests, and runtime behavior agree on support claims.

- [ ] **Step 6: Commit**

```bash
git add docs/support-matrix.md README.md README-zh.md lib/fast-3mf-loader.ts lib/3mf-builder.ts test/support-matrix.test.ts
git commit -m "docs: publish 3mf support matrix"
```

**Acceptance criteria:**
- Users can tell before adoption which 3MF features are production-ready.
- Unsupported paths are not silently marketed as supported.

### Task 6: Add Reproducible Benchmarks and a Real CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `.github/workflows/npm-publish.yml`
- Create: `scripts/benchmark.mjs`
- Create: `docs/benchmarking.md`
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Add a benchmark script that compares parse times across fixture files**

```js
import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import { Fast3MFLoader } from "../dist/fast-3mf-loader.js";

const fixtures = ["cube_gears.3mf", "multipletextures.3mf", "vertexcolors.3mf"];
```

- [ ] **Step 2: Add a normal push and pull request CI workflow**

```yaml
name: CI

on:
  push:
    branches: ["master"]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test
      - run: npm run build
```

- [ ] **Step 3: Keep publish workflow focused on release-only concerns**

```yaml
needs: build
run: npm publish
```

Remove duplicated logic that the new CI workflow already guarantees.

- [ ] **Step 4: Replace speculative performance claims with measured data**

```md
Benchmarks were collected with `node scripts/benchmark.mjs` on Apple Silicon / Node 22.
```

- [ ] **Step 5: Run verification**

Run: `npm test && npm run build && node scripts/benchmark.mjs`
Expected: benchmark script completes, CI config validates syntactically, README values have a reproducible source.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/npm-publish.yml scripts/benchmark.mjs docs/benchmarking.md README.md package.json
git commit -m "ci: add continuous verification and benchmark tooling"
```

**Acceptance criteria:**
- Every push and PR gets the same test and build gate as releases.
- README performance claims point back to a reproducible benchmark procedure.

## Suggested Delivery Order

1. Task 1: Align Public API, Docs, and Packaging
2. Task 2: Convert Sample 3MF Assets into Real Regression Tests
3. Task 3: Make Parse Failures Deterministic
4. Task 4: Tighten Types and Remove Shared Mutable Parsing State
5. Task 5: Publish a Support Matrix for 3MF Features
6. Task 6: Add Reproducible Benchmarks and a Real CI Workflow

## Self-Review

- Coverage check: the plan addresses public API accuracy, tests, failure semantics, type safety, support boundaries, and CI.
- Placeholder scan: every task names exact files and concrete verification commands.
- Scope check: the work is still one coherent sub-project, "library stabilization", and does not mix in unrelated feature expansion.
