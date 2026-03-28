# Stable 1.0 Release Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved stable-`1.0` roadmap into executable work that aligns claims, preserves performance evidence, hardens usability, and creates a repeatable release gate for `fast-3mf-loader`.

**Architecture:** Keep the public surface centered on `Fast3MFLoader` and `fast3mfBuilder`, and drive `1.0` through four phases: claim alignment, performance hardening, usability / API stability, and release readiness. The stable-`1.0` summary docs are already synced on the current branch, so this plan starts with the remaining executable work: product-claim alignment in the public docs, runtime/API hardening, benchmark-backed release gates, and release-note preparation.

**Tech Stack:** TypeScript, Vitest, Vite library mode, Web Workers, GitHub Actions, Markdown docs, npm packaging

---

## File Map

- Modify: `README.md`
  Responsibility: define the canonical English product claims, runtime story, quick start, and support boundary pointers
- Modify: `README-zh.md`
  Responsibility: keep the Chinese-facing product claims and quick start aligned with `README.md`
- Modify: `docs/support-matrix.md`
  Responsibility: remain the canonical support-boundary reference tied to fixture-backed evidence
- Create: `test/docs-claims.test.ts`
  Responsibility: keep docs and roadmap claims aligned with the approved stable-`1.0` framing
- Modify: `test/public-api.test.ts`
  Responsibility: keep the documented public API surface locked
- Modify: `test/types.test.ts`
  Responsibility: keep helper-type claims and public return shapes locked
- Modify: `lib/fast-3mf-loader.ts`
  Responsibility: tighten worker/error ergonomics without expanding the public API surface
- Modify: `test/runtime-behavior.test.ts`
  Responsibility: lock the documented worker-count and browser-first runtime expectations
- Modify: `test/error-handling.test.ts`
  Responsibility: lock deterministic loader-prefixed failure behavior
- Modify: `package.json`
  Responsibility: expose repeatable `verify` and `release:check` commands
- Modify: `.github/workflows/ci.yml`
  Responsibility: use the new verification entrypoint instead of duplicating commands
- Modify: `.github/workflows/npm-publish.yml`
  Responsibility: run the release sanity checks that are safe before publish
- Modify: `docs/benchmarking.md`
  Responsibility: document the benchmark evidence required for `1.0`
- Create: `docs/releases/1.0.0-draft.md`
  Responsibility: draft the `1.0` release notes and known limits
- Create: `test/release-gates.test.ts`
  Responsibility: lock the presence of required scripts, workflows, and release-note anchors
- Modify: `docs/superpowers/status/current-work.md`
  Responsibility: record the active `1.0` phase and note when the remaining release work changes state

## Task 1: Align README Claims With The Actual Public Contract

**Files:**
- Modify: `README.md`
- Modify: `README-zh.md`
- Modify: `docs/support-matrix.md`
- Create: `test/docs-claims.test.ts`
- Modify: `test/public-api.test.ts`
- Modify: `test/types.test.ts`

- [ ] **Step 1: Write the failing docs-claims test**

```ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "vitest";

async function readDoc(path: string) {
    return readFile(resolve(process.cwd(), path), "utf8");
}

test("README describes streaming as an internal parsing strategy, not a chunked public API", async () => {
    const readme = await readDoc("README.md");

    expect(readme).toContain("Uses SAX-style XML parsing internally to keep memory usage lower");
    expect(readme).not.toContain("Supports chunked loading and parsing of large files");
});

test("README-zh uses the same support-boundary framing", async () => {
    const readmeZh = await readDoc("README-zh.md");

    expect(readmeZh).toContain("内部采用 SAX 风格流式解析");
    expect(readmeZh).not.toContain("支持分块加载和解析大文件");
});

test("summary roadmap stays on the stable 1.0 framing", async () => {
    const roadmap = await readDoc("docs/superpowers/roadmap/current-roadmap.md");

    expect(roadmap).toContain("Stable 1.0 Release");
    expect(roadmap).toContain("Phase 4: Release Readiness");
});
```

- [ ] **Step 2: Run the focused docs test to verify it fails**

Run: `npm test -- test/docs-claims.test.ts`
Expected: FAIL because both README files still overstate the current streaming claim.

- [ ] **Step 3: Rewrite the feature bullets and support-boundary copy**

