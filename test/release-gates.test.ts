import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

async function readText(path: string) {
    return readFile(resolve(process.cwd(), path), "utf8");
}

describe("stable 1.0 release gates", () => {
    test("package.json exposes verify, benchmark:release, and release:check scripts", async () => {
        const packageJson = JSON.parse(await readText("package.json"));

        expect(packageJson.scripts.verify).toBe("npm run check:demo && npm run check:test && npm test && npm run build");
        expect(packageJson.scripts["benchmark:release"]).toBe(
            "FAST3MF_BENCHMARK_WARMUP_RUNS=2 FAST3MF_BENCHMARK_MEASURED_RUNS=7 FAST3MF_BENCHMARK_WORKERS=6 npm run benchmark",
        );
        expect(packageJson.scripts["release:check"]).toBe("npm run verify && npm run benchmark:release && npm pack --dry-run");
    });

    test("package.json includes jsdom type declarations for TypeScript test coverage", async () => {
        const packageJson = JSON.parse(await readText("package.json"));

        expect(packageJson.devDependencies.jsdom).toBeDefined();
        expect(packageJson.devDependencies["@types/jsdom"]).toBeDefined();
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
        expect(notes).toContain("npm run benchmark:release");
    });
});
