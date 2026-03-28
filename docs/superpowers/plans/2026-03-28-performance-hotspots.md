# Performance Hotspots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce end-to-end time on large 3MF fixtures by optimizing parse and builder hotspots while preserving the public API and supported feature behavior.

**Architecture:** Keep the public contract centered on `Fast3MFLoader` and `fast3mfBuilder`, but split the implementation work into benchmark instrumentation, parse-path helpers, and builder-path helpers. Measure parse/build phases separately, optimize only evidence-backed hotspots, and protect texture-heavy and component-heavy scenarios with fixture tests.

**Tech Stack:** TypeScript, Vite library mode, Vitest, Web Workers, `fflate`, `easysax`, three.js, Node benchmark scripts

---

## File Map

- Create: `scripts/benchmark-core.mjs`
  Responsibility: pure benchmark helpers that can measure parse/build/total phases and are easy to test
- Modify: `scripts/benchmark.mjs`
  Responsibility: thin CLI wrapper around `benchmark-core`
- Create: `test/benchmark-core.test.ts`
  Responsibility: regression tests for benchmark phase reporting
- Create: `lib/archive-manifest.ts`
  Responsibility: single-pass archive classification and incremental progress helpers for `Fast3MFLoader`
- Modify: `lib/fast-3mf-loader.ts`
  Responsibility: replace repeated archive scans and progress-array reduction with the new helpers
- Create: `test/archive-manifest.test.ts`
  Responsibility: focused tests for archive classification and progress aggregation behavior
- Create: `lib/build-geometry.ts`
  Responsibility: typed-array helpers for position/uv/color buffer assembly on hot builder paths
- Modify: `lib/3mf-builder.ts`
  Responsibility: use explicit caches and typed-array builders to reduce repeated work on large fixtures
- Create: `test/build-geometry.test.ts`
  Responsibility: deterministic tests for typed-array assembly helpers
- Modify: `test/builder.test.ts`
  Responsibility: larger-fixture builder regression checks
- Modify: `test/support-matrix.test.ts`
  Responsibility: keep texture/component support assertions intact during performance work
- Modify: `docs/benchmarking.md`
  Responsibility: record parse/build/total benchmark output and before/after evidence

## Task 1: Expose Parse/Build/Total Benchmark Phases

**Files:**
- Create: `scripts/benchmark-core.mjs`
- Modify: `scripts/benchmark.mjs`
- Create: `test/benchmark-core.test.ts`
- Modify: `docs/benchmarking.md`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";

const { measureFixture } = await import("../scripts/benchmark-core.mjs");

function createNow(values: number[]) {
    let index = 0;
    return () => values[index++] ?? values[values.length - 1];
}

