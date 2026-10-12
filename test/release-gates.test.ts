import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

async function readText(path: string) {
    return readFile(resolve(process.cwd(), path), "utf8");
}

describe("stable 1.0 release gates", () => {
    test("package.json exposes verify, benchmark:release, and release:check scripts", async () => {
        const packageJson = JSON.parse(await readText("package.json"));

        expect(packageJson.packageManager).toBe("pnpm@10.33.0");
        expect(packageJson.scripts.verify).toBe("pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm consumer:check");
        expect(packageJson.scripts["consumer:check"]).toBe("node scripts/consumer-smoke.mjs");
        expect(packageJson.scripts["consumer:check:browser"]).toBe("node scripts/consumer-smoke.mjs --browser");
        expect(packageJson.scripts["benchmark:release"]).toBe("pnpm --filter @innovgame/fast-3mf-loader benchmark:release");
        expect(packageJson.scripts["release:check"]).toBe(
            "pnpm verify && pnpm benchmark:release && pnpm --filter @innovgame/fast-3mf-loader pack:check",
        );
    });

    test("the library benchmark command stays available without the three.js comparison adapter", async () => {
        const packageJson = JSON.parse(await readText("packages/fast-3mf-loader/package.json"));

        expect(packageJson.scripts.benchmark).toBe("node scripts/benchmark.mjs");
        expect(packageJson.scripts["benchmark:release"]).toBe("node scripts/benchmark-release.mjs");
        expect(packageJson.devDependencies.jsdom).toBeUndefined();
    });

    test("CI uses the shared verify entrypoint", async () => {
        const ci = await readText(".github/workflows/ci.yml");

        expect(ci).toContain("run: pnpm verify");
        expect(ci).toContain("run: pnpm consumer:check:browser");
    });

    test("publish workflow uses the shared release:check entrypoint", async () => {
        const publishWorkflow = await readText(".github/workflows/publish.yml");

        expect(publishWorkflow).toContain("run: pnpm release:check");
        expect(publishWorkflow).not.toContain("run: pnpm verify");
        expect(publishWorkflow).not.toContain("run: pnpm pack --dry-run");
    });

    test("draft release notes call out supported and unsupported boundaries", async () => {
        const notes = await readText("docs/releases/1.0.0-draft.md");

        expect(notes).toContain("Supported in 1.0");
        expect(notes).toContain("Not supported in 1.0");
        expect(notes).toContain("Benchmark evidence");
        expect(notes).toContain("pnpm benchmark:release");
    });
});
