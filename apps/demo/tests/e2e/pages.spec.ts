import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../3mf");

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        if (!localStorage.getItem("fast3mf-language")) localStorage.setItem("fast3mf-language", "en");
        if (!localStorage.getItem("fast3mf-theme")) localStorage.setItem("fast3mf-theme", "light");
    });
});

test("layout, themes, language and keyboard controls stay usable across viewport widths", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const width of [1440, 1024, 768, 375]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect(page.locator(".workbench")).toHaveCSS("display", "grid");
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
        await page.screenshot({ path: `test-results/layout-${width}-light.png`, fullPage: true });
    }
    await page.getByRole("button", { name: "Switch color theme", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.screenshot({ path: "test-results/mobile-dark.png", fullPage: true });
    await page.getByRole("button", { name: "Switch language", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("3MF");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "test-results/desktop-zh-dark.png", fullPage: true });
    await page.locator(".install-card [role=tab]").filter({ hasText: "npm" }).first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "pnpm", exact: true })).toBeFocused();
    await expect(page.locator(".install-card pre")).toContainText("pnpm add");
    await page.getByRole("button", { name: "文件会上传吗？", exact: true }).click();
    await expect(page.getByRole("region", { name: "文件会上传吗？", exact: true })).toContainText("不会");
    await expect(page.locator(".file-error")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    expect(errors).toEqual([]);
});

test("real files render, replace, compare and clear through browser workers", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    for (const fixture of ["facecolors.3mf", "vertexcolors.3mf", "multipletextures.3mf", "truck.3mf"]) {
        if (fixture === "facecolors.3mf") {
            const chooserPromise = page.waitForEvent("filechooser");
            await page.getByRole("button", { name: "Open a 3MF file", exact: true }).click();
            await (await chooserPromise).setFiles(path.join(fixtureRoot, fixture));
        } else {
            await page.locator("#model-file").setInputFiles(path.join(fixtureRoot, fixture));
        }
        await expect(page.locator(".workbench-status")).toContainText("Model parsed and built");
        await expect(page.getByRole("button", { name: "Reset view", exact: true })).toBeEnabled();
        await expect(page.locator(".viewport-surface canvas")).toBeVisible();
        await expect(page.locator(".file-summary strong")).toHaveText(fixture);
        expect(Number((await page.locator(".model-statistics dd").first().innerText()).replaceAll(",", ""))).toBeGreaterThan(0);
        await page.locator(".workbench").screenshot({ path: `test-results/model-${fixture}.png` });
    }
    await page.getByRole("tab", { name: "Model parts", exact: true }).click();
    await expect(page.locator(".parts-list li").first()).toBeVisible();
    await page.getByRole("tab", { name: "Scene", exact: true }).click();
    await page.getByRole("button", { name: "Wireframe", exact: true }).click();
    await expect(page.getByRole("button", { name: "Wireframe", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.locator("#model-file").setInputFiles(path.join(fixtureRoot, "vertexcolors.3mf"));
    await expect(page.locator(".workbench-status")).toContainText("Model parsed and built");
    await page.getByRole("button", { name: "Run three.js comparison", exact: true }).click();
    await expect(page.locator(".comparison-chart")).toBeVisible();
    await expect(page.locator(".viewport-surface canvas")).toBeVisible();
    await page.getByRole("button", { name: "Clear file", exact: true }).click();
    await expect(page.locator(".file-summary strong")).toHaveText("No file selected");
    await expect(page.locator(".viewport-surface canvas")).toHaveCount(0);
    await expect(page.locator(".total-time > span")).toHaveText("—");
    expect(errors).toEqual([]);
});

test("invalid archives show a recoverable error and a later valid file renders", async ({ page }) => {
    await page.goto("./");
    await page.locator("#model-file").setInputFiles({ name: "broken.3mf", mimeType: "application/octet-stream", buffer: Buffer.from("invalid zip") });
    await expect(page.locator(".file-error")).toContainText("Could not open this file");
    await expect(page.locator(".file-error a")).toHaveAttribute("href", /template=compatibility.md/);
    await expect(page.getByRole("button", { name: "Run three.js comparison", exact: true })).toBeDisabled();
    await page.locator("#model-file").setInputFiles(path.join(fixtureRoot, "facecolors.3mf"));
    await expect(page.locator(".workbench-status")).toContainText("Model parsed and built");
    await expect(page.getByRole("button", { name: "Reset view", exact: true })).toBeEnabled();
    await expect(page.locator(".file-error")).toHaveCount(0);
});

test("a comparison failure preserves the fast-loader preview and metrics", async ({ page }) => {
    await page.goto("./");
    await page.locator("#model-file").setInputFiles(path.join(fixtureRoot, "vertexcolors.3mf"));
    await expect(page.getByRole("button", { name: "Reset view", exact: true })).toBeEnabled();
    const measured = await page.locator(".total-time > span").innerText();
    await page.route(/3MFLoader/, (route) => route.abort());
    await page.getByRole("button", { name: "Run three.js comparison", exact: true }).click();
    await expect(page.locator(".comparison-error")).toContainText("Your fast-loader result is preserved");
    await expect(page.locator(".total-time > span")).toHaveText(measured);
    await expect(page.locator(".viewport-surface canvas")).toBeVisible();
});

test("a textured file remains usable on a small phone with reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await page.locator("#worker-count").selectOption("2");
    await page.locator("#model-file").setInputFiles(path.join(fixtureRoot, "multipletextures.3mf"));
    await expect(page.getByRole("button", { name: "Reset view", exact: true })).toBeEnabled();
    await expect(page.locator(".model-statistics dd").last()).toHaveText("2");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.locator(".preview-panel").screenshot({ path: "test-results/mobile-textures.png" });
    await page.getByRole("button", { name: "Wireframe", exact: true }).click();
    await expect(page.getByRole("button", { name: "Wireframe", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("copy controls preserve executable commands and real line breaks", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("./");
    await page.locator(".benchmark-card").getByRole("button", { name: "Copy code", exact: true }).click();
    expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll("\r\n", "\n")).toBe("pnpm build\npnpm benchmark:release");
});

test.describe("WebGL fallback", () => {
    test("shows successful parsing metrics even if the browser cannot create a preview", async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { value: () => null });
        });
        await page.goto("./");
        await page.locator("#model-file").setInputFiles(path.join(fixtureRoot, "facecolors.3mf"));
        await expect(page.locator(".workbench-status")).toContainText("Model parsed and built");
        await expect(page.locator(".viewport-empty")).toContainText("3D preview is unavailable");
        await expect(page.locator(".total-time > span")).not.toHaveText("—");
        await expect(page.getByRole("button", { name: "Reset view", exact: true })).toBeDisabled();
    });
});