describe("measureFixture", () => {
    test("reports parse, build, and total timings separately", async () => {
        class MockLoader {
            async parse() {
                return {
                    rels: [],
                    modelRels: [],
                    model: {
                        "3D/3dmodel.model": {
                            unit: "millimeter",
                            version: "1.3",
                            transform: {},
                            metadata: {},
                            resources: {
                                object: {},
                                basematerials: {},
                                texture2d: {},
                                colorgroup: {},
                                texture2dgroup: {},
                                pbmetallicdisplayproperties: {},
                            },
                            build: [],
                            extensions: {},
                        },
                    },
                    printTicket: {},
                    texture: {},
                };
            }
        }

        const row = await measureFixture({
            fixtureName: "truck.3mf",
            fixtureBytes: Uint8Array.from([1, 2, 3]),
            workerCount: 4,
            Fast3MFLoader: MockLoader,
            fast3mfBuilder() {
                return { children: [{}, {}] };
            },
            now: createNow([10, 26, 40, 73]),
        });

        expect(row.fixture).toBe("truck.3mf");
        expect(row.parseMs).toBe(16);
        expect(row.buildMs).toBe(33);
        expect(row.totalMs).toBe(49);
        expect(row.children).toBe(2);
    });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- test/benchmark-core.test.ts`
Expected: FAIL because `scripts/benchmark-core.mjs` does not exist yet.

- [ ] **Step 3: Implement a testable benchmark core**

```js
// scripts/benchmark-core.mjs
import { performance } from "node:perf_hooks";

export async function measureFixture({
    fixtureName,
    fixtureBytes,
    workerCount,
    Fast3MFLoader,
    fast3mfBuilder,
    now = () => performance.now(),
}) {
    const loader = new Fast3MFLoader();
    const input = fixtureBytes.slice().buffer;

    const parseStart = now();
    const parsed = await loader.parse(input, {
        onProgress() {},
        workerCount,
    });
    const parseMs = now() - parseStart;

    const buildStart = now();
    const group = fast3mfBuilder(parsed);
    const buildMs = now() - buildStart;

    return {
        fixture: fixtureName,
        sizeKiB: fixtureBytes.byteLength / 1024,
        parseMs,
        buildMs,
        totalMs: parseMs + buildMs,
        models: Object.keys(parsed.model).length,
        children: group.children.length,
    };
}

export function summarizeRows(rows) {
    return rows.map((row) => ({
        Fixture: row.fixture,
        "Size (KiB)": row.sizeKiB.toFixed(1),
        "Parse (ms)": row.parseMs.toFixed(1),
        "Build (ms)": row.buildMs.toFixed(1),
        "Total (ms)": row.totalMs.toFixed(1),
        Models: String(row.models),
        Children: String(row.children),
    }));
}
```

- [ ] **Step 4: Make the CLI wrapper use the shared benchmark core**

```js
// scripts/benchmark.mjs
import { readFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { Worker as NodeWorker } from "node:worker_threads";
import { measureFixture, summarizeRows } from "./benchmark-core.mjs";

// keep the existing worker polyfill setup
// ...

const rows = [];
for (const fixtureName of fixtureNames) {
    const file = await readFile(resolve(process.cwd(), "3mf", fixtureName));
    const fixtureBytes = Uint8Array.from(file);

    for (let i = 0; i < warmupRuns; i++) {
        await measureFixture({ fixtureName, fixtureBytes, workerCount, Fast3MFLoader, fast3mfBuilder });
    }

    const measurements = [];
    for (let i = 0; i < measuredRuns; i++) {
        measurements.push(await measureFixture({ fixtureName, fixtureBytes, workerCount, Fast3MFLoader, fast3mfBuilder }));
    }

    rows.push({
        fixture: fixtureName,
        sizeKiB: measurements[0].sizeKiB,
        parseMs: average(measurements.map((row) => row.parseMs)),
        buildMs: average(measurements.map((row) => row.buildMs)),
        totalMs: average(measurements.map((row) => row.totalMs)),
        models: measurements[0].models,
        children: measurements[0].children,
    });
}

printTable(summarizeRows(rows));
```

- [ ] **Step 5: Run the focused test and benchmark**

Run: `npm test -- test/benchmark-core.test.ts && npm run build && npm run benchmark`
Expected: PASS, and benchmark table shows `Parse (ms)`, `Build (ms)`, and `Total (ms)` columns.

- [ ] **Step 6: Refresh the benchmarking doc with phase-based output**

```md
| Fixture | Size (KiB) | Parse (ms) | Build (ms) | Total (ms) | Models | Children |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `multipletextures.3mf` | ... | ... | ... | ... | ... | ... |
| `truck.3mf` | ... | ... | ... | ... | ... | ... |
```

- [ ] **Step 7: Commit**

```bash
git add scripts/benchmark-core.mjs scripts/benchmark.mjs test/benchmark-core.test.ts docs/benchmarking.md
git commit -m "test: add benchmark phase reporting coverage"
```

## Task 2: Remove Parse-Path Hotspots In `Fast3MFLoader`

**Files:**
- Create: `lib/archive-manifest.ts`
- Modify: `lib/fast-3mf-loader.ts`
- Create: `test/archive-manifest.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { strToU8 } from "fflate";
import { describe, expect, test, vi } from "vitest";
import { collectArchiveManifest, createProgressTracker } from "../lib/archive-manifest";

describe("collectArchiveManifest", () => {
    test("classifies root model, sub-models, textures, relationships, and print tickets", () => {
        const manifest = collectArchiveManifest({
            "_rels/.rels": strToU8(""),
            "3D/3dmodel.model": strToU8(""),
            "3D/parts/chassis.model": strToU8(""),
            "3D/Textures/atlas.png": strToU8(""),
            "Metadata/printticket.xml": strToU8(""),
        });

        expect(manifest.relsName).toBe("_rels/.rels");
        expect(manifest.rootModelFile).toBe("3D/3dmodel.model");
        expect(manifest.modelPartNames).toEqual(["3D/parts/chassis.model"]);
        expect(manifest.texturesPartNames).toEqual(["3D/Textures/atlas.png"]);
        expect(manifest.printTicketPartNames).toEqual(["Metadata/printticket.xml"]);
    });
});

describe("createProgressTracker", () => {
    test("emits monotonic aggregated progress without rescanning every part", () => {
        const onProgress = vi.fn();
        const track = createProgressTracker(3, onProgress);

        track(100);
        track(100);
        track(100);

        expect(onProgress.mock.calls.map(([value]) => value)).toEqual([50, 70, 90]);
    });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- test/archive-manifest.test.ts`
Expected: FAIL because `lib/archive-manifest.ts` does not exist yet.

- [ ] **Step 3: Implement single-pass archive classification and incremental progress**

```ts
// lib/archive-manifest.ts
import type { Unzipped } from "fflate";

export type ArchiveManifest = {
    relsName?: string;
    modelRelsName?: string;
    rootModelFile?: string;
    modelPartNames: string[];
    texturesPartNames: string[];
    printTicketPartNames: string[];
};

export function collectArchiveManifest(zip: Unzipped): ArchiveManifest {
    const manifest: ArchiveManifest = {
        modelPartNames: [],
        texturesPartNames: [],
        printTicketPartNames: [],
    };

    for (const file in zip) {
        if (file.endsWith("_rels/.rels")) {
            manifest.relsName = file;
            continue;
        }
        if (file.startsWith("3D/_rels/") && file.endsWith(".model.rels")) {
            manifest.modelRelsName = file;
            continue;
        }
        if (file.startsWith("3D/") && file.endsWith(".model") && !file.slice(3).includes("/")) {
            manifest.rootModelFile = file;
            continue;
        }
        if (file.startsWith("3D/") && file.endsWith(".model")) {
            manifest.modelPartNames.push(file);
            continue;
        }
        if (file.startsWith("3D/Texture") || file.startsWith("3D/Textures/")) {
            manifest.texturesPartNames.push(file);
            continue;
        }
        if (/printticket/i.test(file)) {
            manifest.printTicketPartNames.push(file);
        }
    }

    return manifest;
}

export function createProgressTracker(totalParts: number, onProgress?: (percent: number) => void) {
    let completed = 0;

    return (deltaPercent: number) => {
        completed += deltaPercent;
        const relative = completed / (totalParts * 100);
        onProgress?.(Math.trunc(30 + relative * 60));
    };
}
```

- [ ] **Step 4: Wire `Fast3MFLoader` to the new helpers**

```ts
// lib/fast-3mf-loader.ts
import { collectArchiveManifest, createProgressTracker } from "./archive-manifest";

// after unzip
const manifest = collectArchiveManifest(zip);
const {
    relsName,
    modelRelsName,
    rootModelFile,
    modelPartNames,
    texturesPartNames,
    printTicketPartNames,
} = manifest;

const reportProgress = createProgressTracker(modelPartNames.length, onProgress);

const promises = modelPartNames.map(async (modelPart) => {
    const view = zip[modelPart];
    const data = await parseModelWorkerPool.postMessage<MessageEvent<MessageParseModel>>(view, { transfer: [view.buffer] });
    reportProgress(100);
    return data;
});
```

- [ ] **Step 5: Run focused tests and inspect benchmark output**

Run: `npm test -- test/archive-manifest.test.ts && npm test -- test/runtime-behavior.test.ts && npm run build && npm run benchmark`
Expected: PASS, and benchmark still completes with phase-separated rows for all fixtures.

- [ ] **Step 6: Commit**

```bash
git add lib/archive-manifest.ts lib/fast-3mf-loader.ts test/archive-manifest.test.ts
git commit -m "perf: reduce parse hot-path overhead"
```

## Task 3: Rewrite Builder Hotspots For Large Fixtures

**Files:**
- Create: `lib/build-geometry.ts`
- Modify: `lib/3mf-builder.ts`
- Create: `test/build-geometry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest";
import {
    createTrianglePositionBuffer,
    createTriangleUvBuffer,
    createTriangleColorBuffer,
} from "../lib/build-geometry";

describe("build-geometry helpers", () => {
    test("writes triangle positions into a packed Float32Array", () => {
        const positions = createTrianglePositionBuffer(
            new Float32Array([
                0, 0, 0,
                1, 0, 0,
                0, 1, 0,
            ]),
            [{ v1: 0, v2: 1, v3: 2 }]
        );

        expect(Array.from(positions)).toEqual([
            0, 0, 0,
            1, 0, 0,
            0, 1, 0,
        ]);
    });

    test("writes UVs and colors without growing JS arrays", () => {
        const uvs = createTriangleUvBuffer(
            new Float32Array([0, 0, 1, 0, 0, 1]),
            [{ v1: 0, v2: 1, v3: 2, p1: 0, p2: 1, p3: 2 }]
        );
        const colors = createTriangleColorBuffer(
            new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
            [{ v1: 0, v2: 1, v3: 2, p1: 0, p2: 1, p3: 2 }],
            undefined
        );

        expect(Array.from(uvs)).toEqual([0, 0, 1, 0, 0, 1]);
        expect(Array.from(colors)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- test/build-geometry.test.ts`
Expected: FAIL because `lib/build-geometry.ts` does not exist yet.

- [ ] **Step 3: Implement typed-array geometry helpers**

```ts
// lib/build-geometry.ts
import type { TriangleProperty } from "./util";

export function createTrianglePositionBuffer(vertices: ArrayLike<number>, triangleProperties: TriangleProperty[]) {
    const output = new Float32Array(triangleProperties.length * 9);
    let offset = 0;

    for (const triangle of triangleProperties) {
        offset = writeVertex(output, offset, vertices, triangle.v1);
        offset = writeVertex(output, offset, vertices, triangle.v2);
        offset = writeVertex(output, offset, vertices, triangle.v3);
    }

    return output;
}

export function createTriangleUvBuffer(uvs: ArrayLike<number>, triangleProperties: TriangleProperty[]) {
    const validTriangles = triangleProperties.filter((triangle) => triangle.p1 !== undefined && triangle.p2 !== undefined && triangle.p3 !== undefined);
    const output = new Float32Array(validTriangles.length * 6);
    let offset = 0;

    for (const triangle of validTriangles) {
        offset = writeUv(output, offset, uvs, triangle.p1!);
        offset = writeUv(output, offset, uvs, triangle.p2!);
        offset = writeUv(output, offset, uvs, triangle.p3!);
    }

    return output;
}

export function createTriangleColorBuffer(colors: ArrayLike<number>, triangleProperties: TriangleProperty[], fallbackPindex?: number) {
    const output = new Float32Array(triangleProperties.length * 9);
    let offset = 0;

    for (const triangle of triangleProperties) {
        const p1 = triangle.p1 ?? fallbackPindex;
        const p2 = triangle.p2 ?? p1;
        const p3 = triangle.p3 ?? p1;
        if (p1 === undefined || p2 === undefined || p3 === undefined) continue;

        offset = writeColor(output, offset, colors, p1);
        offset = writeColor(output, offset, colors, p2);
        offset = writeColor(output, offset, colors, p3);
    }

    return output.subarray(0, offset);
}
```

- [ ] **Step 4: Replace builder hot paths with explicit caches and packed buffers**

```ts
// lib/3mf-builder.ts
type BuildObjectCache = Map<string, THREE.Object3D>;
type ResourceCache = Map<string, THREE.Material | THREE.Texture | null>;

function buildObjects(data3mf: ParseResult) {
    const objectCache: BuildObjectCache = new Map();
    const resourceCache: ResourceCache = new Map();
    // build once per object id, clone only at placement boundaries
}

function buildBasematerialsMeshes(...) {
    const positionData = createTrianglePositionBuffer(meshData.vertices, trianglePropertiesProps);
    geometry.setAttribute("position", new THREE.BufferAttribute(positionData, 3));
}

function buildTexturedMesh(...) {
    const positionData = createTrianglePositionBuffer(meshData.vertices, triangleProperties);
    const uvData = createTriangleUvBuffer(texture2dgroup.uvs, triangleProperties);
    geometry.setAttribute("position", new THREE.BufferAttribute(positionData, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvData, 2));
}

function buildVertexColorMesh(...) {
    const fallbackPindex = objectData.pindex !== undefined ? Number(objectData.pindex) : undefined;
    const positionData = createTrianglePositionBuffer(meshData.vertices, triangleProperties);
    const colorData = createTriangleColorBuffer(colorgroup.colors, triangleProperties, fallbackPindex);
    geometry.setAttribute("position", new THREE.BufferAttribute(positionData, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colorData, 3));
}
```

- [ ] **Step 5: Run focused tests plus large-fixture benchmark**

Run: `npm test -- test/build-geometry.test.ts && npm test -- test/builder.test.ts && npm run build && npm run benchmark`
Expected: PASS, and `multipletextures.3mf` plus `truck.3mf` show lower `Build (ms)` or lower `Total (ms)` than the baseline captured in Task 1.

- [ ] **Step 6: Commit**

```bash
git add lib/build-geometry.ts lib/3mf-builder.ts test/build-geometry.test.ts
git commit -m "perf: tighten builder geometry assembly"
```

## Task 4: Lock In Large-Fixture Regressions And Refresh Docs

**Files:**
- Modify: `test/builder.test.ts`
- Modify: `test/support-matrix.test.ts`
- Modify: `docs/benchmarking.md`

- [ ] **Step 1: Write the failing regression tests**

```ts
// test/builder.test.ts
test("multipletextures keeps aligned position and uv attribute counts", async () => {
    const loader = new Fast3MFLoader();
    const data = await loader.parse(await readFixture("multipletextures.3mf"));
    const group = fast3mfBuilder(data);
    const texturedMesh = collectMeshes(group).find((mesh) => hasTextureMap(mesh.material));

    expect(texturedMesh).toBeTruthy();
    expect(texturedMesh!.geometry.getAttribute("position").count).toBe(texturedMesh!.geometry.getAttribute("uv").count);
});

test("truck builds nested component content with visible meshes", async () => {
    const loader = new Fast3MFLoader();
    const data = await loader.parse(await readFixture("truck.3mf"));
    const group = fast3mfBuilder(data);

    expect(group.children.length).toBeGreaterThan(0);
    expect(collectMeshes(group).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the focused regression tests to verify behavior before the doc refresh**

Run: `npm test -- test/builder.test.ts && npm test -- test/support-matrix.test.ts`
Expected: PASS, proving the optimized builder still preserves texture-heavy and component-heavy behavior.

- [ ] **Step 3: Refresh benchmark documentation with before/after evidence**

```md
## Large Fixture Comparison

The optimization work in this plan should be documented with same-machine before/after measurements for:

- `multipletextures.3mf`
- `truck.3mf`

Record parse/build/total timing for both the baseline and the optimized result.
```

- [ ] **Step 4: Run full verification**

Run: `npm run check:test && npm run check:demo && npm test && npm run build && npm run benchmark`
Expected: all checks PASS, benchmark output is phase-separated, and large-fixture documentation is updated from real measurements.

- [ ] **Step 5: Commit**

```bash
git add test/builder.test.ts test/support-matrix.test.ts docs/benchmarking.md
git commit -m "docs: refresh large-fixture benchmark results"
```

## Self-Review

- Coverage check: the plan covers benchmark observability, parse-path optimization, builder-path optimization, and documentation/test closure.
- Placeholder scan: no task relies on "optimize later" language; each task names concrete files, code shapes, commands, and commit messages.
- Scope check: the plan stays inside one coherent sub-project, "large-fixture performance hotspots", without mixing in unrelated feature work.
