# Benchmark Three.js 对比 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `three.js` 默认 `ThreeMFLoader` 的同机对照并入现有 `npm run benchmark`，在不改变本库 release gate 语义的前提下输出 `fast-3mf-loader` 与 `three.js` 的 `parse/build/total` benchmark 样本。

**Architecture:** 继续以 `scripts/benchmark-core.mjs` 作为纯测量与汇总层，并新增一个隔离的 `three.js` benchmark adapter 处理 Node 环境下的 `DOMParser`、`TextureLoader` 和失败分类。由于 `ThreeMFLoader.parse(data)` 直接返回构建完成的 `THREE.Group`，benchmark 明确采用“fused parse+build”语义：`three Parse` 记录 `parse()` 总耗时，`three Build` 固定为 `0.0ms`，`three Total` 重复同一总耗时，并在 CLI 与文档中明确注明这一点。

**Tech Stack:** Node benchmark scripts, Vitest, three.js examples loader, `linkedom`, `node:worker_threads`, Vite library build

---

## File Map

- Modify: `package.json`
  Responsibility: 增加 benchmark 运行所需的 DOM parser dev dependency
- Modify: `package-lock.json`
  Responsibility: 锁定新增 benchmark dev dependency
- Modify: `scripts/benchmark-core.mjs`
  Responsibility: 扩展 benchmark 对比数据结构、失败分类与表格格式化 helper
- Modify: `scripts/benchmark-core.d.mts`
  Responsibility: 为 benchmark core 新增的 comparison/three status 类型补类型声明
- Create: `scripts/benchmark-threejs-adapter.mjs`
  Responsibility: 隔离 `ThreeMFLoader` 的 Node benchmark 适配，包括 `DOMParser` polyfill 与 `parse()` 测量
- Modify: `scripts/benchmark.mjs`
  Responsibility: 在现有 benchmark CLI 中同时运行 `fast-3mf-loader` 与 `three.js` 对照，并输出对比表、spread 与失败说明
- Modify: `test/benchmark-core.test.ts`
  Responsibility: 用 deterministic tests 锁定 comparison row、three failure classification 与 fused timing 语义
- Modify: `docs/benchmarking.md`
  Responsibility: 记录新的 three.js 对照口径、失败展示规则与 sample output 边界
- Modify: `docs/superpowers/status/current-work.md`
  Responsibility: 在实现开始、关键节点与完成后同步接力状态

## Task 1: 扩展 Benchmark Core 的对比数据结构与纯函数测试

**Files:**
- Modify: `scripts/benchmark-core.mjs`
- Modify: `scripts/benchmark-core.d.mts`
- Modify: `test/benchmark-core.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 comparison 行与 three failure 展示规则**

```ts
import { describe, expect, test } from "vitest";

const {
    classifyThreeBenchmarkError,
    summarizeComparisonRows,
    summarizeThreeMeasurements,
} = await import("../scripts/benchmark-core.mjs");

describe("summarizeComparisonRows", () => {
    test("renders fast and three columns together when three succeeds", () => {
        const rows = summarizeComparisonRows([
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                fast: {
                    fixture: "truck.3mf",
                    sizeKiB: 2587.2,
                    parseMs: 120,
                    buildMs: 11,
                    totalMs: 131,
                    models: 1,
                    children: 2,
                    parseRangeMs: [100, 130],
                    buildRangeMs: [8, 12],
                    totalRangeMs: [110, 142],
                    runs: 5,
                },
                three: {
                    fixture: "truck.3mf",
                    sizeKiB: 2587.2,
                    parseMs: 210,
                    buildMs: 0,
                    totalMs: 210,
                    children: 2,
                    parseRangeMs: [205, 215],
                    buildRangeMs: [0, 0],
                    totalRangeMs: [205, 215],
                    runs: 5,
                    status: "ok",
                },
            },
        ]);

        expect(rows).toEqual([
            {
                Fixture: "truck.3mf",
                "Size (KiB)": "2587.2",
                "fast Parse": "120.0",
                "fast Build": "11.0",
                "fast Total": "131.0",
                "three Parse": "210.0",
                "three Build": "0.0",
                "three Total": "210.0",
                Status: "ok (fused parse+build)",
            },
        ]);
    });

    test("prints unsupported/failed when three cannot complete a fixture", () => {
        const rows = summarizeComparisonRows([
            {
                fixture: "multipletextures.3mf",
                sizeKiB: 3020.7,
                fast: {
                    fixture: "multipletextures.3mf",
                    sizeKiB: 3020.7,
                    parseMs: 414.7,
                    buildMs: 3.8,
                    totalMs: 424.2,
                    models: 1,
                    children: 1,
                    parseRangeMs: [389.9, 423.1],
                    buildRangeMs: [3.4, 19.9],
                    totalRangeMs: [393.8, 434.7],
                    runs: 5,
                },
                three: {
                    fixture: "multipletextures.3mf",
                    sizeKiB: 3020.7,
                    status: "unsupported",
                    detail: "THREE.3MFLoader: Unsupported resource type.",
                },
            },
        ]);

        expect(rows[0]["three Parse"]).toBe("unsupported/failed");
        expect(rows[0]["three Build"]).toBe("unsupported/failed");
        expect(rows[0]["three Total"]).toBe("unsupported/failed");
        expect(rows[0].Status).toBe("three unsupported");
    });
});

