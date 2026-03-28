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
