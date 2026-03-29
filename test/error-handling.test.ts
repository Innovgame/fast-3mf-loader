import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { ArchiveManifest } from "../lib/archive-manifest";
import { readFixture } from "./helpers/read-fixture";

function createMinimalArchive() {
    const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;
    const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
    <resources>
        <object id="1" type="model">
            <mesh>
                <vertices>
                    <vertex x="0" y="0" z="0" />
                    <vertex x="1" y="0" z="0" />
                    <vertex x="0" y="1" z="0" />
                </vertices>
                <triangles>
                    <triangle v1="0" v2="1" v3="2" />
                </triangles>
            </mesh>
        </object>
    </resources>
    <build>
        <item objectid="1" />
    </build>
</model>`;

        return createArchive({ rels, model });
}

function createArchive(options: {
    rels?: string;
    model?: string;
    modelRels?: string;
    textures?: Record<string, string>;
} = {}) {
    const archive: Record<string, Uint8Array> = {
        "_rels/.rels": strToU8(options.rels ?? ""),
        "3D/3dmodel.model": strToU8(options.model ?? ""),
    };

    if (options.modelRels) {
        archive["3D/_rels/3dmodel.model.rels"] = strToU8(options.modelRels);
    }

    for (const [path, content] of Object.entries(options.textures ?? {})) {
        archive[path] = strToU8(content);
    }

    const zipped = zipSync(archive);

    return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
}

async function loadFast3MFLoader(
    options: {
        unzipWorkerConstructorError?: string;
        parseWorkerMessage?: { type: "error"; message: string };
        parseWorkerErrorEvent?: string;
        manifestMissing?: boolean;
        manifestOverride?: Partial<ArchiveManifest>;
    } = {},
) {
    vi.resetModules();
    const { unzipBuffer } = await import("../lib/unzip");

    if (options.manifestMissing || options.manifestOverride) {
        vi.doMock("../lib/archive-manifest", async () => {
            const actual = await vi.importActual<typeof import("../lib/archive-manifest")>("../lib/archive-manifest");

            return {
                ...actual,
                collectArchiveManifest: (zip: Parameters<typeof actual.collectArchiveManifest>[0]) => {
                    if (options.manifestMissing) {
                        return undefined;
                    }

                    const manifest = actual.collectArchiveManifest(zip);
                    return {
                        ...manifest,
                        ...options.manifestOverride,
                        modelPartNames: options.manifestOverride?.modelPartNames ?? manifest.modelPartNames,
                        texturesPartNames: options.manifestOverride?.texturesPartNames ?? manifest.texturesPartNames,
                        printTicketPartNames: options.manifestOverride?.printTicketPartNames ?? manifest.printTicketPartNames,
                    };
                },
            };
        });
    }

    vi.doMock("../lib/unzip.worker?worker&inline", () => {
        if (options.unzipWorkerConstructorError) {
            return {
                default: class MockUnzipWorker {
                    constructor() {
                        throw new Error(options.unzipWorkerConstructorError);
                    }
                },
            };
        }

        return {
            default: class MockUnzipWorker {
                public onmessage: ((event: MessageEvent<ReturnType<typeof unzipBuffer>>) => void) | null = null;
                public onerror: ((event: ErrorEvent) => void) | null = null;

                postMessage(buffer: ArrayBuffer) {
                    try {
                        const zip = unzipBuffer(buffer);
                        queueMicrotask(() => {
                            this.onmessage?.({ data: zip } as MessageEvent<ReturnType<typeof unzipBuffer>>);
                        });
                    } catch (error) {
                        queueMicrotask(() => {
                            this.onerror?.(error as ErrorEvent);
                        });
                    }
                }

                terminate() {}
            },
        };
    });

    if (options.parseWorkerMessage) {
        vi.doMock("../lib/parse-model.worker?worker&inline", () => {
            return {
                default: class MockParseModelWorker {
                    private messageHandlers: Array<(event: MessageEvent<{ type: "error"; message: string }>) => void> = [];

                    addEventListener(type: string, handler: (event: MessageEvent<{ type: "error"; message: string }>) => void) {
                        if (type === "message") this.messageHandlers.push(handler);
                    }

                    postMessage() {
                        queueMicrotask(() => {
                            for (const handler of this.messageHandlers) {
                                handler({ data: options.parseWorkerMessage! } as MessageEvent<{ type: "error"; message: string }>);
                            }
                        });
                    }

                    terminate() {}
                },
            };
        });
    } else if (options.parseWorkerErrorEvent !== undefined) {
        vi.doMock("../lib/parse-model.worker?worker&inline", () => {
            return {
                default: class MockParseModelWorker {
                    private errorHandlers: Array<(event: ErrorEvent) => void> = [];

                    addEventListener(type: string, handler: (event: ErrorEvent) => void) {
                        if (type === "error") this.errorHandlers.push(handler);
                    }

                    postMessage() {
                        queueMicrotask(() => {
                            for (const handler of this.errorHandlers) {
                                handler({ message: options.parseWorkerErrorEvent! } as ErrorEvent);
                            }
                        });
                    }

                    terminate() {}
                },
            };
        });
    } else {
        const { parseModelBuffer } = await import("../lib/parse-model");
        vi.doMock("../lib/parse-model.worker?worker&inline", () => {
            return {
                default: class MockParseModelWorker {
                    private messageHandlers: Array<(event: MessageEvent<{ type: "done"; state: Awaited<ReturnType<typeof parseModelBuffer>>["state"] } | { type: "error"; message: string }>) => void> = [];

                    addEventListener(
                        type: string,
                        handler: (event: MessageEvent<{ type: "done"; state: Awaited<ReturnType<typeof parseModelBuffer>>["state"] } | { type: "error"; message: string }>) => void
                    ) {
                        if (type === "message") this.messageHandlers.push(handler);
                    }

                    postMessage(data: Uint8Array<ArrayBuffer>) {
                        void parseModelBuffer(data)
                            .then(({ state }) => {
                                queueMicrotask(() => {
                                    for (const handler of this.messageHandlers) {
                                        handler({ data: { type: "done", state } } as MessageEvent<{ type: "done"; state: Awaited<ReturnType<typeof parseModelBuffer>>["state"] }>);
                                    }
                                });
                            })
                            .catch((error) => {
                                queueMicrotask(() => {
                                    for (const handler of this.messageHandlers) {
                                        handler({
                                            data: {
                                                type: "error",
                                                message: error instanceof Error ? error.message : String(error),
                                            },
                                        } as MessageEvent<{ type: "error"; message: string }>);
                                    }
                                });
                            });
                    }

                    terminate() {}
                },
            };
        });
    }

    const { Fast3MFLoader } = await import("../lib/main");
    return Fast3MFLoader;
}

afterEach(() => {
    vi.doUnmock("../lib/unzip.worker?worker&inline");
    vi.doUnmock("../lib/parse-model.worker?worker&inline");
    vi.doUnmock("../lib/archive-manifest");
});

describe("Fast3MFLoader.parse error handling", () => {
    test("rejects worker runtime initialization failures with a loader-facing message", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            unzipWorkerConstructorError: "Worker is not defined",
        });
        const loader = new Fast3MFLoader();

        await expect(loader.parse(new ArrayBuffer(8))).rejects.toThrow(
            "Fast3MFLoader: Worker runtime is unavailable. This library requires browser support for Worker and Blob.",
        );
    });

    test("rejects non-ArrayBuffer input with a loader-facing message", async () => {
        const Fast3MFLoader = await loadFast3MFLoader();
        const loader = new Fast3MFLoader();

        await expect(loader.parse(new Uint8Array([1, 2, 3]) as unknown as ArrayBuffer)).rejects.toThrow(
            "Fast3MFLoader: `data` must be an ArrayBuffer.",
        );
    });

    test("rejects invalid archive input", async () => {
        const Fast3MFLoader = await loadFast3MFLoader();
        const loader = new Fast3MFLoader();

        await expect(loader.parse(new ArrayBuffer(8))).rejects.toThrow("Fast3MFLoader:");
    });

    test("rejects missing archive manifest with a loader-facing message", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            manifestMissing: true,
        });
        const loader = new Fast3MFLoader();

        await expect(loader.parse(await readFixture("cube_gears.3mf"))).rejects.toThrow(
            "Fast3MFLoader: Failed to inspect 3MF archive contents.",
        );
    });

    test("rejects missing root model file classification with a loader-facing message", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            manifestOverride: { rootModelFile: undefined },
        });
        const loader = new Fast3MFLoader();

        await expect(loader.parse(await readFixture("cube_gears.3mf"))).rejects.toThrow(
            "Fast3MFLoader: Cannot find root model file in 3MF archive.",
        );
    });

    test("rejects missing relationship file classification with a loader-facing message", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            manifestOverride: { relsName: undefined },
        });
        const loader = new Fast3MFLoader();

        await expect(loader.parse(await readFixture("cube_gears.3mf"))).rejects.toThrow(
            "Fast3MFLoader: Cannot find relationship file `rels` in 3MF archive.",
        );
    });

    test("rejects missing relationship file payload with a loader-facing message", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            manifestOverride: { relsName: "_rels/missing.rels" },
        });
        const loader = new Fast3MFLoader();

        await expect(loader.parse(await readFixture("cube_gears.3mf"))).rejects.toThrow(
            "Fast3MFLoader: Failed to read relationship file `_rels/missing.rels` from 3MF archive.",
        );
    });

    test("rejects missing model part payload with a loader-facing message", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            manifestOverride: { modelPartNames: ["3D/missing-sub.model"] },
        });
        const loader = new Fast3MFLoader();

        await expect(loader.parse(createMinimalArchive())).rejects.toThrow(
            "Fast3MFLoader: Failed to read model part `3D/missing-sub.model` from 3MF archive.",
        );
    });

    test("rejects missing texture payload with a loader-facing message", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            manifestOverride: { texturesPartNames: ["3D/Textures/missing.png"] },
        });
        const loader = new Fast3MFLoader();

        await expect(loader.parse(await readFixture("multipletextures.3mf"))).rejects.toThrow(
            "Fast3MFLoader: Failed to read texture part `3D/Textures/missing.png` from 3MF archive.",
        );
    });

    test("rejects malformed relationship entries with a loader-facing message", async () => {
        const Fast3MFLoader = await loadFast3MFLoader();
        const loader = new Fast3MFLoader();

        await expect(
            loader.parse(
                createArchive({
                    rels: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`,
                    model: `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
    <resources />
    <build />
</model>`,
                }),
            ),
        ).rejects.toThrow("Fast3MFLoader: Invalid relationship entry in relationship file `_rels/.rels`: missing Target.");
    });

    test("rejects malformed model relationship entries with a loader-facing message", async () => {
        const Fast3MFLoader = await loadFast3MFLoader();
        const loader = new Fast3MFLoader();

        await expect(
            loader.parse(
                createArchive({
                    rels: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`,
                    model: `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
    <resources />
    <build />
</model>`,
                    modelRels: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Target="/3D/Textures/atlas.png" Type="texture" />
</Relationships>`,
                }),
            ),
        ).rejects.toThrow(
            "Fast3MFLoader: Invalid relationship entry in model relationship file `3D/_rels/3dmodel.model.rels`: missing Id.",
        );
    });

    test("rejects parse worker failures", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            parseWorkerMessage: { type: "error", message: "mock parse failure" },
        });
        const loader = new Fast3MFLoader();

        await expect(loader.parse(await readFixture("cube_gears.3mf"))).rejects.toThrow("mock parse failure");
    });

    test("rejects parse worker failures with a model-part-specific fallback when the worker message is empty", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            parseWorkerMessage: { type: "error", message: "" },
        });
        const loader = new Fast3MFLoader();

        await expect(loader.parse(createMinimalArchive())).rejects.toThrow(
            "Fast3MFLoader: Failed to parse model part `3D/3dmodel.model`.",
        );
    });

    test("rejects worker error events instead of hanging", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            parseWorkerErrorEvent: "mock worker crash",
        });
        const loader = new Fast3MFLoader();

        await expect(
            Promise.race([
                loader.parse(await readFixture("cube_gears.3mf")),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("timed out")), 100);
                }),
            ])
        ).rejects.toThrow("mock worker crash");
    });

    test("rejects worker error events with a model-part-specific fallback when the error message is empty", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            parseWorkerErrorEvent: "",
        });
        const loader = new Fast3MFLoader();

        await expect(
            Promise.race([
                loader.parse(createMinimalArchive()),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("timed out")), 100);
                }),
            ])
        ).rejects.toThrow("Fast3MFLoader: Failed to parse model part `3D/3dmodel.model`.");
    });
});
