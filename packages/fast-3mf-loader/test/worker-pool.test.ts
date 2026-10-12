import { describe, expect, test } from "vitest";
import { WorkerPool } from "../lib/WorkerPool";

type MessageHandler = (event: MessageEvent<string>) => void;

class MockWorker {
    private messageHandlers: MessageHandler[] = [];

    addEventListener(type: string, handler: MessageHandler) {
        if (type === "message") {
            this.messageHandlers.push(handler);
        }
    }

    postMessage(message: string) {
        if (message === "boom") {
            throw new Error("mock sync postMessage failure");
        }

        queueMicrotask(() => {
            for (const handler of this.messageHandlers) {
                handler({ data: `${message}:done` } as MessageEvent<string>);
            }
        });
    }

    terminate() {}
}

describe("WorkerPool", () => {
    test("rejects queued tasks that fail synchronously and continues dispatching the remaining queue", async () => {
        const pool = new WorkerPool(1);
        pool.setWorkerCreator(() => new MockWorker() as unknown as Worker);

        const firstTask = pool.postMessage<MessageEvent<string>>("first");
        const failedTask = pool.postMessage<MessageEvent<string>>("boom");
        const thirdTask = pool.postMessage<MessageEvent<string>>("third");

        const results = await Promise.race([
            Promise.allSettled([firstTask, failedTask, thirdTask]),
            new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("timed out")), 100);
            }),
        ]);

        expect(results).toEqual([
            { status: "fulfilled", value: { data: "first:done" } },
            { status: "rejected", reason: new Error("mock sync postMessage failure") },
            { status: "fulfilled", value: { data: "third:done" } },
        ]);

        pool.dispose();
    });
});