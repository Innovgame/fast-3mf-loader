import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "vitest";

async function readText(path: string) {
    return readFile(resolve(process.cwd(), path), "utf8");
}

test("community files point contributors at the public repository contract", async () => {
    const contributing = await readText("CONTRIBUTING.md");
    const security = await readText("SECURITY.md");
    const conduct = await readText("CODE_OF_CONDUCT.md");
    const changelog = await readText("CHANGELOG.md");

    expect(contributing).toContain("https://github.com/Innovgame/fast-3mf-loader");
    expect(contributing).toContain("pnpm verify");
    expect(contributing).toContain("SECURITY.md");
    expect(security).toContain("https://github.com/Innovgame/fast-3mf-loader/security/advisories/new");
    expect(conduct).toContain("Contributor Covenant");
    expect(conduct).toContain("https://github.com/Innovgame/fast-3mf-loader/issues");
    expect(changelog).toContain("## Unreleased");
    expect(changelog).toContain("## 0.0.7");
});

test("issue and pull request templates describe this loader", async () => {
    const bug = await readText(".github/ISSUE_TEMPLATE/bug_report.md");
    const feature = await readText(".github/ISSUE_TEMPLATE/feature_request.md");
    const compatibility = await readText(".github/ISSUE_TEMPLATE/compatibility.md");
    const config = await readText(".github/ISSUE_TEMPLATE/config.yml");
    const pullRequest = await readText(".github/pull_request_template.md");

    expect(bug).not.toContain("jSquash");
    expect(bug).toContain("fast-3mf-loader");
    expect(feature).toContain("fast-3mf-loader");
    expect(compatibility).toContain(".3mf");
    expect(config).toContain("https://github.com/Innovgame/fast-3mf-loader/security/advisories/new");
    expect(pullRequest).toContain("pnpm verify");
});

test("READMEs link the community files without changing the public parsing claim", async () => {
    const readme = await readText("README.md");
    const readmeZh = await readText("README-zh.md");

    expect(readme).toContain("Uses SAX-style XML parsing internally to keep memory usage lower");
    expect(readme).toContain("https://npm.pkg.github.com");
    expect(readme).toContain("@innovgame/fast-3mf-loader");
    expect(readme).toContain("[CONTRIBUTING.md](CONTRIBUTING.md)");
    expect(readme).toContain("[CHANGELOG.md](CHANGELOG.md)");
    expect(readme).toContain("actions/workflows/ci.yml");
    expect(readmeZh).toContain("内部采用 SAX 风格流式解析");
    expect(readmeZh).toContain("https://npm.pkg.github.com");
    expect(readmeZh).toContain("@innovgame/fast-3mf-loader");
    expect(readmeZh).toContain("[CONTRIBUTING.md](CONTRIBUTING.md)");
    expect(readmeZh).toContain("https://img.shields.io/npm/v/fast-3mf-loader");
});

test("repository hygiene matches a published package", async () => {
    const attributes = await readText(".gitattributes");
    const editorconfig = await readText(".editorconfig");
    const dependabot = await readText(".github/dependabot.yml");
    const docsIndex = await readText("docs/README.md");
    const examples = await readText("examples/README.md");
    const packageJson = JSON.parse(await readText("packages/fast-3mf-loader/package.json"));
    const ci = await readText(".github/workflows/ci.yml");
    const publish = await readText(".github/workflows/publish.yml");
    const publishScript = await readText("scripts/publish-npm-package.sh");
    const deploy = await readText(".github/workflows/deploy.yml");

    expect(attributes).toContain("*.3mf binary");
    expect(editorconfig).toContain("root = true");
    expect(dependabot).toContain("package-ecosystem: npm");
    expect(dependabot).toContain("package-ecosystem: github-actions");
    expect(docsIndex).toContain("support-matrix.md");
    expect(docsIndex).toContain("docs/superpowers/");
    expect(examples).toContain("3mf/");
    expect(packageJson.description.length).toBeGreaterThan("fast 3mf loader".length);
    expect(packageJson.publishConfig.access).toBe("public");
    expect(ci).toContain("cancel-in-progress: true");
    expect(ci).toContain("run: pnpm verify");
    expect(publish).toContain('tag" != "v$version"');
    expect(publish).toContain("run: pnpm release:check");
    expect(publishScript).toContain("npm publish --provenance");
    expect(publishScript).toContain("npm.pkg.github.com");
    expect(deploy).toContain('GITHUB_PAGES: "true"');
    expect(deploy).toContain("apps/demo/dist");
    expect(deploy).toContain("actions/deploy-pages@v5");
});