describe("classifyThreeBenchmarkError", () => {
    test("maps known three.js support-boundary errors to unsupported", () => {
        expect(classifyThreeBenchmarkError(new Error("THREE.3MFLoader: Unsupported resource type."))).toEqual({
            status: "unsupported",
            detail: "THREE.3MFLoader: Unsupported resource type.",
        });
    });
});

describe("summarizeThreeMeasurements", () => {
    test("uses medians for successful fused three.js runs", () => {
        const summary = summarizeThreeMeasurements([
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 220,
                buildMs: 0,
                totalMs: 220,
                children: 2,
                status: "ok",
            },
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 210,
                buildMs: 0,
                totalMs: 210,
                children: 2,
                status: "ok",
            },
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 240,
                buildMs: 0,
                totalMs: 240,
                children: 2,
                status: "ok",
            },
        ]);

        expect(summary).toEqual({
            fixture: "truck.3mf",
            sizeKiB: 2587.2,
            parseMs: 220,
            buildMs: 0,
            totalMs: 220,
            children: 2,
            parseRangeMs: [210, 240],
            buildRangeMs: [0, 0],
            totalRangeMs: [210, 240],
            runs: 3,
            status: "ok",
        });
    });
});
```

- [ ] **Step 2: 运行 focused test，确认这些新导出当前还不存在**

Run: `npm test -- test/benchmark-core.test.ts`
Expected: FAIL with missing exports such as `classifyThreeBenchmarkError`, `summarizeComparisonRows`, or `summarizeThreeMeasurements`.

- [ ] **Step 3: 在 benchmark core 中补 comparison 类型、three measurement 汇总和失败分类**

```js
// scripts/benchmark-core.mjs
export function classifyThreeBenchmarkError(error) {
    const detail = error instanceof Error ? error.message : String(error);
    const unsupportedPatterns = [
        /THREE\.3MFLoader: Unsupported resource type\./i,
        /THREE\.ThreeMFLoader: Cannot find relationship file `rels` in 3MF archive\./i,
        /THREE\.3MFLoader: Error loading 3MF - no 3MF document found/i,
    ];

    return {
        status: unsupportedPatterns.some((pattern) => pattern.test(detail)) ? "unsupported" : "failed",
        detail,
    };
}

export function summarizeThreeMeasurements(rows) {
    if (rows.length === 0) {
        throw new Error("Cannot summarize an empty three.js benchmark run.");
    }

    const firstFailure = rows.find((row) => row.status !== "ok");
    if (firstFailure) {
        return {
            fixture: firstFailure.fixture,
            sizeKiB: firstFailure.sizeKiB,
            status: firstFailure.status,
            detail: firstFailure.detail,
        };
    }

    const first = rows[0];
    return {
        fixture: first.fixture,
        sizeKiB: first.sizeKiB,
        parseMs: median(rows.map((row) => row.parseMs)),
        buildMs: median(rows.map((row) => row.buildMs)),
        totalMs: median(rows.map((row) => row.totalMs)),
        children: first.children,
        parseRangeMs: range(rows.map((row) => row.parseMs)),
        buildRangeMs: range(rows.map((row) => row.buildMs)),
        totalRangeMs: range(rows.map((row) => row.totalMs)),
        runs: rows.length,
        status: "ok",
    };
}