```md
- 🚀 **Streaming-Oriented Parsing** - Uses SAX-style XML parsing internally to keep memory usage lower on large 3MF archives
- ⚡ **WebWorker Parallelism** - Parses model parts across WebWorkers with an auto-sized worker pool
- 📦 **Benchmark-Backed Efficiency** - Ships measured optimizations for large texture-heavy and component-heavy fixtures
- 🛠 **Stable TypeScript Surface** - Exports `Fast3MFLoader`, `fast3mfBuilder`, and the documented helper types
- 🌐 **Browser-First Runtime** - Targets modern browsers with `Worker` and `Blob` support
```

```md
## Support Boundary

Current support is defined by fixture-backed behavior and documented in `docs/support-matrix.md`.
Unsupported features, including print tickets and extension resources beyond current fixture coverage, should be treated as unsupported until explicitly documented otherwise.
```

- [ ] **Step 4: Tighten the public-contract tests**

```ts
import { expect, test } from "vitest";
import { Fast3MFLoader, fast3mfBuilder } from "../lib/main";

test("exports the documented public API", () => {
    expect(typeof Fast3MFLoader).toBe("function");
    expect(typeof fast3mfBuilder).toBe("function");
});
```

```ts
import { expectTypeOf, test } from "vitest";
import { Fast3MFLoader, type Model3MF, type ParseResult } from "../lib/main";

test("parse returns the documented helper types", () => {
    expectTypeOf<ReturnType<Fast3MFLoader["parse"]>>().toEqualTypeOf<Promise<ParseResult>>();
    expectTypeOf<Model3MF>().toEqualTypeOf<ParseResult>();
});
```

- [ ] **Step 5: Run the focused verification**

Run: `npm test -- test/docs-claims.test.ts test/public-api.test.ts test/types.test.ts test/support-matrix.test.ts`
Expected: PASS, with docs claims and type/public API checks aligned.

- [ ] **Step 6: Commit**

```bash
git add README.md README-zh.md docs/support-matrix.md test/docs-claims.test.ts test/public-api.test.ts test/types.test.ts
git commit -m "docs: align public claims with stable 1.0 contract"
```

## Task 2: Harden Worker And Error Ergonomics Without Expanding The API

**Files:**
- Modify: `lib/fast-3mf-loader.ts`
- Modify: `README.md`
- Modify: `README-zh.md`
- Modify: `test/runtime-behavior.test.ts`
- Modify: `test/error-handling.test.ts`

- [ ] **Step 1: Write the failing runtime/error tests**

```ts
test("resolveWorkerCount documents the browser-first fallback strategy", () => {
    expect(resolveWorkerCount(undefined, Number.NaN)).toBe(4);
    expect(resolveWorkerCount(undefined, 1)).toBe(1);
    expect(resolveWorkerCount(undefined, 32)).toBe(15);
});

test("rejects unzip failures with a Fast3MFLoader-prefixed message", async () => {
    const Fast3MFLoader = await loadFast3MFLoader();
    const loader = new Fast3MFLoader();

    await expect(loader.parse(new ArrayBuffer(8))).rejects.toThrow("Fast3MFLoader:");
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- test/runtime-behavior.test.ts test/error-handling.test.ts`
Expected: FAIL because the current unzip/error path does not consistently prefix loader-facing messages.

- [ ] **Step 3: Normalize loader-facing errors in `lib/fast-3mf-loader.ts`**

```ts
function toLoaderError(error: unknown, fallback: string): Error {
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw && raw !== "undefined" ? raw : fallback;
    return message.startsWith("Fast3MFLoader:") ? new Error(message) : new Error(`Fast3MFLoader: ${message}`);
}

try {
    zip = await unzipData(data);
    manifest = collectArchiveManifest(zip);
} catch (error) {
    throw toLoaderError(error, "Failed to unzip 3MF archive.");
}
```

- [ ] **Step 4: Document the worker/runtime assumptions in both READMEs**

```md
## Runtime Notes

- Designed for modern browsers with `Worker` and `Blob` support
- `workerCount` defaults to `min(hardwareConcurrency - 1, 15)` with a safe fallback of `4`
- Unsupported features currently warn instead of silently pretending to succeed
```

- [ ] **Step 5: Run the focused tests again**

Run: `npm test -- test/runtime-behavior.test.ts test/error-handling.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/fast-3mf-loader.ts README.md README-zh.md test/runtime-behavior.test.ts test/error-handling.test.ts
git commit -m "refactor: harden worker and error ergonomics"
```

## Task 3: Lock The Release Gates In Scripts, Workflows, And Notes

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/npm-publish.yml`
- Modify: `docs/benchmarking.md`
- Create: `docs/releases/1.0.0-draft.md`
- Create: `test/release-gates.test.ts`

- [ ] **Step 1: Write the failing release-gates test**

```ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

async function readText(path: string) {
    return readFile(resolve(process.cwd(), path), "utf8");
}

