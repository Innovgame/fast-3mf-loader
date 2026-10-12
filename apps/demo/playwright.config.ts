import { defineConfig } from "@playwright/test";

const production = process.env.DEMO_PRODUCTION === "true";
const baseURL = process.env.DEMO_BASE_URL ?? (production ? "http://127.0.0.1:4178/fast-3mf-loader/" : "http://127.0.0.1:5178/");

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 90000,
    expect: { timeout: 15000 },
    workers: 1,
    reporter: "list",
    use: {
        baseURL,
        viewport: { width: 1440, height: 1000 },
        locale: "en-US",
        colorScheme: "light",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
        ...(process.env.DEMO_BROWSER_CHANNEL ? { channel: process.env.DEMO_BROWSER_CHANNEL } : {}),
    },
    webServer: process.env.DEMO_BASE_URL
        ? undefined
        : {
              command: production ? "pnpm preview --host 127.0.0.1 --port 4178 --strictPort" : "pnpm dev --host 127.0.0.1 --port 5178 --strictPort",
              env: production ? { GITHUB_PAGES: "true" } : {},
              url: baseURL,
              reuseExistingServer: !process.env.CI,
              timeout: 60000,
          },
});
