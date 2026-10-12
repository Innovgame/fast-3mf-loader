# Browser and Three.js support

This page records only combinations this repository has verified. A browser or version that is not listed here is not a supported claim.

## Runtime requirements

- The browser must provide `Worker` and `Blob`. If a worker cannot start, `parse()` throws an error that names those requirements.
- `three` is a peer dependency at `>=0.170.0`.
- Development and CI in this repository use `three@0.186.1`. TypeScript consumers also install `@types/three`.

## Verified

- The Pages CI job opens the production path `/fast-3mf-loader/` in Playwright Chromium on Ubuntu 24.04.
- That job parses and builds `facecolors.3mf`, `vertexcolors.3mf`, `multipletextures.3mf`, and `truck.3mf` through browser workers.
- `pnpm consumer:check:browser` installs the packed `fast-3mf-loader` package into a fresh Vite project and parses `facecolors.3mf` in Playwright Chromium. That check uses the published package, not the workspace source alias.

## Not recorded as supported

- Firefox, Safari, and specific phone browsers do not have a recorded check here.
- The project site has narrow-viewport layout checks. Those checks cover layout, not those phone browsers.
- Node.js is used to install, test, and build. It is not a supported runtime for the library.
