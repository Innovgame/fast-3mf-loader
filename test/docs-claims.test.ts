import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "vitest";

async function readDoc(path: string) {
    return readFile(resolve(process.cwd(), path), "utf8");
}

test("README describes streaming as an internal parsing strategy, not a chunked public API", async () => {
    const readme = await readDoc("README.md");

    expect(readme).toContain("Uses SAX-style XML parsing internally to keep memory usage lower");
    expect(readme).not.toContain("Supports chunked loading and parsing of large files");
});

test("README-zh uses the same support-boundary framing", async () => {
    const readmeZh = await readDoc("README-zh.md");

    expect(readmeZh).toContain("内部采用 SAX 风格流式解析");
    expect(readmeZh).not.toContain("支持分块加载和解析大文件");
});

test("fixture license notes identify truck.3mf without inventing a license", async () => {
    const notes = await readDoc("3mf/README.md");

    expect(notes).toContain("### truck.3mf");
    expect(notes).toContain("examples/models/3mf/truck.3mf");
    expect(notes).toContain("does not list a separate license");
});

test("browser support page records only verified combinations", async () => {
    const support = await readDoc("docs/browser-support.en.md");

    expect(support).toContain("Playwright Chromium");
    expect(support).toContain("three@0.186.1");
    expect(support).toContain("Firefox, Safari");
});

test("summary roadmap stays on the stable 1.0 framing", async () => {
    const roadmap = await readDoc("docs/superpowers/roadmap/current-roadmap.md");

    expect(roadmap).toContain("Stable 1.0 Release");
    expect(roadmap).toContain("Phase 4: Release Readiness");
});