export function summarizeComparisonRows(rows) {
    return rows.map((row) => ({
        Fixture: row.fixture,
        "Size (KiB)": row.sizeKiB.toFixed(1),
        "fast Parse": row.fast.parseMs.toFixed(1),
        "fast Build": row.fast.buildMs.toFixed(1),
        "fast Total": row.fast.totalMs.toFixed(1),
        "three Parse": formatComparisonTiming(row.three, "parseMs"),
        "three Build": formatComparisonTiming(row.three, "buildMs"),
        "three Total": formatComparisonTiming(row.three, "totalMs"),
        Status: row.three.status === "ok" ? "ok (fused parse+build)" : `three ${row.three.status}`,
    }));
}

function formatComparisonTiming(row, key) {
    return row.status === "ok" ? row[key].toFixed(1) : "unsupported/failed";
}
```

- [ ] **Step 4: 同步类型声明，避免 benchmark helper 在测试和脚本里失去静态约束**

```ts
// scripts/benchmark-core.d.mts
export type BenchmarkStatus = "ok" | "unsupported" | "failed";

export type ThreeBenchmarkRow =
    | {
          fixture: string;
          sizeKiB: number;
          parseMs: number;
          buildMs: number;
          totalMs: number;
          children: number;
          status: "ok";
      }
    | {
          fixture: string;
          sizeKiB: number;
          status: "unsupported" | "failed";
          detail: string;
      };

export type ThreeBenchmarkAggregateRow =
    | {
          fixture: string;
          sizeKiB: number;
          parseMs: number;
          buildMs: number;
          totalMs: number;
          children: number;
          parseRangeMs: [number, number];
          buildRangeMs: [number, number];
          totalRangeMs: [number, number];
          runs: number;
          status: "ok";
      }
    | {
          fixture: string;
          sizeKiB: number;
          status: "unsupported" | "failed";
          detail: string;
      };

export type BenchmarkComparisonRow = {
    fixture: string;
    sizeKiB: number;
    fast: BenchmarkAggregateRow;
    three: ThreeBenchmarkAggregateRow;
};

export type BenchmarkComparisonSummaryRow = {
    Fixture: string;
    "Size (KiB)": string;
    "fast Parse": string;
    "fast Build": string;
    "fast Total": string;
    "three Parse": string;
    "three Build": string;
    "three Total": string;
    Status: string;
};
```

- [ ] **Step 5: 重跑 focused test，确认 comparison helper 已被纯函数测试覆盖**

Run: `npm test -- test/benchmark-core.test.ts`
Expected: PASS, including the new `three unsupported` / `ok (fused parse+build)` expectations.

- [ ] **Step 6: 提交 benchmark core 的测试先行改动**

```bash
git add scripts/benchmark-core.mjs scripts/benchmark-core.d.mts test/benchmark-core.test.ts
git commit -m "test: add benchmark comparison core coverage"
```

## Task 2: 接入 three.js adapter 并把对照跑进现有 benchmark CLI

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/benchmark-threejs-adapter.mjs`
- Modify: `scripts/benchmark.mjs`
- Modify: `docs/superpowers/status/current-work.md`

- [ ] **Step 1: 安装 Node benchmark 所需的 DOM parser 依赖**

Run: `npm install -D linkedom`
Expected: PASS, `package.json` 新增 `"linkedom"` 到 `devDependencies`，并刷新 `package-lock.json`。

- [ ] **Step 2: 在 current-work 中记录“benchmark three.js comparison implementation started”**

```md
- 2026-03-29 已确认 `docs/superpowers/plans/2026-03-29-benchmark-threejs-comparison.md`，
  当前开始把 `three.js` 默认 `ThreeMFLoader` 并入现有 `npm run benchmark`
- 关键实现约束已经锁定：
  - `three.js` 对照继续留在现有 benchmark 命令中
  - `ThreeMFLoader.parse(data)` 采用 fused parse+build 口径
  - 对照失败显示 `unsupported/failed`，不升级为 release gate failure
```

- [ ] **Step 3: 新增隔离的 three.js benchmark adapter，处理 `DOMParser` polyfill 与 fused timing**

