# Contributing

Thanks for improving fast-3mf-loader. It is a browser-first TypeScript library that parses 3MF archives and can build a Three.js group.

Repository: <https://github.com/Innovgame/fast-3mf-loader>

## Setup

- Node.js 22
- pnpm 10

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the React project site and browser playground. The site is also published to GitHub Pages after CI succeeds on `master`.

## Checks before a pull request

```bash
pnpm verify
```

`pnpm verify` lints the workspace, typechecks the library, tests, and demo, runs the unit test suites, and builds the package and site. For UI changes, also run `pnpm --filter @fast-3mf-loader/demo test:e2e` after installing Chromium with `pnpm --filter @fast-3mf-loader/demo exec playwright install chromium`. The CI browser job checks the production `/fast-3mf-loader/` path.

Maintainers run `pnpm release:check` before publishing. That command also runs the release benchmark and a pack dry run. It is not the default pull request check.

## Public contract

Read [docs/support-matrix.md](docs/support-matrix.md) before changing supported behavior. Unsupported features, including print tickets, stay unsupported until the implementation, tests, and docs land together.

`Fast3MFLoader#parse()` accepts an `ArrayBuffer`. Do not describe that method as a chunked public API.

## Commits

Use a short English conventional commit, such as `fix:`, `feat:`, `docs:`, or `ci:`. Say what a user can observe.

## Releases

Releases are cut from `master`. Publishing runs when a GitHub Release is published. The release tag must be `v` plus the version in `packages/fast-3mf-loader/package.json`, for example `v0.0.8`. GitHub Packages receives `@innovgame/fast-3mf-loader`. npm receives `fast-3mf-loader` when `NPM_TOKEN` is set.

1. Move the `Unreleased` notes in [CHANGELOG.md](CHANGELOG.md) under the new version heading.
2. Update the version in `packages/fast-3mf-loader/package.json` to the same version.
3. Commit those changes.
4. Wait until CI passes for that commit.
5. Publish a GitHub Release with the matching `v*` tag.

## Reporting issues

- Defects: [bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- A 3MF file that will not parse or build: [compatibility](.github/ISSUE_TEMPLATE/compatibility.md)
- New capability: [feature request](.github/ISSUE_TEMPLATE/feature_request.md)
- Vulnerabilities: [SECURITY.md](SECURITY.md). Do not open a public issue.
