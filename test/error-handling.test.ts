import { afterEach, describe, expect, test, vi } from "vitest";
import { readFixture } from "./helpers/read-fixture";

async function loadFast3MFLoader(
    options: {
        unzipWorkerConstructorError?: string;
        parseWorkerMessage?: { type: "error"; message: string };
        parseWorkerErrorEvent?: string;
        manifestMissing?: boolean;
    } = {},
) {
    vi.resetModules();
    const { unzipBuffer } = await import("../lib/unzip");

    if (options.manifestMissing) {
        vi.doMock("../lib/archive-manifest", async () => {
            const actual = await vi.importActual<typeof import("../lib/archive-manifest")>("../lib/archive-manifest");

            return {
                ...actual,
                collectArchiveManifest: () => undefined,
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
    } else if (options.parseWorkerErrorEvent) {
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

    test("rejects parse worker failures", async () => {
        const Fast3MFLoader = await loadFast3MFLoader({
            parseWorkerMessage: { type: "error", message: "mock parse failure" },
        });
        const loader = new Fast3MFLoader();

        await expect(loader.parse(await readFixture("cube_gears.3mf"))).rejects.toThrow("mock parse failure");
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
});
