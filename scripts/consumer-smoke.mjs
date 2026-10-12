import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = resolve(repoRoot, "packages/fast-3mf-loader");
const browser = process.argv.includes("--browser");
const threeVersion = "0.186.1";

const directories = [];

function run(command, args, options = {}) {
    return new Promise((resolvePromise, reject) => {
        const child = spawn(command, args, { stdio: "inherit", ...options });
        child.on("error", reject);
        child.on("exit", (code, signal) => {
            if (code === 0) {
                resolvePromise();
                return;
            }
            reject(new Error(`${command} ${args.join(" ")} exited with ${signal ?? code}`));
        });
    });
}

async function packLibrary() {
    const staging = await mkdtemp(join(tmpdir(), "fast3mf-pack-"));
    directories.push(staging);
    await cp(resolve(packageRoot, "dist"), resolve(staging, "dist"), { recursive: true });
    await cp(resolve(packageRoot, "README.md"), resolve(staging, "README.md"));
    await cp(resolve(packageRoot, "LICENSE"), resolve(staging, "LICENSE"));
    const pkg = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
    pkg.name = "fast-3mf-loader";
    await writeFile(resolve(staging, "package.json"), `${JSON.stringify(pkg, null, 4)}\n`);
    await run("npm", ["pack", "--loglevel=error"], { cwd: staging });
    return resolve(staging, `fast-3mf-loader-${pkg.version}.tgz`);
}

async function installConsumer(tarball) {
    const app = await mkdtemp(join(tmpdir(), "fast3mf-consumer-"));
    directories.push(app);
    await mkdir(resolve(app, "public"), { recursive: true });
    await cp(tarball, resolve(app, "fast-3mf-loader.tgz"));
    await cp(resolve(repoRoot, "3mf/facecolors.3mf"), resolve(app, "public/facecolors.3mf"));
    await writeFile(resolve(app, "package.json"), `${JSON.stringify({
        name: "fast-3mf-loader-consumer",
        private: true,
        type: "module",
        dependencies: {
            "fast-3mf-loader": "file:./fast-3mf-loader.tgz",
            three: threeVersion,
        },
        devDependencies: {
            "@types/three": "0.186.0",
            ...(browser ? { vite: "8.3.4" } : {}),
        },
    }, null, 4)}\n`);
    await writeFile(resolve(app, "tsconfig.json"), `${JSON.stringify({
        compilerOptions: {
            strict: true,
            noEmit: true,
            module: "ESNext",
            moduleResolution: "bundler",
            target: "ES2022",
            skipLibCheck: false,
            lib: ["ES2022", "DOM"],
        },
        files: ["consumer.ts"],
    }, null, 4)}\n`);
    await writeFile(resolve(app, "consumer.ts"), [
        'import { Fast3MFLoader, fast3mfBuilder } from "fast-3mf-loader";',
        'import type { Model3MF, ParseOptions, ParseResult } from "fast-3mf-loader";',
        "",
        "export async function load(data: ArrayBuffer): Promise<Model3MF> {",
        "    const parsed: ParseResult = await new Fast3MFLoader().parse(data, {} satisfies ParseOptions);",
        "    fast3mfBuilder(parsed);",
        "    return parsed;",
        "}",
        "",
    ].join("\n"));
    await writeFile(resolve(app, "index.html"), [
        "<!doctype html>",
        '<html lang="en">',
        "<body>",
        '<p id="status">pending</p>',
        '<script type="module" src="/main.js"></script>',
        "</body>",
        "</html>",
        "",
    ].join("\n"));
    await writeFile(resolve(app, "main.js"), [
        'import { Fast3MFLoader, fast3mfBuilder } from "fast-3mf-loader";',
        "",
        "const status = document.querySelector(\"#status\");",
        "try {",
        "    const response = await fetch(\"/facecolors.3mf\");",
        "    const parsed = await new Fast3MFLoader().parse(await response.arrayBuffer());",
        "    const group = fast3mfBuilder(parsed);",
        "    status.textContent = `ok models=${Object.keys(parsed.model).length} meshes=${group.children.length}`;",
        "} catch (error) {",
        "    status.textContent = `error ${error instanceof Error ? error.message : String(error)}`;",
        "}",
        "",
    ].join("\n"));
    await writeFile(resolve(app, "vite.config.js"), [
        "import { defineConfig } from \"vite\";",
        "",
        "export default defineConfig({",
        "    optimizeDeps: { exclude: [\"fast-3mf-loader\"] },",
        "    build: { target: \"es2022\" },",
        "    server: { host: \"127.0.0.1\", port: 4188, strictPort: true },",
        "    preview: { host: \"127.0.0.1\", port: 4188, strictPort: true },",
        "});",
        "",
    ].join("\n"));
    await run("npm", ["install", "--ignore-scripts", "--no-fund", "--no-audit", "--loglevel=error"], { cwd: app });
    return app;
}

async function typecheck(app) {
    const tsc = resolve(packageRoot, "node_modules/typescript/bin/tsc");
    await run(process.execPath, [tsc, "-p", resolve(app, "tsconfig.json"), "--pretty", "false"], { cwd: app });
}

async function checkBrowser(app) {
    const vite = resolve(app, "node_modules/vite/bin/vite.js");
    await run(process.execPath, [vite, "build"], { cwd: app });
    const preview = spawn(process.execPath, [vite, "preview", "--host", "127.0.0.1", "--port", "4188", "--strictPort"], {
        cwd: app,
        stdio: "inherit",
    });
    try {
        await waitForPreview();
        const require = createRequire(resolve(repoRoot, "apps/demo/package.json"));
        const { chromium } = require("@playwright/test");
        const browser = await chromium.launch();
        try {
            const page = await browser.newPage();
            const errors = [];
            page.on("pageerror", (error) => errors.push(error.message));
            await page.goto("http://127.0.0.1:4188/");
            await page.getByText(/^ok models=\d+ meshes=\d+$/).waitFor({ timeout: 20000 });
            const text = await page.locator("#status").innerText();
            const meshes = Number(text.match(/meshes=(\d+)/)?.[1] ?? "0");
            if (meshes < 1 || errors.length > 0) {
                throw new Error(`Browser consumer failed: ${text}; ${errors.join("; ")}`);
            }
            console.log(`Browser consumer parsed with published workers: ${text}`);
        } finally {
            await browser.close();
        }
    } finally {
        preview.kill("SIGTERM");
    }
}

async function waitForPreview() {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
        try {
            const response = await globalThis.fetch("http://127.0.0.1:4188/");
            if (response.ok) return;
        } catch {
            // preview is still starting
        }
        await new Promise((resolvePromise) => globalThis.setTimeout(resolvePromise, 200));
    }
    throw new Error("Consumer preview did not start.");
}

try {
    const distEntry = resolve(packageRoot, "dist/index.js");
    try {
        await readFile(distEntry);
    } catch {
        await run("pnpm", ["--filter", "@innovgame/fast-3mf-loader", "build"], { cwd: repoRoot });
    }
    console.log("Checking a fresh install of the packed fast-3mf-loader package.");
    const tarball = await packLibrary();
    const app = await installConsumer(tarball);
    await typecheck(app);
    console.log("Installed package typecheck passed for fast-3mf-loader.");
    if (browser) {
        await checkBrowser(app);
    }
} finally {
    await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })));
}
