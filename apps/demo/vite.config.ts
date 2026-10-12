import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(appRoot, "../..");

export default defineConfig({
    plugins: [react(), tailwindcss()],
    define: {
        __LIBRARY_VERSION__: JSON.stringify(
            JSON.parse(readFileSync(path.resolve(projectRoot, "packages/fast-3mf-loader/package.json"), "utf8")).version,
        ),
    },
    root: appRoot,
    base: process.env.GITHUB_PAGES === "true" ? "/fast-3mf-loader/" : "/",
    resolve: {
        alias: {
            "@innovgame/fast-3mf-loader": path.resolve(projectRoot, "packages/fast-3mf-loader/src/index.ts"),
        },
    },
    server: {
        fs: {
            allow: [projectRoot],
        },
    },
});
