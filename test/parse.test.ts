import { describe, expect, test } from "vitest";
import { parse } from "../lib/parse";

describe("parse", () => {
    test("rejects when the SAX parser emits an error event", async () => {
        const handlers: Record<string, Function> = {};
        const easysaxParser = {
            on(event: string, handler: Function) {
                handlers[event] = handler;
            },
        } as any;

        await expect(
            parse(easysaxParser, async () => {
                handlers.error?.("mock sax failure");
            }),
        ).rejects.toThrow("mock sax failure");
    });
});
