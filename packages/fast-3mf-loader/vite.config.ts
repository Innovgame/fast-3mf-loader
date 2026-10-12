import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";

const packageRoot = dirname(fileURLToPath(import.meta.url));

function stripInternalAmbientModules(declarationPath: string) {
    const source = readFileSync(declarationPath, "utf8").replace(/\r\n/g, "\n");
    const ambientStart = source.indexOf('declare module "easysax"');
    const published = (ambientStart === -1 ? source : source.slice(0, ambientStart)).trimEnd().concat("\n");
    writeFileSync(declarationPath, published);
}

export default defineConfig({
    plugins: [
        dts({
            bundleTypes: {
                extractorConfig: {
                    newlineKind: "lf",
                },
            },
            outDirs: "dist",
        }),
        {
            name: "strip-internal-ambient-modules",
            apply: "build",
            writeBundle() {
                stripInternalAmbientModules(resolve(packageRoot, "dist/index.d.ts"));
            },
        },
    ],
    test: {
        exclude: [
            ...configDefaults.exclude,
            "**/.worktrees/**",
            "**/worktrees/**",
        ],
    },
    build: {
        lib: {
            entry: "./lib/main.ts",
            name: "Fast3MFLoader",
            fileName: "fast-3mf-loader",
        },
        rollupOptions: {
            external: ["three"],
            output: {
                // 如果使用 UMD 格式，需要指定全局变量名
                globals: {
                    three: "THREE", // 告诉 Rollup，`three` 在全局环境中的变量名是 `THREE`
                },
            },
        },
    },
});
