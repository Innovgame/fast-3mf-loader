import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(appRoot, "../..");

export default defineConfig({
    root: appRoot,
    base: process.env.GITHUB_PAGES === "true" ? "/fast-3mf-loader/" : "/",
    resolve: {
        alias: {
            "@innovgame/fast-3mf-loader": path.resolve(projectRoot, "packages/fast-3mf-loader/lib/main.ts"),
        },
    },
    server: {
        fs: {
            allow: [projectRoot],
        },
    },
});
