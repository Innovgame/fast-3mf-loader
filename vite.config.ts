import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [dts({ rollupTypes: true, outDir: "./dist" })],
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
