import { defineConfig } from "vite";
// 或其他你需要的插件

export default defineConfig({
    build: {
        outDir: "./github-page", // 不同的输出目录
        emptyOutDir: true,
    },
});
