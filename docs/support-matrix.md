# 3MF Support Matrix

This matrix describes the features that `fast-3mf-loader` currently supports in practice, based on the fixture-backed coverage in `test/`.

If a capability is not listed here with evidence, it should be treated as unsupported until explicit implementation, tests, and docs land together.

| Feature | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Archive unzip | Supported | `test/loader.parse.test.ts` with `cube_gears.3mf` | 3MF archives are unzipped before model parsing |
| Root relationships (`_rels/.rels`) | Supported | `test/loader.parse.test.ts` with `cube_gears.3mf` | Required to locate the root `.model` file |
| Multi-object / component models | Supported | `test/loader.parse.test.ts` with `truck.3mf` | Component references are parsed and built |
| Base mesh geometry | Supported | `test/builder.test.ts` with `facecolors.3mf` | Produces a `THREE.Group` with meshes |
| Vertex color groups | Supported | `test/builder.test.ts` with `vertexcolors.3mf` | Meshes expose a `color` attribute |
| Texture resources and texture groups | Supported | `test/builder.test.ts` with `multipletextures.3mf` | Textured materials are built from 3MF texture groups |
| Additional model relationships (`.model.rels`) | Supported | `test/loader.parse.test.ts` with `multipletextures.3mf` | Used to resolve texture targets |
| Print tickets | Not yet supported | `test/support-matrix.test.ts` | Parser returns an empty `printTicket` object and emits a warning |
| Extension resources beyond current fixture coverage | Not yet supported | N/A | `pbmetallicdisplayproperties` and other extensions are not parsed end-to-end today |

## Notes

- Runtime behavior currently targets browsers. The Node-based tests use inline worker mocks so the parser can be regression-tested without a browser worker runtime.
- Unsupported features should be considered data-loss risks until explicit support is added and covered by fixtures.
