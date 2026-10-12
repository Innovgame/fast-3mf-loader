import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const publishedFiles = [
    "LICENSE",
    "README.md",
    "package.json",
    "dist/index.d.ts",
    "dist/fast-3mf-loader.js",
    "dist/fast-3mf-loader.umd.cjs",
];

function packedFiles() {
    const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--loglevel=error"], {
        cwd: packageRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
    const jsonStart = output.indexOf("[");
    const payload = JSON.parse(output.slice(jsonStart)) as Array<{ files: Array<{ path: string }> }>;
    return payload[0].files.map((file) => file.path.replace(/^package\//, "")).sort();
}

test("published package contains only the standard library artifacts", () => {
    const build = spawnSync("pnpm", ["exec", "vite", "build"], {
        cwd: packageRoot,
        encoding: "utf8",
    });
    const buildLog = `${build.stdout}\n${build.stderr}`;
    expect(build.status, buildLog).toBe(0);

    expect(packedFiles()).toEqual([...publishedFiles].sort());

    const declaration = readFileSync(resolve(packageRoot, "dist/index.d.ts"), "utf8");
    expect(declaration).not.toMatch(/from ["']easysax["']/);
    expect(declaration).not.toContain('declare module "easysax"');
    expect(declaration).toContain("export declare class Fast3MFLoader");
    expect(declaration).toContain("export declare function fast3mfBuilder");
    typecheckConsumer();
});

function typecheckConsumer() {
    const dir = mkdtempSync(resolve(tmpdir(), "fast-3mf-consumer-"));
    try {
        writeFileSync(
            resolve(dir, "consumer.ts"),
            [
                'import { Fast3MFLoader, fast3mfBuilder } from "@innovgame/fast-3mf-loader";',
                'import type { Model3MF, ParseOptions, ParseResult, ParsedModelPart, Relationship } from "@innovgame/fast-3mf-loader";',
                "",
                "export async function load(data: ArrayBuffer): Promise<Model3MF> {",
                "    const parsed: ParseResult = await new Fast3MFLoader().parse(data, {} satisfies ParseOptions);",
                "    const part: ParsedModelPart = parsed.model[Object.keys(parsed.model)[0]!];",
                "    const rel: Relationship = parsed.rels[0]!;",
                "    fast3mfBuilder(parsed);",
                "    return part && rel ? parsed : parsed;",
                "}",
                "",
            ].join("\n"),
        );
        writeFileSync(
            resolve(dir, "tsconfig.json"),
            JSON.stringify(
                {
                    compilerOptions: {
                        strict: true,
                        noEmit: true,
                        module: "ESNext",
                        moduleResolution: "bundler",
                        target: "ES2022",
                        skipLibCheck: false,
                        paths: {
                            "@innovgame/fast-3mf-loader": [resolve(packageRoot, "dist/index.d.ts")],
                        },
                    },
                    files: ["consumer.ts"],
                },
                null,
                4,
            ),
        );
        execFileSync("pnpm", ["exec", "tsc", "-p", resolve(dir, "tsconfig.json"), "--pretty", "false"], {
            cwd: packageRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
