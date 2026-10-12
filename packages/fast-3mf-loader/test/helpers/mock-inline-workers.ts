import { vi } from "vitest";

vi.mock("../../src/unzip.worker?worker&inline", async () => {
    const { unzipBuffer } = await import("../../src/unzip");

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

vi.mock("../../src/parse-model.worker?worker&inline", async () => {
    const { parseModelBuffer } = await import("../../src/parse-model");

    return {
        default: class MockParseModelWorker {
            private messageHandlers: Array<(event: MessageEvent<{ type: "done"; state: Awaited<ReturnType<typeof parseModelBuffer>>["state"] }>) => void> = [];

            addEventListener(type: string, handler: (event: MessageEvent<{ type: "done"; state: Awaited<ReturnType<typeof parseModelBuffer>>["state"] }>) => void) {
                if (type === "message") this.messageHandlers.push(handler);
            }

            postMessage(data: Uint8Array<ArrayBuffer>) {
                void parseModelBuffer(data).then(({ state }) => {
                    queueMicrotask(() => {
                        for (const handler of this.messageHandlers) {
                            handler({ data: { type: "done", state } } as MessageEvent<{ type: "done"; state: Awaited<ReturnType<typeof parseModelBuffer>>["state"] }>);
                        }
                    });
                });
            }

            terminate() {}
        },
    };
});
