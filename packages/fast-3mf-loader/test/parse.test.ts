import { describe, expect, test } from "vitest";
import { parse } from "../src/parse";

type SaxHandler = (message?: string) => void;

describe("parse", () => {
    test("rejects when the SAX parser emits an error event", async () => {
        const handlers: Record<string, SaxHandler> = {};
        const easysaxParser = {
            on(event: string, handler: SaxHandler) {
                handlers[event] = handler;
            },
        } as any;

        await expect(
            parse(easysaxParser, async () => {
                handlers.error?.("mock sax failure");
            }),
        ).rejects.toThrow("mock sax failure");
    });

    test("rejects immediately when the SAX parser emits an error before start settles", async () => {
        const handlers: Record<string, SaxHandler> = {};
        const easysaxParser = {
            on(event: string, handler: SaxHandler) {
                handlers[event] = handler;
            },
        } as any;

        await expect(
            Promise.race([
                parse(easysaxParser, async () => {
                    queueMicrotask(() => {
                        handlers.error?.("mock sax crash");
                    });

                    await new Promise(() => {});
                }),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("timed out")), 100);
                }),
            ]),
        ).rejects.toThrow("mock sax crash");
    });
});