```js
// scripts/benchmark-threejs-adapter.mjs
import { performance } from "node:perf_hooks";
import { DOMParser } from "linkedom";
import * as THREE from "three";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { classifyThreeBenchmarkError, installNodeTextureLoaderFallback } from "./benchmark-core.mjs";

export function installThreeBenchmarkAdapter() {
    const restoreDomParser = installDomParserPolyfill();
    const restoreTextureLoader = installNodeTextureLoaderFallback({
        TextureLoader: THREE.TextureLoader,
        Texture: THREE.Texture,
    });

    return {
        ThreeMFLoader,
        restore() {
            restoreTextureLoader();
            restoreDomParser();
        },
    };
}

export function measureThreeFixture({
    fixtureName,
    fixtureBytes,
    now = () => performance.now(),
    ThreeMFLoaderClass = ThreeMFLoader,
}) {
    const loader = new ThreeMFLoaderClass();
    const input = fixtureBytes.slice().buffer;
    const start = now();

    try {
        const group = loader.parse(input);
        const totalMs = now() - start;

        return {
            fixture: fixtureName,
            sizeKiB: fixtureBytes.byteLength / 1024,
            parseMs: totalMs,
            buildMs: 0,
            totalMs,
            children: group.children.length,
            status: "ok",
        };
    } catch (error) {
        return {
            fixture: fixtureName,
            sizeKiB: fixtureBytes.byteLength / 1024,
            ...classifyThreeBenchmarkError(error),
        };
    }
}

function installDomParserPolyfill() {
    const originalDomParser = globalThis.DOMParser;
    globalThis.DOMParser = DOMParser;

    return () => {
        if (typeof originalDomParser === "undefined") {
            delete globalThis.DOMParser;
            return;
        }

        globalThis.DOMParser = originalDomParser;
    };
}
```

- [ ] **Step 4: 在 CLI 中同时测 fast 与 three，并把对照失败限制在当前 fixture 行内**

```js
// scripts/benchmark.mjs
import {
    measureFixture,
    resolveBenchmarkConfig,
    summarizeComparisonRows,
    summarizeFixtureMeasurements,
    summarizeThreeMeasurements,
} from "./benchmark-core.mjs";
import { installThreeBenchmarkAdapter, measureThreeFixture } from "./benchmark-threejs-adapter.mjs";

const threeAdapter = installThreeBenchmarkAdapter();

try {
    const rows = [];
    const failureNotes = [];

    for (const fixtureName of fixtureNames) {
        const file = await readFile(resolve(process.cwd(), "3mf", fixtureName));
        const fixtureBytes = Uint8Array.from(file);

        for (let i = 0; i < warmupRuns; i++) {
            await measureFixture({
                fixtureName,
                fixtureBytes,
                workerCount,
                Fast3MFLoader,
                fast3mfBuilder,
            });
            measureThreeFixture({
                fixtureName,
                fixtureBytes,
                ThreeMFLoaderClass: threeAdapter.ThreeMFLoader,
            });
        }

        const fastMeasurements = [];
        const threeMeasurements = [];

        for (let i = 0; i < measuredRuns; i++) {
            fastMeasurements.push(
                await measureFixture({
                    fixtureName,
                    fixtureBytes,
                    workerCount,
                    Fast3MFLoader,
                    fast3mfBuilder,
                }),
            );

            const threeMeasurement = measureThreeFixture({
                fixtureName,
                fixtureBytes,
                ThreeMFLoaderClass: threeAdapter.ThreeMFLoader,
            });
            threeMeasurements.push(threeMeasurement);

            if (threeMeasurement.status !== "ok") {
                break;
            }
        }

        const fast = summarizeFixtureMeasurements(fastMeasurements);
        const three = summarizeThreeMeasurements(threeMeasurements);

        rows.push({
            fixture: fixtureName,
            sizeKiB: fast.sizeKiB,
            fast,
            three,
        });

        if (three.status !== "ok") {
            failureNotes.push(`${fixtureName} | three ${three.status} | ${three.detail}`);
        }
    }

    printTable(rows);
    printSpread(rows.map((row) => row.fast));
    printFailureNotes(failureNotes);
} finally {
    threeAdapter.restore();
}

function printTable(rows) {
    const formattedRows = summarizeComparisonRows(rows);
    const columns = Object.keys(formattedRows[0]);
    const widths = Object.fromEntries(
        columns.map((column) => [
            column,
            Math.max(column.length, ...formattedRows.map((row) => row[column].length)),
        ]),
    );

    const header = columns.map((column) => column.padEnd(widths[column])).join("  ");
    const divider = columns.map((column) => "-".repeat(widths[column])).join("  ");
    console.log(header);
    console.log(divider);
    for (const row of formattedRows) {
        console.log(columns.map((column) => row[column].padEnd(widths[column])).join("  "));
    }
}

function printFailureNotes(notes) {
    if (notes.length === 0) {
        return;
    }

    console.log("");
    console.log("three.js fixture notes");
    for (const note of notes) {
        console.log(note);
    }
}
```

- [ ] **Step 5: 先跑 focused benchmark tests，再跑真实 benchmark 命令**