describe("stable 1.0 release gates", () => {
    test("package.json exposes verify and release:check scripts", async () => {
        const packageJson = JSON.parse(await readText("package.json"));

        expect(packageJson.scripts.verify).toBe("npm run check:demo && npm run check:test && npm test && npm run build");
        expect(packageJson.scripts["release:check"]).toBe("npm run verify && npm run benchmark && npm pack --dry-run");
    });

    test("CI uses the shared verify entrypoint", async () => {
        const ci = await readText(".github/workflows/ci.yml");

        expect(ci).toContain("run: npm run verify");
    });

    test("draft release notes call out supported and unsupported boundaries", async () => {
        const notes = await readText("docs/releases/1.0.0-draft.md");

        expect(notes).toContain("Supported in 1.0");
        expect(notes).toContain("Not supported in 1.0");
        expect(notes).toContain("Benchmark evidence");
    });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- test/release-gates.test.ts`
Expected: FAIL because the shared scripts and draft release notes do not exist yet.

- [ ] **Step 3: Add the shared verification scripts and workflow wiring**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -p tsconfig.lib.json && vite build",
  "benchmark": "node scripts/benchmark.mjs",
  "check:demo": "tsc -p tsconfig.demo.json --noEmit",
  "check:test": "tsc -p tsconfig.test.json --noEmit",
  "test": "vitest run",
  "verify": "npm run check:demo && npm run check:test && npm test && npm run build",
  "release:check": "npm run verify && npm run benchmark && npm pack --dry-run"
}
```

```yaml
- name: Verify package
  run: npm run verify
```

```yaml
- name: Release sanity check
  run: npm pack --dry-run
```

- [ ] **Step 4: Capture the benchmark gate and draft release notes**

```md
## Stable 1.0 Benchmark Gate

Before publishing `1.0`, run `npm run release:check` on the release machine and refresh the large-fixture benchmark sample if the numbers moved materially.
```

```md
# fast-3mf-loader 1.0.0 Draft Notes

## Supported in 1.0

- Archive unzip, root relationships, base mesh geometry, vertex colors, texture resources / texture groups, and components

## Not supported in 1.0

- Print tickets
- Extension resources beyond current fixture coverage
- A public chunked-input parsing API

## Benchmark evidence

- Reference the current `docs/benchmarking.md` sample and the command used to produce it
```

- [ ] **Step 5: Run the release-focused verification**

Run: `npm test -- test/release-gates.test.ts && npm run verify && npm run benchmark && npm pack --dry-run`
Expected:
- tests PASS
- `npm run verify` PASS
- benchmark prints `Parse (ms)`, `Build (ms)`, and `Total (ms)`
- `npm pack --dry-run` lists only the expected package payload

- [ ] **Step 6: Commit**

```bash
git add package.json .github/workflows/ci.yml .github/workflows/npm-publish.yml docs/benchmarking.md docs/releases/1.0.0-draft.md test/release-gates.test.ts
git commit -m "ci: add stable 1.0 release gates"
```

## Task 4: Record Phase Progress In The Handoff Status Doc

**Files:**
- Modify: `docs/superpowers/status/current-work.md`

- [ ] **Step 1: Update the handoff doc to reflect completed 1.0 phases**

```md
## Latest Completed

- Phase 1 claim alignment completed:
  - README / README-zh wording aligned with the public contract
  - support matrix and helper-type docs aligned
- Phase 2 / 4 release gates completed:
  - `verify` and `release:check` scripts added
  - benchmark sample and `1.0` draft notes refreshed

## In Progress

- Final review of the remaining `1.0` blockers before release tagging
```

- [ ] **Step 2: Verify the status doc still points to the right execution entrypoints**

Run: `rg -n "stable-1-0-roadmap|1.0" docs/superpowers/status/current-work.md`
Expected:
- output references `docs/superpowers/specs/2026-03-28-stable-1-0-roadmap-design.md`
- output references `docs/superpowers/plans/2026-03-28-stable-1-0-roadmap.md`

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/status/current-work.md
git commit -m "docs: refresh 1.0 handoff status"
```

## Self-Review Checklist

- [ ] Confirm each `1.0` phase from `docs/superpowers/specs/2026-03-28-stable-1-0-roadmap-design.md` is implemented by at least one task in this plan.
- [ ] Scan the plan for vague wording or unfinished instructions and fix them inline.
- [ ] Verify the commands, script names, file paths, and exported identifiers match the current repository.
- [ ] Confirm the plan still preserves the current public API and keeps chunked public input as a post-`1.0` item.
