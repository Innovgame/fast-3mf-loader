# Contributing

Thanks for improving fast-3mf-loader. It is a browser-first TypeScript library that parses 3MF archives and can build a Three.js group.

Repository: <https://github.com/Innovgame/fast-3mf-loader>

## Setup

- Node.js 22
- npm

```bash
npm install
npm run dev
```

`npm run dev` starts the local test page.

## Checks before a pull request

```bash
npm run verify
```

`npm run verify` typechecks the demo and the tests, runs the test suite, and builds the package.

Maintainers run `npm run release:check` before publishing. That command also runs the release benchmark and a pack dry run. It is not the default pull request check.

## Public contract

Read [docs/support-matrix.md](docs/support-matrix.md) before changing supported behavior. Unsupported features, including print tickets, stay unsupported until the implementation, tests, and docs land together.

`Fast3MFLoader#parse()` accepts an `ArrayBuffer`. Do not describe that method as a chunked public API.

## Commits

Use a short English conventional commit, such as `fix:`, `feat:`, `docs:`, or `ci:`. Say what a user can observe.

## Releases

Releases are cut from `master`. npm publish runs when a GitHub Release is published. The release tag must be `v` plus the version in `package.json`, for example `v0.0.8`.

1. Move the `Unreleased` notes in [CHANGELOG.md](CHANGELOG.md) under the new version heading.
2. Update the version in `package.json` to the same version.
3. Commit those changes.
4. Wait until CI passes for that commit.
5. Publish a GitHub Release with the matching `v*` tag.

## Reporting issues

- Defects: [bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- A 3MF file that will not parse or build: [compatibility](.github/ISSUE_TEMPLATE/compatibility.md)
- New capability: [feature request](.github/ISSUE_TEMPLATE/feature_request.md)
- Vulnerabilities: [SECURITY.md](SECURITY.md). Do not open a public issue.