Run: `npm test -- test/benchmark-core.test.ts && npm run build && npm run benchmark`
Expected:
- focused benchmark tests PASS
- benchmark 输出包含 `fast Parse` / `fast Build` / `fast Total` / `three Parse` / `three Build` / `three Total` / `Status`
- successful three.js rows显示 `ok (fused parse+build)`
- failing three.js rows只影响当前 fixture，显示 `three unsupported` 或 `three failed`

- [ ] **Step 6: 提交 three.js adapter 与 CLI integration**

```bash
git add package.json package-lock.json scripts/benchmark-threejs-adapter.mjs scripts/benchmark.mjs docs/superpowers/status/current-work.md
git commit -m "feat: compare benchmark against threejs loader"
```

## Task 3: 刷新 benchmark 文档、状态摘要并跑完整验证

**Files:**
- Modify: `docs/benchmarking.md`
- Modify: `docs/superpowers/status/current-work.md`

- [ ] **Step 1: 用新的 benchmark 口径重写方法说明，明确 fused parse+build 与 failure semantics**

```md
The benchmark imports the built `dist/fast-3mf-loader.js` bundle, runs the same fixture set through both `fast-3mf-loader` and the default `three.js` `ThreeMFLoader`, and reports median parse/build/total timings for each implementation.

`three.js` does not expose a separate builder step. In this benchmark, `three Parse` is the full `ThreeMFLoader.parse(data)` wall-clock time, `three Build` is fixed at `0.0ms`, and `three Total` repeats the same fused total so the comparison table can keep the same phase columns without pretending three.js has a separate public build API.

If `three.js` cannot finish a fixture, the table prints `unsupported/failed` for that fixture's three.js timing cells and keeps the benchmark command running. This is comparison evidence only, not a release gate failure.
```

- [ ] **Step 2: 用 Step 4 的真实命令输出刷新 sample results，并把失败展示格式也记进文档**

Run: `npm run benchmark`
Expected: PASS and prints the exact comparison table and any short fixture-notes block that should be copied into `docs/benchmarking.md`.

Add this note directly under the sample table:

```md
When a fixture cannot be completed by the default `three.js` loader in this Node benchmark harness, the timing cells are rendered as `unsupported/failed` and the detailed reason is printed in the short fixture-notes block below the main table.
```

- [ ] **Step 3: 在 current-work 中把 this session 的结果更新为“benchmark 对照已完成/待发布机器刷新样本”**

```md
- 2026-03-29 已完成 `three.js` 默认 `ThreeMFLoader` benchmark 对照接线：
  - `npm run benchmark` 现在同时输出 `fast-3mf-loader` 与 `three.js` 的同机对照表
  - `three.js` 默认 loader 采用 fused parse+build 口径：`three Parse` 记录总耗时，`three Build` 固定为 `0.0ms`
  - `three.js` 失败时显示 `unsupported/failed`，不让 benchmark 或 `release:check` 因对照项直接失败
- 下一步：
  - 在目标 release machine 上重新执行 `npm run benchmark:release`
  - 用 release-machine 输出刷新 `docs/benchmarking.md` 的 sample results
```

- [ ] **Step 4: 跑完整验证，确认 release gate 语义没有被对照项破坏**

Run: `npm run verify && npm run benchmark && npm run release:check`
Expected:
- `npm run verify` PASS
- `npm run benchmark` PASS and includes the comparison table
- `npm run release:check` PASS even if a three.js comparison row is `unsupported/failed`

- [ ] **Step 5: 提交文档、状态与验证结果**

```bash
git add docs/benchmarking.md docs/superpowers/status/current-work.md
git commit -m "docs: document threejs benchmark comparison"
```

## Self-Review

- Spec coverage:
  - 已覆盖“并入现有 `npm run benchmark`”的 CLI 改造
  - 已覆盖 `parse/build/total` 三列对比，并显式说明 three.js 的 fused phase 语义
  - 已覆盖 `unsupported/failed` failure semantics
  - 已覆盖 docs、status 与 release gate 关系
- Placeholder scan:
  - 计划里的代码步骤都给出了明确函数名、文件路径和命令
  - sample results 步骤要求直接复制前一步 benchmark 输出，而不是保留未定义 TODO
- Type consistency:
  - `status` 统一使用 `ok | unsupported | failed`
  - three.js 成功行统一使用 `parseMs/buildMs/totalMs`
  - 对比表统一使用 `fast Parse` / `three Parse` 等列名
